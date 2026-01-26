import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
};

type IndexNode = {
  nodeType: "title" | "heading" | "paragraph" | "list" | "codeBlock";
  level: number;
  text: string;
  path: string;
  parentPath?: string;
  position: number;
};

function extractTextFromNode(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(extractTextFromNode).join("");
}

function buildDocumentTree(
  content: TiptapNode,
  title: string
): IndexNode[] {
  const nodes: IndexNode[] = [];
  let position = 0;
  let currentPath: string[] = [title];
  let currentLevel = 0;

  nodes.push({
    nodeType: "title",
    level: 0,
    text: title,
    path: title,
    position: position++,
  });

  if (!content.content) return nodes;

  for (const node of content.content) {
    const text = extractTextFromNode(node).trim();
    if (!text) continue;

    if (node.type === "heading") {
      const headingLevel = (node.attrs?.level as number) || 1;

      while (currentLevel >= headingLevel && currentPath.length > 1) {
        currentPath.pop();
        currentLevel--;
      }

      currentPath.push(text.slice(0, 100));
      currentLevel = headingLevel;

      nodes.push({
        nodeType: "heading",
        level: headingLevel,
        text: text.slice(0, 500),
        path: currentPath.join(" > "),
        parentPath: currentPath.slice(0, -1).join(" > ") || undefined,
        position: position++,
      });
    } else if (node.type === "paragraph") {
      const summary = text.slice(0, 200);
      nodes.push({
        nodeType: "paragraph",
        level: currentLevel + 1,
        text: summary,
        path: `${currentPath.join(" > ")} > [paragraph]`,
        parentPath: currentPath.join(" > "),
        position: position++,
      });
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items: string[] = [];
      if (node.content) {
        for (const listItem of node.content) {
          const itemText = extractTextFromNode(listItem).trim();
          if (itemText) items.push(itemText.slice(0, 100));
        }
      }
      if (items.length > 0) {
        nodes.push({
          nodeType: "list",
          level: currentLevel + 1,
          text: items.join("; ").slice(0, 500),
          path: `${currentPath.join(" > ")} > [list]`,
          parentPath: currentPath.join(" > "),
          position: position++,
        });
      }
    } else if (node.type === "codeBlock") {
      const lang = (node.attrs?.language as string) || "code";
      nodes.push({
        nodeType: "codeBlock",
        level: currentLevel + 1,
        text: `[${lang}]: ${text.slice(0, 200)}`,
        path: `${currentPath.join(" > ")} > [code]`,
        parentPath: currentPath.join(" > "),
        position: position++,
      });
    }
  }

  return nodes;
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

    if (!item.content) return null;

    const nodes = buildDocumentTree(item.content as TiptapNode, item.title);
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
    const queryLower = args.query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    const allNodes = await ctx.db
      .query("documentIndex")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const itemMatches = new Map<
      string,
      {
        itemId: Id<"items">;
        matchedNodes: Array<{ nodeType: string; text: string; path: string }>;
        score: number;
      }
    >();

    for (const node of allNodes) {
      const textLower = node.text.toLowerCase();
      const pathLower = node.path.toLowerCase();
      
      let matchScore = 0;
      for (const term of queryTerms) {
        if (textLower.includes(term)) {
          matchScore += node.nodeType === "title" ? 10 : node.nodeType === "heading" ? 5 : 1;
        }
        if (pathLower.includes(term)) {
          matchScore += 2;
        }
      }

      if (matchScore > 0) {
        const key = node.itemId;
        const existing = itemMatches.get(key);
        if (existing) {
          existing.matchedNodes.push({
            nodeType: node.nodeType,
            text: node.text,
            path: node.path,
          });
          existing.score += matchScore;
        } else {
          itemMatches.set(key, {
            itemId: node.itemId,
            matchedNodes: [
              { nodeType: node.nodeType, text: node.text, path: node.path },
            ],
            score: matchScore,
          });
        }
      }
    }

    const results = Array.from(itemMatches.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const enriched = await Promise.all(
      results.map(async (r) => {
        const item = await ctx.db.get(r.itemId);
        return {
          ...r,
          title: item?.title ?? "Untitled",
        };
      })
    );

    return enriched;
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
    const queryLower = args.query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    const allNodes = await ctx.db
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

    for (const node of allNodes) {
      const textLower = node.text.toLowerCase();
      const pathLower = node.path.toLowerCase();
      
      let matchScore = 0;
      for (const term of queryTerms) {
        if (textLower.includes(term)) {
          matchScore += node.nodeType === "title" ? 10 : node.nodeType === "heading" ? 5 : 1;
        }
        if (pathLower.includes(term)) {
          matchScore += 2;
        }
      }

      if (matchScore > 0) {
        const key = node.itemId;
        const existing = itemMatches.get(key);
        if (existing) {
          existing.matchedNodes.push({
            nodeType: node.nodeType,
            text: node.text,
            path: node.path,
          });
          existing.score += matchScore;
        } else {
          itemMatches.set(key, {
            itemId: node.itemId,
            matchedNodes: [
              { nodeType: node.nodeType, text: node.text, path: node.path },
            ],
            score: matchScore,
          });
        }
      }
    }

    const results = Array.from(itemMatches.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const enriched = await Promise.all(
      results.map(async (r) => {
        const item = await ctx.db.get(r.itemId);
        return {
          ...r,
          title: item?.title ?? "Untitled",
        };
      })
    );

    return enriched;
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
