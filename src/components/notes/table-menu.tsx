import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconTable } from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TableInsertGridProps {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}

function TableInsertGrid({ onInsert, onClose }: TableInsertGridProps) {
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 });
  const maxRows = 6;
  const maxCols = 6;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground text-center">
        {hoveredCell.row > 0 && hoveredCell.col > 0
          ? `${hoveredCell.row} × ${hoveredCell.col}`
          : "Select size"}
      </p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
        onMouseLeave={() => setHoveredCell({ row: 0, col: 0 })}
      >
        {Array.from({ length: maxRows * maxCols }).map((_, index) => {
          const row = Math.floor(index / maxCols) + 1;
          const col = (index % maxCols) + 1;
          const isHighlighted =
            row <= hoveredCell.row && col <= hoveredCell.col;

          return (
            <motion.button
              key={index}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "size-5 rounded-sm border border-border transition-colors",
                isHighlighted ? "bg-primary" : "bg-muted hover:bg-muted/80"
              )}
              onMouseEnter={() => setHoveredCell({ row, col })}
              onClick={() => {
                onInsert(row, col);
                onClose();
              }}
              aria-label={`Insert ${row} by ${col} table`}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TableMenuProps {
  editor: Editor;
}

export function TableInsertButton({ editor }: TableMenuProps) {
  const [open, setOpen] = useState(false);

  const insertTable = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Toggle size="sm" pressed={false} aria-label="Insert Table" />
              }
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <IconTable className="size-4" />
              </motion.div>
            </PopoverTrigger>
          }
        />
        <TooltipContent>Insert Table</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3">
        <TableInsertGrid
          onInsert={insertTable}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
