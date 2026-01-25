import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import type { DragData } from "./types";

type DraggableItemProps = {
  id: string;
  data: DragData;
  children: ReactNode;
  className?: string;
};

export function DraggableItem({
  id,
  data,
  children,
  className,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
      data-dragging={isDragging}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
