import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import {
  extractTitleFromHtml,
  extractStorageIdsFromHtml,
} from "./htmlUtils";

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listByParent = query({
  args: { parentId: v.optional(v.id("items")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("items")
      .withIndex("by_userId_parentId", (q) =>
        q.eq("userId", user._id).eq("parentId", args.parentId)
      )
      .collect();
  },
});

export const listFoldersByParent = query({
  args: { parentId: v.optional(v.id("items")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_userId_parentId", (q) =>
        q.eq("userId", user._id).eq("parentId", args.parentId)
      )
      .collect();

    return items.filter((item) => item.type === "folder");
  },
});

export const listNotesByParent = query({
  args: { parentId: v.optional(v.id("items")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_userId_parentId", (q) =>
        q.eq("userId", user._id).eq("parentId", args.parentId)
      )
      .collect();

    return items.filter((item) => item.type === "note");
  },
});

export const get = query({
  args: { itemId: v.optional(v.id("items")) },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user || !args.itemId) return null;

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) return null;

    return item;
  },
});

export const getBreadcrumbs = query({
  args: { itemId: v.optional(v.id("items")) },
  returns: v.array(
    v.object({
      _id: v.string(),
      title: v.string(),
      type: v.union(v.literal("folder"), v.literal("note")),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user || !args.itemId) {
      return [];
    }

    const breadcrumbs: Array<{
      _id: string;
      title: string;
      type: "folder" | "note";
    }> = [];
    let currentId: Id<"items"> | undefined = args.itemId;

    while (currentId) {
      const item: Doc<"items"> | null = await ctx.db.get(currentId);
      if (!item || item.userId !== user._id) break;

      breadcrumbs.unshift({
        _id: item._id,
        title: item.title,
        type: item.type,
      });
      currentId = item.parentId;
    }

    return breadcrumbs;
  },
});

export const createFolder = mutation({
  args: {
    title: v.string(),
    parentId: v.optional(v.id("items")),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.userId !== user._id) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Parent not found" });
      }
      if (parent.type !== "folder") {
        throw new ConvexError({
          code: "INVALID_OPERATION",
          message: "Parent must be a folder",
        });
      }
    }

    const now = Date.now();
    return await ctx.db.insert("items", {
      userId: user._id,
      type: "folder",
      title: args.title,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createNote = mutation({
  args: {
    title: v.optional(v.string()),
    parentId: v.optional(v.id("items")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.userId !== user._id) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Parent not found" });
      }
      if (parent.type !== "folder") {
        throw new ConvexError({
          code: "INVALID_OPERATION",
          message: "Parent must be a folder",
        });
      }
    }

    const now = Date.now();
    return await ctx.db.insert("items", {
      userId: user._id,
      type: "note",
      title: args.title ?? "Untitled",
      parentId: args.parentId,
      content: undefined,
      imageStorageIds: [],
      tagIds: args.tagIds,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTitle = mutation({
  args: {
    itemId: v.id("items"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    await ctx.db.patch(args.itemId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateContent = mutation({
  args: {
    itemId: v.id("items"),
    content: v.string(),
    expectedVersion: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    if (item.type !== "note") {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Cannot update content of a folder",
      });
    }

    if (
      args.expectedVersion !== undefined &&
      item.version !== undefined &&
      item.version !== args.expectedVersion
    ) {
      throw new ConvexError({
        code: "VERSION_CONFLICT",
        message: `Version conflict: expected ${args.expectedVersion}, current ${item.version}`,
      });
    }

    // Content is now HTML - extract title and storage IDs from HTML
    const title = extractTitleFromHtml(args.content);
    const nextImageStorageIds = extractStorageIdsFromHtml(args.content) as Id<"_storage">[];
    const previousImageStorageIds = item.imageStorageIds ?? [];
    const removedStorageIds = previousImageStorageIds.filter(
      (storageId) => !nextImageStorageIds.includes(storageId)
    );

    const newVersion = (item.version ?? 0) + 1;

    await ctx.db.patch(args.itemId, {
      content: args.content,
      imageStorageIds: nextImageStorageIds,
      title: title || "Untitled",
      version: newVersion,
      updatedAt: Date.now(),
    });

    if (removedStorageIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.items.removeStorageFiles, {
        storageIds: removedStorageIds,
      });
    }

    await ctx.scheduler.runAfter(0, internal.documentIndex.rebuildIndex, {
      itemId: args.itemId,
    });

    return null;
  },
});

export const move = mutation({
  args: {
    itemId: v.id("items"),
    parentId: v.optional(v.id("items")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    if (args.parentId === args.itemId) {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Cannot move item into itself",
      });
    }

    if (args.parentId) {
      const targetParent = await ctx.db.get(args.parentId);
      if (!targetParent || targetParent.userId !== user._id) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Target folder not found",
        });
      }

      if (targetParent.type !== "folder") {
        throw new ConvexError({
          code: "INVALID_OPERATION",
          message: "Cannot move item into a note",
        });
      }

      if (item.parentId === targetParent._id) {
        return null;
      }

      if (item.type === "folder") {
        let currentId: Id<"items"> | undefined = args.parentId;
        while (currentId) {
          if (currentId === args.itemId) {
            throw new ConvexError({
              code: "INVALID_OPERATION",
              message: "Cannot move folder into its own descendant",
            });
          }
          const ancestor: Doc<"items"> | null = await ctx.db.get(currentId);
          if (!ancestor || ancestor.userId !== user._id) break;
          currentId = ancestor.parentId;
        }
      }
    }

    await ctx.db.patch(args.itemId, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const remove = mutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    if (item.type === "folder") {
      const children = await ctx.db
        .query("items")
        .withIndex("by_userId_parentId", (q) =>
          q.eq("userId", user._id).eq("parentId", args.itemId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, { parentId: item.parentId });
      }
    }

    await ctx.db.delete(args.itemId);

    if (item.type === "note" && item.imageStorageIds?.length) {
      await ctx.scheduler.runAfter(0, internal.items.removeStorageFiles, {
        storageIds: item.imageStorageIds,
      });
    }

    return null;
  },
});

export const updateTags = mutation({
  args: {
    itemId: v.id("items"),
    tagIds: v.array(v.id("tags")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    await ctx.db.patch(args.itemId, {
      tagIds: args.tagIds,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const addTag = mutation({
  args: {
    itemId: v.id("items"),
    tagId: v.id("tags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    const currentTags = item.tagIds ?? [];
    if (!currentTags.includes(args.tagId)) {
      await ctx.db.patch(args.itemId, {
        tagIds: [...currentTags, args.tagId],
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const removeTag = mutation({
  args: {
    itemId: v.id("items"),
    tagId: v.id("tags"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    const currentTags = item.tagIds ?? [];
    await ctx.db.patch(args.itemId, {
      tagIds: currentTags.filter((id) => id !== args.tagId),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listByTag = query({
  args: { tagId: v.id("tags") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    const allItems = await ctx.db
      .query("items")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", user._id).eq("type", "note")
      )
      .collect();

    return allItems.filter((item) => item.tagIds?.includes(args.tagId));
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateAudioUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const removeStorageFiles = internalMutation({
  args: { storageIds: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(
      args.storageIds.map((storageId) => ctx.storage.delete(storageId))
    );
    return null;
  },
});

export const cleanupUnusedImages = internalMutation({
  args: { maxAgeMs: v.number(), limit: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const cutoffTime = Date.now() - args.maxAgeMs;
    const items = await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("type"), "note"))
      .collect();
    const usedStorageIds = new Set<Id<"_storage">>();

    for (const item of items) {
      for (const storageId of item.imageStorageIds ?? []) {
        usedStorageIds.add(storageId);
      }
    }

    const candidates = await ctx.db.system
      .query("_storage")
      .filter((q) => q.lt(q.field("_creationTime"), cutoffTime))
      .take(limit);

    const toDelete = candidates.filter(
      (file) => !usedStorageIds.has(file._id)
    );

    await Promise.all(toDelete.map((file) => ctx.storage.delete(file._id)));
    return toDelete.length;
  },
});

function buildFolderTree(
  items: Doc<"items">[]
): { tree: string; emptyFolderIds: Array<Id<"items">> } {
  const byParent = new Map<string | undefined, Doc<"items">[]>();
  for (const item of items) {
    const key = item.parentId ? item.parentId.toString() : undefined;
    const bucket = byParent.get(key) ?? [];
    bucket.push(item);
    byParent.set(key, bucket);
  }

  const emptyFolderIds: Array<Id<"items">> = [];

  const render = (parentId: Id<"items"> | undefined, depth: number): string => {
    const children = byParent.get(parentId ? parentId.toString() : undefined) ?? [];
    const sorted = children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.title.localeCompare(b.title);
    });

    return sorted
      .map((child) => {
        const prefix = "  ".repeat(depth);
        const icon = child.type === "folder" ? "📁" : "📝";
        const subtree = child.type === "folder" ? render(child._id, depth + 1) : "";
        const childCount = byParent.get(child._id.toString())?.length ?? 0;
        const isEmpty = child.type === "folder" && childCount === 0;
        if (isEmpty) emptyFolderIds.push(child._id);
        const line = `${prefix}${icon} ${child.title} [${child._id}]${isEmpty ? " (empty)" : ""}`;
        return [line, subtree].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n");
  };

  const tree = render(undefined, 0);

  return { tree, emptyFolderIds };
}

export const folderTree = query({
  args: {},
  returns: v.object({
    tree: v.string(),
    emptyFolderIds: v.array(v.id("items")),
  }),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return { tree: "", emptyFolderIds: [] };

    const items = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const { tree, emptyFolderIds } = buildFolderTree(items);
    return { tree, emptyFolderIds };
  },
});

export const internalList = internalQuery({
  args: { userId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const internalFolderTree = internalQuery({
  args: { userId: v.string() },
  returns: v.object({
    tree: v.string(),
    emptyFolderIds: v.array(v.id("items")),
  }),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const { tree, emptyFolderIds } = buildFolderTree(items);
    return { tree, emptyFolderIds };
  },
});

export const internalMove = internalMutation({
  args: {
    userId: v.string(),
    itemId: v.id("items"),
    parentId: v.optional(v.id("items")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    if (args.parentId === args.itemId) {
      throw new ConvexError({
        code: "INVALID_OPERATION",
        message: "Cannot move item into itself",
      });
    }

    if (args.parentId) {
      const targetParent = await ctx.db.get(args.parentId);
      if (!targetParent || targetParent.userId !== args.userId) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Target folder not found",
        });
      }

      if (targetParent.type !== "folder") {
        throw new ConvexError({
          code: "INVALID_OPERATION",
          message: "Cannot move item into a note",
        });
      }

      if (item.type === "folder") {
        let currentId: Id<"items"> | undefined = args.parentId;
        while (currentId) {
          if (currentId === args.itemId) {
            throw new ConvexError({
              code: "INVALID_OPERATION",
              message: "Cannot move folder into its own descendant",
            });
          }
          const ancestor: Doc<"items"> | null = await ctx.db.get(currentId);
          if (!ancestor || ancestor.userId !== args.userId) break;
          currentId = ancestor.parentId;
        }
      }
    }

    await ctx.db.patch(args.itemId, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const internalRemove = internalMutation({
  args: {
    userId: v.string(),
    itemId: v.id("items"),
    recursive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Item not found",
      });
    }

    if (item.type === "folder") {
      const children = await ctx.db
        .query("items")
        .withIndex("by_userId_parentId", (q) =>
          q.eq("userId", args.userId).eq("parentId", args.itemId)
        )
        .collect();

      if (args.recursive === true) {
        // Delete all children recursively
        for (const child of children) {
          await ctx.runMutation(internal.items.internalRemove, {
            userId: args.userId,
            itemId: child._id,
            recursive: true,
          });
        }
      } else {
        // Move children to parent of deleted folder (preserve content)
        for (const child of children) {
          await ctx.db.patch(child._id, { parentId: item.parentId });
        }
      }
    }

    await ctx.db.delete(args.itemId);

    if (item.type === "note" && item.imageStorageIds?.length) {
      await ctx.scheduler.runAfter(0, internal.items.removeStorageFiles, {
        storageIds: item.imageStorageIds,
      });
    }

    return null;
  },
});

export const internalGet = internalQuery({
  args: { itemId: v.id("items"), userId: v.string() },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) {
      return null;
    }
    return item;
  },
});

export const internalCreateNote = internalMutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
    parentId: v.optional(v.id("items")),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("items", {
      userId: args.userId,
      type: "note",
      title: args.title ?? "Untitled",
      parentId: args.parentId,
      content: undefined,
      imageStorageIds: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const internalCreateFolder = internalMutation({
  args: {
    userId: v.string(),
    title: v.string(),
    parentId: v.optional(v.id("items")),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("items", {
      userId: args.userId,
      type: "folder",
      title: args.title,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const internalUpdateContent = internalMutation({
  args: {
    itemId: v.id("items"),
    userId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
    }

    // Content is now HTML - extract title and storage IDs from HTML
    const title = extractTitleFromHtml(args.content) || item.title;
    const nextImageStorageIds = extractStorageIdsFromHtml(args.content) as Id<"_storage">[];
    const previousImageStorageIds = item.imageStorageIds ?? [];
    const removedStorageIds = previousImageStorageIds.filter(
      (storageId) => !nextImageStorageIds.includes(storageId)
    );

    const newVersion = (item.version ?? 0) + 1;

    await ctx.db.patch(args.itemId, {
      content: args.content,
      imageStorageIds: nextImageStorageIds,
      title: title || "Untitled",
      version: newVersion,
      updatedAt: Date.now(),
    });

    if (removedStorageIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.items.removeStorageFiles, {
        storageIds: removedStorageIds,
      });
    }

    await ctx.scheduler.runAfter(0, internal.documentIndex.rebuildIndex, {
      itemId: args.itemId,
    });

    return null;
  },
});
