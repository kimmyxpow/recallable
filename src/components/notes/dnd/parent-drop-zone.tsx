import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ParentZoneDropTarget } from "./types";
import type { Id } from "../../../../convex/_generated/dataModel";
import { motion } from "motion/react";

type ParentDropZoneProps = {
  targetParentId?: Id<"items">;
  isVisible: boolean;
  isDragging: boolean;
  currentFolderName?: string;
  onNavigateBack: () => void;
};

export function ParentDropZone({
  targetParentId,
  isVisible,
  isDragging,
  currentFolderName,
  onNavigateBack,
}: ParentDropZoneProps) {
  const data: ParentZoneDropTarget = {
    type: "parent-zone",
    targetParentId,
  };

  const { isOver, setNodeRef } = useDroppable({
    id: "parent-drop-zone",
    data,
  });

  if (!isVisible) return null;

  const isDropTarget = isDragging && isOver;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigateBack();
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onNavigateBack}
      onKeyDown={handleKeyDown}
      animate={{
        scale: isDropTarget ? 1.02 : 1,
        backgroundColor: isDropTarget ? "rgb(var(--primary) / 0.1)" : "transparent",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 mt-2 mx-2 rounded-md cursor-pointer",
        isDropTarget && "ring-2 ring-primary/50 ring-offset-1",
        !isDropTarget && "hover:bg-accent/30",
        isDragging && "border-2 border-dashed border-primary/30"
      )}
    >
      <motion.div
        animate={{ x: isDropTarget ? -3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <BackArrowIcon className="size-4 text-foreground/60 shrink-0" />
      </motion.div>
      <span className="text-sm text-foreground/80 truncate">Back</span>
      {currentFolderName && (
        <span className="text-xs text-muted-foreground truncate ml-auto">
          {currentFolderName}
        </span>
      )}
    </motion.div>
  );
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Back"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
