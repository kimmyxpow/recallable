import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "./_generated/server";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";
import { extractStructureFromHtml } from "./htmlUtils";

type IndexNode = {
  nodeType: "title" | "heading" | "paragraph" | "list" | "codeBlock" | "table";
  level: number;
  text: string;
  path: string;
  parentPath?: string;
  position: number;
};

const NODE_WEIGHTS: Record<IndexNode["nodeType"], number> = {
  title: 20,
  heading: 10,
  paragraph: 4,
  list: 4,
  codeBlock: 2,
  table: 3,
};

function buildDocumentTree(
  htmlContent: string,
  title: string
): IndexNode[] {
  const nodes: IndexNode[] = [];
  let position = 0;

  // Add title node
  nodes.push({
    nodeType: "title",
    level: 0,
    text: title,
    path: title,
    position: position++,
  });

  // Extract structure from HTML
  const structure = extractStructureFromHtml(htmlContent);

  for (const item of structure) {
    nodes.push({
      nodeType: item.nodeType,
      level: item.level,
      text: item.text,
      path: item.path,
      parentPath: item.path.includes(" > ")
        ? item.path.substring(0, item.path.lastIndexOf(" > "))
        : undefined,
      position: position++,
    });
  }

  return nodes;
}

type SearchArgs = {
  query: string;
  limit: number;
  userId: string;
};

type SearchResult = {
  itemId: Id<"items">;
  title: string;
  matchedNodes: Array<{ nodeType: string; text: string; path: string }>;
  score: number;
};

function scoreNode(
  node: IndexNode,
  queryLower: string,
  terms: string[]
): number {
  const weight = NODE_WEIGHTS[node.nodeType] ?? 1;
  let score = 0;

  if (queryLower && node.text.toLowerCase().includes(queryLower)) {
    score += weight * 3;
  }

  for (const term of terms) {
    if (!term) continue;
    const termWeight = term.length > 6 ? 2 : 1;
    if (node.text.toLowerCase().includes(term)) {
      score += weight * 2 * termWeight;
    }
    if (node.path.toLowerCase().includes(term)) {
      score += weight * termWeight;
    }
  }

  return score;
}

async function performSearch(
  ctx: QueryCtx,
  args: SearchArgs
): Promise<SearchResult[]> {
  const queryLower = args.query.trim().toLowerCase();
  if (!queryLower) return [];

  const terms = Array.from(
    new Set(
      queryLower
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1)
    )
  );

  const nodes = await ctx.db
    .query("documentIndex")
    .withIndex("by_userId", (q) => q.eq("userId", args.userId))
    .collect();

  const itemMatches = new Map<
    string,
    {
      itemId: Id<"items">;
      matchedNodes: Array<{ nodeType: string; text: string; path: string }>;
      score: number;
    }
  >();

  for (const node of nodes) {
    const nodeScore = scoreNode(node, queryLower, terms);
    if (nodeScore <= 0) continue;

    const key = node.itemId;
    const existing = itemMatches.get(key);
    const entry = existing ?? {
      itemId: node.itemId,
      matchedNodes: [],
      score: 0,
    };

    if (entry.matchedNodes.length < 6) {
      entry.matchedNodes.push({
        nodeType: node.nodeType,
        text: node.text,
        path: node.path,
      });
    }

    entry.score += nodeScore;
    itemMatches.set(key, entry);
  }

  const sorted = Array.from(itemMatches.values()).sort(
    (a, b) => b.score - a.score
  );

  const topResults = sorted.slice(0, args.limit);

  const enriched = await Promise.all(
    topResults.map(async (entry) => {
      const item = await ctx.db.get(entry.itemId);
      return {
        ...entry,
        title: item?.title ?? "Untitled",
      };
    })
  );

  return enriched;
}

