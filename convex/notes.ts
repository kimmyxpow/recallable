import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("notes")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { noteId: v.id("notes") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      return null;
    }

    return note;
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title ?? "Untitled",
      content: undefined,
      imageStorageIds: [],
      folderId: args.folderId,
      tagIds: args.tagIds,
      createdAt: now,
      updatedAt: now,
    });

    return noteId;
  },
});

export const updateContent = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.any(),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    const title = extractTitleFromContent(args.content);
    const nextImageStorageIds = extractImageStorageIds(args.content);
    const previousImageStorageIds = note.imageStorageIds ?? [];
    const removedStorageIds = previousImageStorageIds.filter(
      (storageId) => !nextImageStorageIds.includes(storageId)
    );

    await ctx.db.patch(args.noteId, {
      content: args.content,
      imageStorageIds: nextImageStorageIds,
      title: title || "Untitled",
      updatedAt: Date.now(),
    });
    if (removedStorageIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notes.removeStorageFiles, {
        storageIds: removedStorageIds,
      });
    }
    return null;
  },
});

function extractTitleFromContent(content: {
  type: string;
  content?: Array<{
    type: string;
    attrs?: { level?: number };
    content?: Array<{ type: string; text?: string }>;
  }>;
}): string | null {
  if (!content?.content?.length) {
    return null;
  }

  for (const node of content.content) {
    if (node.type === "heading" && node.attrs?.level === 1) {
      const text = node.content
        ?.filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("");
      if (text?.trim()) {
        return text.trim();
      }
    }
  }

  const firstNode = content.content[0];
  if (firstNode?.content?.length) {
    const text = firstNode.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("");
    if (text?.trim()) {
      return text.trim();
    }
  }

  return null;
}

function extractImageStorageIds(content: {
  type: string;
  content?: Array<Record<string, unknown>>;
}): Id<"_storage">[] {
  const storageIds = new Set<Id<"_storage">>();
  if (!content?.content?.length) {
    return [];
  }
  const stack = [...content.content];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") {
      continue;
    }
    const typedNode = node as {
      type?: string;
      attrs?: { storageId?: Id<"_storage"> };
      content?: Array<Record<string, unknown>>;
    };
    if (
      (typedNode.type === "image" || typedNode.type === "audio") &&
      typedNode.attrs?.storageId
    ) {
      storageIds.add(typedNode.attrs.storageId);
    }
    if (Array.isArray(typedNode.content)) {
      stack.push(...typedNode.content);
    }
  }
  return Array.from(storageIds);
}

export const updateTitle = mutation({
  args: {
    noteId: v.id("notes"),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    await ctx.db.patch(args.noteId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    await ctx.db.delete(args.noteId);
    if (note.imageStorageIds?.length) {
      await ctx.scheduler.runAfter(0, internal.notes.removeStorageFiles, {
        storageIds: note.imageStorageIds,
      });
    }
    return null;
  },
});

export const updateFolder = mutation({
  args: {
    noteId: v.id("notes"),
    folderId: v.optional(v.id("folders")),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    await ctx.db.patch(args.noteId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateTags = mutation({
  args: {
    noteId: v.id("notes"),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    await ctx.db.patch(args.noteId, {
      tagIds: args.tagIds,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const addTag = mutation({
  args: {
    noteId: v.id("notes"),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    const currentTags = note.tagIds ?? [];
    if (!currentTags.includes(args.tagId)) {
      await ctx.db.patch(args.noteId, {
        tagIds: [...currentTags, args.tagId],
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const removeTag = mutation({
  args: {
    noteId: v.id("notes"),
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

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Note not found",
      });
    }

    const currentTags = note.tagIds ?? [];
    await ctx.db.patch(args.noteId, {
      tagIds: currentTags.filter((id) => id !== args.tagId),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listByFolder = query({
  args: { folderId: v.optional(v.id("folders")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("notes")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", user._id).eq("folderId", args.folderId)
      )
      .collect();
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

    const allNotes = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return allNotes.filter((note) => note.tagIds?.includes(args.tagId));
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
    const notes = await ctx.db.query("notes").collect();
    const usedStorageIds = new Set<Id<"_storage">>();

    for (const note of notes) {
      for (const storageId of note.imageStorageIds ?? []) {
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
