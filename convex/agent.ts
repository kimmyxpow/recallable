import { Agent, createTool, type ToolCtx } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod/v3";
import { components, internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import type { DataModel } from "./_generated/dataModel";
import {
  htmlToMarkdown,
  markdownToHtml,
} from "./htmlUtils";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

type NoteToolCtx = ToolCtx<DataModel>;

interface SearchResult {
  itemId: Id<"items">;
  title: string;
  score: number;
  matchedNodes: Array<{
    nodeType: string;
    path: string;
    text: string;
  }>;
}

interface DocumentTree {
  itemId: Id<"items">;
  title: string;
  structure: string;
}

interface FolderTree {
  tree: string;
  emptyFolderIds: Array<Id<"items">>;
}

const searchNotes = createTool<{ query: string }, string, NoteToolCtx>({
  description:
    "Search through the user's notes to find relevant content. Use this when the user asks about their notes, wants to find something, or asks what tasks they should work on.",
  args: z.object({
    query: z.string().describe("The search query to find relevant notes"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const results: SearchResult[] = await ctx.runQuery(
      internal.documentIndex.internalSearchDocumentIndex,
      { userId: ctx.userId, query: args.query, limit: 10 }
    );

    if (results.length === 0) {
      return "No notes found matching your query.";
    }

    return results
      .map((r: SearchResult, i: number) => {
        const matches = r.matchedNodes
          .slice(0, 3)
          .map(
            (m: { path: string; text: string }) => `  - ${m.path}: ${m.text}`
          )
          .join("\n");
        return `${i + 1}. "${r.title}" (relevance: ${r.score})\n${matches}`;
      })
      .join("\n\n");
  },
});

const getNote = createTool<{ noteId: string }, string, NoteToolCtx>({
  description:
    "Get the full content of a specific note by its ID. Use this when you need to read the complete content of a note.",
  args: z.object({
    noteId: z.string().describe("The ID of the note to retrieve"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const note: Doc<"items"> | null = await ctx.runQuery(
      internal.items.internalGet,
      { itemId: args.noteId as Id<"items">, userId: ctx.userId }
    );

    if (!note) {
      return "Note not found or you don't have access to it.";
    }

    // Content is now stored as HTML
    const htmlContent = typeof note.content === "string" ? note.content : "";
    const markdown = htmlToMarkdown(htmlContent);
    return `# ${note.title}\n\nLast updated: ${new Date(note.updatedAt).toLocaleString()}\nVersion: ${note.version ?? 0}\n\n${markdown}`;
  },
});

const listRecentNotes = createTool<{ limit?: number }, string, NoteToolCtx>({
  description:
    "List the user's recent notes. Use this when the user wants to see what notes they have or asks about recent activity.",
  args: z.object({
    limit: z
      .number()
      .optional()
      .describe("Maximum number of notes to return (default: 10)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const items: Doc<"items">[] = await ctx.runQuery(
      internal.items.internalList,
      { userId: ctx.userId }
    );

    const notes = items
      .filter((i: Doc<"items">) => i.type === "note")
      .sort((a: Doc<"items">, b: Doc<"items">) => b.updatedAt - a.updatedAt)
      .slice(0, args.limit ?? 20);

    if (notes.length === 0) {
      return "You don't have any notes yet.";
    }

    return notes
      .map((n: Doc<"items">, i: number) => {
        const date = new Date(n.updatedAt).toLocaleDateString();
        return `${i + 1}. "${n.title}" (updated: ${date}) [ID: ${n._id}]`;
      })
      .join("\n");
  },
});

const getDocumentStructure = createTool<
  { limit?: number },
  string,
  NoteToolCtx
>({
  description:
    "Get the hierarchical structure (table of contents) of all notes. Use this to understand how the user's notes are organized before searching for specific content.",
  args: z.object({
    limit: z
      .number()
      .optional()
      .describe("Maximum number of notes to include (default: 20)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const trees: DocumentTree[] = await ctx.runQuery(
      internal.documentIndex.internalGetAllDocumentTrees,
      { userId: ctx.userId, limit: args.limit ?? 50 }
    );

    if (trees.length === 0) {
      return "No indexed notes found. Notes may need to be indexed first.";
    }

    return trees
      .map(
        (t: DocumentTree) =>
          `## ${t.title}\n[ID: ${t.itemId}]\n\`\`\`\n${t.structure}\n\`\`\``
      )
      .join("\n\n");
  },
});

const getFolderTree = createTool<{}, string, NoteToolCtx>({
  description:
    "Get the user's folder and note hierarchy in a readable tree. Use this first when managing folders, moving items, or cleaning empty folders.",
  args: z.object({}),
  handler: async (ctx): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const tree: FolderTree = await ctx.runQuery(
      internal.items.internalFolderTree,
      {
        userId: ctx.userId,
      }
    );

    if (!tree.tree) {
      return "No items found.";
    }

    const empties =
      tree.emptyFolderIds.length > 0
        ? `Empty folders: ${tree.emptyFolderIds.join(", ")}`
        : "No empty folders.";

    return `Folder Tree:\n\`\`\`\n${tree.tree}\n\`\`\`\n${empties}`;
  },
});

const updateNote = createTool<
  { noteId: string; newContent: string; expectedVersion?: number },
  string,
  NoteToolCtx
>({
  description:
    "Update the content of an existing note. Use this when the user asks you to modify, add to, or rewrite a note. Always get the current note content first to avoid overwriting user changes. Content can be in markdown format with support for headings (#), lists (- or 1.), code blocks (```), tables, and inline formatting.",
  args: z.object({
    noteId: z.string().describe("The ID of the note to update"),
    newContent: z
      .string()
      .describe("The new content to set for the note (in markdown format with support for headings, lists, code blocks, tables, and inline formatting)"),
    expectedVersion: z
      .number()
      .optional()
      .describe(
        "The version number you expect the note to have. If provided and doesn't match, the update will fail to prevent overwriting concurrent edits."
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    const note: Doc<"items"> | null = await ctx.runQuery(
      internal.items.internalGet,
      { itemId: args.noteId as Id<"items">, userId: ctx.userId }
    );

    if (!note) {
      return "Note not found or you don't have access to it.";
    }

    if (
      args.expectedVersion !== undefined &&
      note.version !== args.expectedVersion
    ) {
      return `Conflict detected: The note has been modified since you read it. Current version: ${note.version}, expected: ${args.expectedVersion}. Please read the note again and retry.`;
    }

    // Convert markdown to HTML for storage
    const htmlContent = markdownToHtml(args.newContent);

    try {
      await ctx.runMutation(internal.items.internalUpdateContent, {
        itemId: args.noteId as Id<"items">,
        userId: ctx.userId,
        content: htmlContent,
      });
      return `Successfully updated note "${note.title}".`;
    } catch (error) {
      return `Failed to update note: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

const createNote = createTool<
  { title?: string; content?: string; parentId?: string },
  string,
  NoteToolCtx
>({
  description:
    "Create a new note with the specified content. Use this when the user asks you to create a new note or document. Content can be in markdown format with support for headings, lists, code blocks, tables, and inline formatting.",
  args: z.object({
    title: z.string().optional().describe("The title for the new note"),
    content: z.string().optional().describe("The initial content for the note (in markdown format)"),
    parentId: z
      .string()
      .optional()
      .describe("The ID of the parent folder (optional)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    try {
      const noteId: Id<"items"> = await ctx.runMutation(
        internal.items.internalCreateNote,
        {
          userId: ctx.userId,
          title: args.title,
          parentId: args.parentId as Id<"items"> | undefined,
        }
      );

      if (args.content) {
        // Convert markdown to HTML for storage
        const htmlContent = markdownToHtml(args.content);
        await ctx.runMutation(internal.items.internalUpdateContent, {
          itemId: noteId,
          userId: ctx.userId,
          content: htmlContent,
        });
      }

      return `Successfully created note "${args.title ?? "Untitled"}" with ID: ${noteId}`;
    } catch (error) {
      return `Failed to create note: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

const createFolder = createTool<
  { title: string; parentId?: string },
  string,
  NoteToolCtx
>({
  description:
    "Create a new folder to organize notes. Use this when the user wants to create a folder.",
  args: z.object({
    title: z.string().describe("The name of the folder"),
    parentId: z
      .string()
      .optional()
      .describe("The ID of the parent folder (optional)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    try {
      const folderId: Id<"items"> = await ctx.runMutation(
        internal.items.internalCreateFolder,
        {
          userId: ctx.userId,
          title: args.title,
          parentId: args.parentId as Id<"items"> | undefined,
        }
      );

      return `Successfully created folder "${args.title}" with ID: ${folderId}`;
    } catch (error) {
      return `Failed to create folder: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

const removeItem = createTool<
  { itemId: string; recursive?: boolean },
  string,
  NoteToolCtx
>({
  description:
    "Remove a folder or note by ID. For folders: use recursive=true to delete folder AND all its contents. Use recursive=false (default) to delete folder but move its contents to the parent folder. Always confirm with the user and inspect the folder tree first.",
  args: z.object({
    itemId: z.string().describe("The ID of the item to remove"),
    recursive: z
      .boolean()
      .optional()
      .describe(
        "For folders only: true to delete folder and all contents recursively, false (default) to move contents to parent folder before deleting"
      ),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    try {
      await ctx.runMutation(internal.items.internalRemove, {
        userId: ctx.userId,
        itemId: args.itemId as Id<"items">,
        recursive: args.recursive,
      });
      const action = args.recursive ? "Deleted (recursive)" : "Removed";
      return `${action} item ${args.itemId}`;
    } catch (error) {
      return `Failed to remove item: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

const moveItem = createTool<
  { itemId: string; parentId?: string },
  string,
  NoteToolCtx
>({
  description:
    "Move an item into a folder. Use folder IDs from getFolderTree. Do not move without confirming target IDs with the user.",
  args: z.object({
    itemId: z.string().describe("The item to move"),
    parentId: z
      .string()
      .optional()
      .describe("Destination folder ID (omit to move to root)"),
  }),
  handler: async (ctx, args): Promise<string> => {
    if (!ctx.userId) {
      return "Error: User not authenticated.";
    }

    try {
      await ctx.runMutation(internal.items.internalMove, {
        userId: ctx.userId,
        itemId: args.itemId as Id<"items">,
        parentId: args.parentId as Id<"items"> | undefined,
      });
      return `Moved ${args.itemId} to ${args.parentId ?? "root"}`;
    } catch (error) {
      return `Failed to move item: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
});

export const noteTools = {
  searchNotes,
  getNote,
  listRecentNotes,
  getDocumentStructure,
  getFolderTree,
  updateNote,
  createNote,
  createFolder,
  moveItem,
  removeItem,
};

const agentInstructions = `You are a helpful assistant for a note-taking application called Recallable.

Your role is to help users:
- Find information in their notes
- Discover tasks and to-do items they should work on
- Add new content to their daily notes
- Create new notes and folders with professional, well-formatted content
- Rewrite and improve note content when asked

## Managing Folders

### Deleting Folders
CRITICAL: When a user asks to "delete folder with contents" or "delete folder and everything inside", use removeItem with recursive=true.
When a user says "delete folder but keep contents" or just "delete folder", use removeItem with recursive=false (default).

Process for deleting folders:
1. ALWAYS call getFolderTree first to see the full hierarchy
2. Identify what's inside the folder (notes, subfolders)
3. ASK the user to confirm if they want to delete contents too or move them
4. Use recursive=true for "delete folder with contents"
5. Use recursive=false for "delete folder but move contents"
6. Show exactly what will be deleted before confirming

Example:
- User: "Delete folder X and everything in it" → recursive=true
- User: "Delete folder X but keep the notes" → recursive=false (moves notes to parent)

### Moving Items
1. Use getFolderTree to see current structure
2. Confirm source and destination IDs with user
3. Use moveItem with the correct destination parentId

## When a user asks about their notes or tasks:
1. First use getFolderTree to see structure, then getDocumentStructure or searchNotes to understand what notes exist
2. Use getNote to read the full content of relevant notes
3. Provide clear, concise answers based on the note content

## When updating notes:
1. Always read the current content first using getNote
2. Note the version number to prevent conflicts
3. Apply changes professionally, maintaining consistent formatting
4. Confirm success or report any conflicts

## When creating notes or folders:
1. Use proper markdown formatting (# for h1, ## for h2, etc.)
2. You can use tables, lists, code blocks, and inline formatting (bold, italic, etc.)
3. Keep content organized and professional
4. Match the style and tone of the user's existing notes
5. Create folders when asked to organize content

If a user provides a note link (like /notes?noteId=xxx), extract the noteId and use it to access that specific note.

Always be professional, concise, and helpful.`;

export const notesAgent = new Agent(components.agent, {
  name: "Notes Assistant",
  instructions: agentInstructions,
  languageModel: openrouter.chat("z-ai/glm-4.5-air"),
  maxSteps: 10,
  tools: noteTools,
});