export const rebuildIndex = internalMutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.type !== "note") return null;

    const existing = await ctx.db
      .query("documentIndex")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .collect();

    for (const node of existing) {
      await ctx.db.delete(node._id);
    }

    // Content is now HTML string
    const htmlContent = typeof item.content === "string" ? item.content : "";
    if (!htmlContent) return null;

    const nodes = buildDocumentTree(htmlContent, item.title);
    const now = Date.now();

    for (const node of nodes) {
      await ctx.db.insert("documentIndex", {
        userId: item.userId,
        itemId: args.itemId,
        nodeType: node.nodeType,
        level: node.level,
        text: node.text,
        path: node.path,
        parentPath: node.parentPath,
        position: node.position,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const getDocumentTree = query({
  args: { itemId: v.id("items") },
  returns: v.array(
    v.object({
      _id: v.id("documentIndex"),
      nodeType: v.string(),
      level: v.number(),
      text: v.string(),
      path: v.string(),
      parentPath: v.optional(v.string()),
      position: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    const nodes = await ctx.db
      .query("documentIndex")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .collect();

    return nodes
      .filter((n) => n.userId === user._id)
      .sort((a, b) => a.position - b.position)
      .map((n) => ({
        _id: n._id,
        nodeType: n.nodeType,
        level: n.level,
        text: n.text,
        path: n.path,
        parentPath: n.parentPath,
        position: n.position,
      }));
  },
});

export const searchDocumentIndex = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      itemId: v.id("items"),
      title: v.string(),
      matchedNodes: v.array(
        v.object({
          nodeType: v.string(),
          text: v.string(),
          path: v.string(),
        })
      ),
      score: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 10;

    return await performSearch(ctx, {
      query: args.query,
      limit,
      userId: user._id,
    });
  },
});

export const getAllDocumentTrees = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      itemId: v.id("items"),
      title: v.string(),
      structure: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    const limit = args.limit ?? 20;

    const items = await ctx.db
      .query("items")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", user._id).eq("type", "note")
      )
      .order("desc")
      .take(limit);

    const results: Array<{
      itemId: Id<"items">;
      title: string;
      structure: string;
    }> = [];

    for (const item of items) {
      const nodes = await ctx.db
        .query("documentIndex")
        .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
        .collect();

      const sortedNodes = nodes.sort((a, b) => a.position - b.position);
      const structure = sortedNodes
        .filter((n) => n.nodeType === "title" || n.nodeType === "heading")
        .map((n) => `${"  ".repeat(n.level)}${n.text}`)
        .join("\n");

      results.push({
        itemId: item._id,
        title: item.title,
        structure: structure || item.title,
      });
    }

    return results;
  },
});

export const internalSearchDocumentIndex = internalQuery({
  args: { userId: v.string(), query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      itemId: v.id("items"),
      title: v.string(),
      matchedNodes: v.array(
        v.object({
          nodeType: v.string(),
          text: v.string(),
          path: v.string(),
        })
      ),
      score: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    return await performSearch(ctx, {
      query: args.query,
      limit,
      userId: args.userId,
    });
  },
});

export const internalGetAllDocumentTrees = internalQuery({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      itemId: v.id("items"),
      title: v.string(),
      structure: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const items = await ctx.db
      .query("items")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", args.userId).eq("type", "note")
      )
      .order("desc")
      .take(limit);

    const results: Array<{
      itemId: Id<"items">;
      title: string;
      structure: string;
    }> = [];

    for (const item of items) {
      const nodes = await ctx.db
        .query("documentIndex")
        .withIndex("by_itemId", (q) => q.eq("itemId", item._id))
        .collect();

      const sortedNodes = nodes.sort((a, b) => a.position - b.position);
      const structure = sortedNodes
        .filter((n) => n.nodeType === "title" || n.nodeType === "heading")
        .map((n) => `${"  ".repeat(n.level)}${n.text}`)
        .join("\n");

      results.push({
        itemId: item._id,
        title: item.title,
        structure: structure || item.title,
      });
    }

    return results;
  },
});
