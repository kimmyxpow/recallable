import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { FolderDropTarget, DragData } from "./types";
import type { Id } from "../../../../convex/_generated/dataModel";

type DroppableFolderProps = {
  id: string;
  itemId: Id<"items">;
  children: ReactNode;
  className?: string;
  activeItem: DragData | null;
};

export function DroppableFolder({
  id,
  itemId,
  children,
  className,
  activeItem,
}: DroppableFolderProps) {
  const data: FolderDropTarget = {
    type: "folder",
    itemId,
  };

  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
  });

  const canDrop =
    activeItem &&
    (activeItem.type === "note" ||
      (activeItem.type === "folder" && activeItem.itemId !== itemId));

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
