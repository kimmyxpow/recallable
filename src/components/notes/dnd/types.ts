import type { Id } from "../../../../convex/_generated/dataModel";

export type DragItemType = "note" | "folder";

export type NoteDragData = {
  type: "note";
  itemId: Id<"items">;
  title: string;
  parentId?: Id<"items">;
};

export type FolderDragData = {
  type: "folder";
  itemId: Id<"items">;
  title: string;
  parentId?: Id<"items">;
};

export type DragData = NoteDragData | FolderDragData;

export type DropTargetType = "folder" | "parent-zone";

export type FolderDropTarget = {
  type: "folder";
  itemId: Id<"items">;
};

export type ParentZoneDropTarget = {
  type: "parent-zone";
  targetParentId?: Id<"items">;
};

export type DropTargetData = FolderDropTarget | ParentZoneDropTarget;
