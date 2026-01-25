import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { FolderDropTarget, DragData } from "./types";

type DroppableFolderProps = {
  id: string;
  folderId: string;
  children: ReactNode;
  className?: string;
  activeItem: DragData | null;
};

export function DroppableFolder({
  id,
  folderId,
  children,
  className,
  activeItem,
}: DroppableFolderProps) {
  const data: FolderDropTarget = {
    type: "folder",
    folderId: folderId as FolderDropTarget["folderId"],
  };

  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
  });

  const canDrop =
    activeItem &&
    (activeItem.type === "note" ||
      (activeItem.type === "folder" && activeItem.folderId !== folderId));

  const isValidDropTarget = isOver && canDrop;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-150",
        isValidDropTarget && "ring-2 ring-primary/50 ring-offset-1 rounded-md",
        className
      )}
    >
      {children}
    </div>
  );
}
