import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const list = query({
  args: {},
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
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      userId: user._id,
      title: args.title ?? "Untitled",
      content: undefined,
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
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    const title = extractTitleFromContent(args.content);

    await ctx.db.patch(args.noteId, {
      content: args.content,
      title: title || "Untitled",
      updatedAt: Date.now(),
    });
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

export const updateTitle = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    await ctx.db.patch(args.noteId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    await ctx.db.delete(args.noteId);
  },
});

export const updateFolder = mutation({
  args: {
    noteId: v.id("notes"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    await ctx.db.patch(args.noteId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });
  },
});

export const updateTags = mutation({
  args: {
    noteId: v.id("notes"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    await ctx.db.patch(args.noteId, {
      tagIds: args.tagIds,
      updatedAt: Date.now(),
    });
  },
});

export const addTag = mutation({
  args: {
    noteId: v.id("notes"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    const currentTags = note.tagIds ?? [];
    if (!currentTags.includes(args.tagId)) {
      await ctx.db.patch(args.noteId, {
        tagIds: [...currentTags, args.tagId],
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeTag = mutation({
  args: {
    noteId: v.id("notes"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id) {
      throw new Error("Note not found");
    }

    const currentTags = note.tagIds ?? [];
    await ctx.db.patch(args.noteId, {
      tagIds: currentTags.filter((id) => id !== args.tagId),
      updatedAt: Date.now(),
    });
  },
});

export const listByFolder = query({
  args: { folderId: v.optional(v.id("folders")) },
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
