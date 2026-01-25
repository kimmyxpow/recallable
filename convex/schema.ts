import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    userId: v.string(),
    type: v.union(v.literal("folder"), v.literal("note")),
    title: v.string(),
    parentId: v.optional(v.id("items")),
    content: v.optional(v.any()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    tagIds: v.optional(v.array(v.id("tags"))),
    order: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_userId_parentId", ["userId", "parentId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),
});
