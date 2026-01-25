import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  IconTable,
  IconRowInsertTop,
  IconRowInsertBottom,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconRowRemove,
  IconColumnRemove,
  IconTableOff,
  IconLayoutBoardSplit,
  IconArrowMergeAltLeft,
} from "@tabler/icons-react";
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
            <button
              key={index}
              type="button"
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
              <IconTable className="size-4" />
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

export function TableContextMenu({ editor }: TableMenuProps) {
  const isInTable = editor.isActive("table");

  if (!isInTable) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={isInTable}
                  aria-label="Table Options"
                />
              }
            >
              <IconTable className="size-4" />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>Table Options</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconRowInsertTop className="size-4" />
            Add Row
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              <IconRowInsertTop className="size-4" />
              Insert Above
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <IconRowInsertBottom className="size-4" />
              Insert Below
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <IconColumnInsertLeft className="size-4" />
            Add Column
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              <IconColumnInsertLeft className="size-4" />
              Insert Left
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <IconColumnInsertRight className="size-4" />
              Insert Right
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <IconRowRemove className="size-4" />
          Delete Row
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <IconColumnRemove className="size-4" />
          Delete Column
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
        >
          <IconArrowMergeAltLeft className="size-4" />
          Merge Cells
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
        >
          <IconLayoutBoardSplit className="size-4" />
          Split Cell
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          Toggle Header Row
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        >
          Toggle Header Column
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => editor.chain().focus().deleteTable().run()}
          variant="destructive"
        >
          <IconTableOff className="size-4" />
          Delete Table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
