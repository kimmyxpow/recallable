import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listByParent = query({
  args: { parentId: v.optional(v.id("folders")) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("folders")
      .withIndex("by_userId_parentId", (q) =>
        q.eq("userId", user._id).eq("parentId", args.parentId)
      )
      .collect();
  },
});

export const get = query({
  args: { folderId: v.optional(v.id("folders")) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user || !args.folderId) {
      return null;
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      return null;
    }

    return folder;
  },
});

export const getBreadcrumbs = query({
  args: { folderId: v.optional(v.id("folders")) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user || !args.folderId) {
      return [];
    }

    const breadcrumbs: Array<{ _id: string; name: string }> = [];
    let currentId: Id<"folders"> | undefined = args.folderId;

    while (currentId) {
      const folder: Doc<"folders"> | null = await ctx.db.get(currentId);
      if (!folder || folder.userId !== user._id) break;

      breadcrumbs.unshift({ _id: folder._id, name: folder.name });
      currentId = folder.parentId;
    }

    return breadcrumbs;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    return await ctx.db.insert("folders", {
      userId: user._id,
      name: args.name,
      parentId: args.parentId,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.parentId !== undefined && { parentId: args.parentId }),
      ...(args.color !== undefined && { color: args.color }),
      updatedAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: {
    folderId: v.id("folders"),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error("Folder not found");
    }

    if (args.parentId === args.folderId) {
      throw new Error("Cannot move folder into itself");
    }

    await ctx.db.patch(args.folderId, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== user._id) {
      throw new Error("Folder not found");
    }

    const childFolders = await ctx.db
      .query("folders")
      .withIndex("by_userId_parentId", (q) =>
        q.eq("userId", user._id).eq("parentId", args.folderId)
      )
      .collect();

    for (const child of childFolders) {
      await ctx.db.patch(child._id, { parentId: folder.parentId });
    }

    const notesInFolder = await ctx.db
      .query("notes")
      .withIndex("by_userId_folderId", (q) =>
        q.eq("userId", user._id).eq("folderId", args.folderId)
      )
      .collect();

    for (const note of notesInFolder) {
      await ctx.db.patch(note._id, { folderId: folder.parentId });
    }

    await ctx.db.delete(args.folderId);
  },
});
