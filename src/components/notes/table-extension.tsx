import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Table } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
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
  IconRowInsertTop,
  IconRowInsertBottom,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconRowRemove,
  IconColumnRemove,
  IconTableOff,
  IconDotsVertical,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { createRoot, type Root } from "react-dom/client";

function TableMenu({
  editor,
  isHovered,
  setIsHovered,
}: {
  editor: Editor;
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "absolute top-0 right-0 z-10 transition-opacity duration-150",
        isHovered || menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) setIsHovered(false);
        }}
      >
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex items-center justify-center size-7 rounded-md bg-background border border-border shadow-sm hover:bg-muted transition-colors"
              aria-label="Table Options"
            >
              <IconDotsVertical className="size-4 text-muted-foreground" />
            </button>
          }
        />
        <DropdownMenuContent align="end" side="bottom" className="w-52">
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
    </div>
  );
}

function TableMenuWrapper({
  editor,
  container,
}: {
  editor: Editor;
  container: HTMLElement;
}) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const wrapper = container.closest(".tableWrapper");
    if (!wrapper) return;

    const handleEnter = () => setIsHovered(true);
    const handleLeave = () => setIsHovered(false);

    wrapper.addEventListener("mouseenter", handleEnter);
    wrapper.addEventListener("mouseleave", handleLeave);

    return () => {
      wrapper.removeEventListener("mouseenter", handleEnter);
      wrapper.removeEventListener("mouseleave", handleLeave);
    };
  }, [container]);

  return createPortal(
    <TableMenu
      editor={editor}
      isHovered={isHovered}
      setIsHovered={setIsHovered}
    />,
    container
  );
}

function updateColumns(
  node: ProseMirrorNode,
  colgroup: HTMLElement,
  table: HTMLElement,
  cellMinWidth: number
) {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild as HTMLElement | null;
  const row = node.firstChild;

  if (row !== null) {
    for (let i = 0, col = 0; i < row.childCount; i += 1) {
      const { colspan, colwidth } = row.child(i).attrs;
      for (let j = 0; j < colspan; j += 1, col += 1) {
        const hasWidth = colwidth && (colwidth as number[])[j];
        const cssWidth = hasWidth ? `${hasWidth}px` : "";
        totalWidth += hasWidth || cellMinWidth;
        if (!hasWidth) {
          fixedWidth = false;
        }
        if (!nextDOM) {
          const colElement = document.createElement("col");
          if (hasWidth) {
            colElement.style.width = `${hasWidth}px`;
          } else {
            colElement.style.minWidth = `${cellMinWidth}px`;
          }
          colgroup.appendChild(colElement);
        } else {
          if (nextDOM.style.width !== cssWidth) {
            if (hasWidth) {
              nextDOM.style.width = `${hasWidth}px`;
              nextDOM.style.minWidth = "";
            } else {
              nextDOM.style.width = "";
              nextDOM.style.minWidth = `${cellMinWidth}px`;
            }
          }
          nextDOM = nextDOM.nextSibling as HTMLElement | null;
        }
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling as HTMLElement | null;
    nextDOM.parentNode?.removeChild(nextDOM);
    nextDOM = after;
  }

  if (fixedWidth) {
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = "";
  } else {
    table.style.width = "";
    table.style.minWidth = `${totalWidth}px`;
  }
}

class TableViewWithMenu {
  node: ProseMirrorNode;
  cellMinWidth: number;
  dom: HTMLElement;
  table: HTMLTableElement;
  colgroup: HTMLElement;
  contentDOM: HTMLElement;
  menuContainer: HTMLElement;
  editor: Editor;
  reactRoot: Root;

  constructor(node: ProseMirrorNode, cellMinWidth: number, editor: Editor) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.editor = editor;

    this.dom = document.createElement("div");
    this.dom.className = "tableWrapper relative overflow-x-auto my-4 pt-4 pr-4";

    this.menuContainer = document.createElement("div");
    this.menuContainer.className = "table-menu-container";
    this.menuContainer.contentEditable = "false";
    this.dom.appendChild(this.menuContainer);

    this.table = this.dom.appendChild(document.createElement("table"));
    this.table.className = "border-collapse w-full";

    this.colgroup = this.table.appendChild(document.createElement("colgroup"));
    updateColumns(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement("tbody"));

    this.reactRoot = createRoot(this.menuContainer);
    this.reactRoot.render(
      <TableMenuWrapper editor={editor} container={this.menuContainer} />
    );
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }

  destroy() {
    this.reactRoot.unmount();
  }

  ignoreMutation(
    mutation: MutationRecord | { type: "selection"; target: Node }
  ) {
    if (mutation.type === "selection") {
      return false;
    }
    const target = mutation.target as HTMLElement;
    if (this.menuContainer.contains(target)) {
      return true;
    }
    const isInsideWrapper = this.dom.contains(target);
    const isInsideContent = this.contentDOM.contains(target);
    if (isInsideWrapper && !isInsideContent) {
      return true;
    }
    return false;
  }
}

export const TableWithMenu = Table.extend({
  addNodeView() {
    return ({ node, editor }) => {
      const cellMinWidth = this.options.cellMinWidth || 80;
      return new TableViewWithMenu(node, cellMinWidth, editor);
    };
  },
});
