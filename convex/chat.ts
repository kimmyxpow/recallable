import { v, ConvexError } from "convex/values";
import {
  internalAction,
  mutation,
  query,
} from "./_generated/server";
import { internal, components } from "./_generated/api";
import { authComponent } from "./auth";
import {
  createThread,
  saveMessage,
  listUIMessages,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { notesAgent } from "./agent";
import { paginationOptsValidator } from "convex/server";

export const createAgentThread = mutation({
  args: {
    activeNoteId: v.optional(v.id("items")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const threadId = await createThread(ctx, components.agent, {
      userId: user._id,
    });

    await ctx.db.insert("agentThreads", {
      userId: user._id,
      agentThreadId: threadId,
      activeNoteId: args.activeNoteId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return threadId;
  },
});

export const getOrCreateThread = mutation({
  args: {
    activeNoteId: v.optional(v.id("items")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const existing = await ctx.db
      .query("agentThreads")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existing) {
      if (args.activeNoteId && existing.activeNoteId !== args.activeNoteId) {
        await ctx.db.patch(existing._id, {
          activeNoteId: args.activeNoteId,
          updatedAt: Date.now(),
        });
      }
      return existing.agentThreadId;
    }

    const threadId = await createThread(ctx, components.agent, {
      userId: user._id,
    });

    await ctx.db.insert("agentThreads", {
      userId: user._id,
      agentThreadId: threadId,
      activeNoteId: args.activeNoteId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return threadId;
  },
});

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      prompt: args.message,
    });

    await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
      threadId: args.threadId,
      promptMessageId: messageId,
      userId: user._id,
    });

    return messageId;
  },
});

export const generateResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await notesAgent.generateText(
      ctx,
      { threadId: args.threadId, userId: args.userId },
      { promptMessageId: args.promptMessageId }
    );
    return null;
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

export const listUserThreads = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("agentThreads"),
      agentThreadId: v.string(),
      title: v.optional(v.string()),
      activeNoteId: v.optional(v.id("items")),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);

    return threads.map((t) => ({
      _id: t._id,
      agentThreadId: t.agentThreadId,
      title: t.title,
      activeNoteId: t.activeNoteId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  },
});

export const deleteThread = mutation({
  args: { threadId: v.id("agentThreads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Thread not found",
      });
    }

    await ctx.db.delete(args.threadId);
    return null;
  },
});

export const clearThreads = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const thread of threads) {
      await ctx.db.delete(thread._id);
    }

    return null;
  },
});
