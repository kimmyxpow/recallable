import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_parentId", ["userId", "parentId"])
    .index("by_userId_name", ["userId", "name"]),

  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),

  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.optional(v.any()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    folderId: v.optional(v.id("folders")),
    tagIds: v.optional(v.array(v.id("tags"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"])
    .index("by_userId_folderId", ["userId", "folderId"]),
});
