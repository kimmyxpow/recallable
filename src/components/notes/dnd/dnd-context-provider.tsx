import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import type { DragData, DropTargetData } from "./types";

type DndContextProviderProps = {
  children: ReactNode;
  onMoveNote: (noteId: string, targetFolderId: string | undefined) => void;
  onMoveFolder: (folderId: string, targetParentId: string | undefined) => void;
};

export function DndContextProvider({
  children,
  onMoveNote,
  onMoveFolder,
}: DndContextProviderProps) {
  const [activeItem, setActiveItem] = useState<DragData | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData;
    setActiveItem(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropTargetData;

    if (!dragData || !dropData) return;

    if (dragData.type === "note") {
      if (dropData.type === "folder") {
        if (dragData.currentFolderId !== dropData.folderId) {
          onMoveNote(dragData.noteId, dropData.folderId);
        }
      } else if (dropData.type === "parent-zone") {
        if (dragData.currentFolderId !== dropData.targetFolderId) {
          onMoveNote(dragData.noteId, dropData.targetFolderId);
        }
      }
    } else if (dragData.type === "folder") {
      if (dropData.type === "folder") {
        if (
          dragData.folderId !== dropData.folderId &&
          dragData.parentId !== dropData.folderId
        ) {
          onMoveFolder(dragData.folderId, dropData.folderId);
        }
      } else if (dropData.type === "parent-zone") {
        if (dragData.parentId !== dropData.targetFolderId) {
          onMoveFolder(dragData.folderId, dropData.targetFolderId);
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlayContent activeItem={activeItem} />
    </DndContext>
  );
}

function DragOverlayContent({ activeItem }: { activeItem: DragData | null }) {
  if (!activeItem) return null;

  return (
    <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
      <DragOverlayItem data={activeItem} />
    </DragOverlay>
  );
}

function DragOverlayItem({ data }: { data: DragData }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-primary/20 ring-2 ring-primary/10">
      {data.type === "folder" ? (
        <FolderIcon className="size-4 text-primary shrink-0" />
      ) : (
        <DocumentIcon className="size-4 text-primary shrink-0" />
      )}
      <span className="text-sm font-medium truncate max-w-[180px]">
        {data.type === "folder" ? data.name : data.title}
      </span>
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Folder"
    >
      <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Document"
    >
      <path
        fillRule="evenodd"
        d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V7.875L14.25 1.5H5.625ZM14.25 3.75v3.375c0 .621.504 1.125 1.125 1.125h3.375L14.25 3.75Zm-3.75 9.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Zm-1.5 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75-8.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
