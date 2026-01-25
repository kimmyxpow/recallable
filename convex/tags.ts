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
      .query("tags")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("tags")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("tags", {
      userId: user._id,
      name: args.name,
      color: args.color,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    await ctx.db.patch(args.tagId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.color !== undefined && { color: args.color }),
    });
  },
});

export const remove = mutation({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.tagId);
    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    const notesWithTag = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const note of notesWithTag) {
      if (note.tagIds?.includes(args.tagId)) {
        await ctx.db.patch(note._id, {
          tagIds: note.tagIds.filter((id) => id !== args.tagId),
        });
      }
    }

    await ctx.db.delete(args.tagId);
  },
});
