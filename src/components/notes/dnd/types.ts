import type { Id } from "../../../../convex/_generated/dataModel";

export type DragItemType = "note" | "folder";

export type NoteDragData = {
  type: "note";
  noteId: Id<"notes">;
  title: string;
  currentFolderId?: Id<"folders">;
};

export type FolderDragData = {
  type: "folder";
  folderId: Id<"folders">;
  name: string;
  parentId?: Id<"folders">;
};

export type DragData = NoteDragData | FolderDragData;

export type DropTargetType = "folder" | "parent-zone";

export type FolderDropTarget = {
  type: "folder";
  folderId: Id<"folders">;
};

export type ParentZoneDropTarget = {
  type: "parent-zone";
  targetFolderId?: Id<"folders">;
};

export type DropTargetData = FolderDropTarget | ParentZoneDropTarget;
