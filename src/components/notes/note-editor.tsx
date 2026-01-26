import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useConvex, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Audio from "@tiptap/extension-audio";
import Dropcursor from "@tiptap/extension-dropcursor";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { all, createLowlight } from "lowlight";
import { TableInsertButton } from "./table-menu";
import { TableWithMenu } from "./table-extension";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAsyncDebouncedCallback } from "@tanstack/react-pacer";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "motion/react";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconSourceCode,
  IconClearFormatting,
  IconSeparatorHorizontal,
  IconPhoto,
  IconMusic,
  IconArrowMergeAltLeft,
  IconLayoutBoardSplit,
} from "@tabler/icons-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type TiptapContent = {
  type: "doc";
  content?: Array<Record<string, unknown>>;
};

const DEFAULT_CONTENT: TiptapContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start writing here..." }],
    },
  ],
};

const lowlight = createLowlight(all);

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  ariaLabel,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="sm"
            pressed={isActive ?? false}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel ?? tooltip}
          />
        }
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {children}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function NoteEditor({
  noteId,
  initialContent,
  onSaveStatusChange,
}: {
  noteId: Id<"items">;
  initialContent: TiptapContent | undefined;
  onSaveStatusChange: (status: SaveStatus) => void;
}) {
  const convex = useConvex();
  const updateContentMutation = useConvexMutation(api.items.updateContent);
  const generateImageUploadUrl = useConvexMutation(
    api.items.generateImageUploadUrl
  );
  const generateAudioUploadUrl = useConvexMutation(
    api.items.generateAudioUploadUrl
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const debouncedSave = useAsyncDebouncedCallback(
    async (content: TiptapContent) => {
      onSaveStatusChange("saving");
      try {
        await updateContentMutation({ itemId: noteId, content });
        onSaveStatusChange("saved");
        setTimeout(() => onSaveStatusChange("idle"), 2000);
      } catch {
        onSaveStatusChange("error");
      }
    },
    { wait: 800 }
  );

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getJSON: () => TiptapContent } }) => {
      const json = editor.getJSON();
      debouncedSave(json);
    },
    [debouncedSave]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Dropcursor,
      TableWithMenu.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 80,
        lastColumnResizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            storageId: { default: null },
          };
        },
      }).configure({
        resize: {
          enabled: true,
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Audio.extend({
        addAttributes() {
          return {
            src: { default: null },
            storageId: { default: null },
          };
        },
      }).configure({
        controls: true,
        HTMLAttributes: {
          type: "audio/webm",
        },
        preload: "metadata",
      }),
    ],
    content: initialContent ?? DEFAULT_CONTENT,
    onUpdate: handleUpdate,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none prose-img:m-0 prose-img:transition-all prose-img:rounded-xl [&_.ProseMirror-selectednode_img]:outline-3 [&_.ProseMirror-selectednode_img]:outline-primary min-h-[500px] [&_[data-resize-handle]]:size-3 [&_[data-resize-state="true"]_img]:outline-neutral-800 [&_[data-resize-state="true"]_img]:outline [&_[data-resize-handle]]:bg-transparent [&_[data-resize-handle]]:rounded-lg [&_[data-resize-handle="top-left"]]:cursor-nwse-resize [&_[data-resize-handle="top-right"]]:cursor-nesw-resize [&_[data-resize-handle="bottom-left"]]:cursor-nesw-resize [&_[data-resize-handle="bottom-right"]]:cursor-nwse-resize prose-table:border-collapse prose-table:w-full prose-table:my-4 prose-table:overflow-hidden prose-table:rounded-md prose-table:[&_p]:m-0 prose-table:overflow-hidden prose-table:rounded-md prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:align-top prose-th:min-w-20 prose-th:bg-muted prose-th:font-medium prose-th:text-foreground prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-left prose-td:align-top prose-td:min-w-20 prose-td:bg-transparent [&_.selectedCell]:bg-primary/10 [&_.tableWrapper]:overflow-x-auto [&_.column-resize-handle]:pointer-events-none [&.resize-cursor]:cursor-col-resize',
      },
    },
  });

  const insertImage = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const uploadUrl = await generateImageUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) {
          throw new Error("Upload failed");
        }
        const { storageId } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        const url = await convex.query(api.items.getImageUrl, { storageId });
        if (!url) {
          throw new Error("Image URL unavailable");
        }
        editor?.chain().focus().setImage({ src: url }).run();
        const lastPos = editor?.state.selection.from;
        if (lastPos !== undefined) {
          const node = editor?.state.doc.nodeAt(lastPos - 1);
          if (node?.type?.name === "image") {
            editor
              ?.chain()
              .focus()
              .setNodeSelection(lastPos - 1)
              .updateAttributes("image", { storageId })
              .run();
          }
        }
      } catch {
        toast.error("Image upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [convex, editor, generateImageUploadUrl]
  );

  const handleImageUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("File must be an image.");
        return;
      }
      void insertImage(file);
      event.target.value = "";
    },
    [insertImage]
  );

  const insertAudio = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const uploadUrl = await generateAudioUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) {
          throw new Error("Upload failed");
        }
        const { storageId } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        const url = await convex.query(api.items.getImageUrl, { storageId });
        if (!url) {
          throw new Error("Audio URL unavailable");
        }
        const mimeType = file.type || "audio/webm";
        editor
          ?.chain()
          .focus()
          .setAudio({ src: url, HTMLAttributes: { type: mimeType } })
          .run();
        const lastPos = editor?.state.selection.from;
        if (lastPos !== undefined) {
          const node = editor?.state.doc.nodeAt(lastPos - 1);
          if (node?.type?.name === "audio") {
            editor
              ?.chain()
              .focus()
              .setNodeSelection(lastPos - 1)
              .updateAttributes("audio", {
                storageId,
                HTMLAttributes: { type: mimeType },
              })
              .run();
          }
        }
      } catch {
        toast.error("Audio upload failed.");
      } finally {
        setIsUploading(false);
      }
    },
    [convex, editor, generateAudioUploadUrl]
  );

  const handleAudioUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      const isAudio =
        file.type.startsWith("audio/") ||
        file.type === "video/webm" ||
        file.type === "audio/webm";
      if (!isAudio) {
        toast.error("File must be audio.");
        return;
      }
      void insertAudio(file);
      event.target.value = "";
    },
    [insertAudio]
  );

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) return null;
      return {
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isStrike: ctx.editor.isActive("strike"),
        isCode: ctx.editor.isActive("code"),
        isH1: ctx.editor.isActive("heading", { level: 1 }),
        isH2: ctx.editor.isActive("heading", { level: 2 }),
        isH3: ctx.editor.isActive("heading", { level: 3 }),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        isCodeBlock: ctx.editor.isActive("codeBlock"),
        isTable: ctx.editor.isActive("table"),
        canMergeCells: ctx.editor.can().mergeCells(),
        canSplitCell: ctx.editor.can().splitCell(),
      };
    },
    equalityFn: (prev, next) => {
      if (!prev || !next) return prev === next;
      return (
        prev.isBold === next.isBold &&
        prev.isItalic === next.isItalic &&
        prev.isStrike === next.isStrike &&
        prev.isCode === next.isCode &&
        prev.isH1 === next.isH1 &&
        prev.isH2 === next.isH2 &&
        prev.isH3 === next.isH3 &&
        prev.isBulletList === next.isBulletList &&
        prev.isOrderedList === next.isOrderedList &&
        prev.isBlockquote === next.isBlockquote &&
        prev.isCodeBlock === next.isCodeBlock &&
        prev.isTable === next.isTable &&
        prev.canMergeCells === next.canMergeCells &&
        prev.canSplitCell === next.canSplitCell
      );
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-125">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-125 py-4">
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-0.5"
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editorState?.isBold}
            tooltip="Bold"
          >
            <IconBold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editorState?.isItalic}
            tooltip="Italic"
          >
            <IconItalic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editorState?.isStrike}
            tooltip="Strikethrough"
          >
            <IconStrikethrough className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editorState?.isCode}
            tooltip="Code"
          >
            <IconCode className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editorState?.isH1}
            tooltip="Heading 1"
          >
            <IconH1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editorState?.isH2}
            tooltip="Heading 2"
          >
            <IconH2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editorState?.isH3}
            tooltip="Heading 3"
          >
            <IconH3 className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editorState?.isBulletList}
            tooltip="Bullet List"
          >
            <IconList className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            tooltip="Insert Image"
          >
            <IconPhoto className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => audioInputRef.current?.click()}
            disabled={isUploading}
            tooltip="Insert Audio"
          >
            <IconMusic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editorState?.isOrderedList}
            tooltip="Numbered List"
          >
            <IconListNumbers className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editorState?.isBlockquote}
            tooltip="Blockquote"
          >
            <IconQuote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editorState?.isCodeBlock}
            tooltip="Code Block"
          >
            <IconSourceCode className="size-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            tooltip="Clear Formatting"
          >
            <IconClearFormatting className="size-4" />
          </ToolbarButton>

          {editorState?.isTable && (editorState.canMergeCells || editorState.canSplitCell) && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              {editorState.canMergeCells && (
                <ToolbarButton
                  onClick={() => editor.chain().focus().mergeCells().run()}
                  tooltip="Merge Cells"
                >
                  <IconArrowMergeAltLeft className="size-4" />
                </ToolbarButton>
              )}
              {editorState.canSplitCell && (
                <ToolbarButton
                  onClick={() => editor.chain().focus().splitCell().run()}
                  tooltip="Split Cell"
                >
                  <IconLayoutBoardSplit className="size-4" />
                </ToolbarButton>
              )}
            </>
          )}
        </motion.div>
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-0.5"
        >
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editorState?.isH1}
          tooltip="Heading 1"
        >
          <IconH1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editorState?.isH2}
          tooltip="Heading 2"
        >
          <IconH2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editorState?.isH3}
          tooltip="Heading 3"
        >
          <IconH3 className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editorState?.isBulletList}
          tooltip="Bullet List"
        >
          <IconList className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          tooltip="Insert Image"
        >
          <IconPhoto className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => audioInputRef.current?.click()}
          disabled={isUploading}
          tooltip="Insert Audio"
        >
          <IconMusic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editorState?.isOrderedList}
          tooltip="Numbered List"
        >
          <IconListNumbers className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editorState?.isBlockquote}
          tooltip="Blockquote"
        >
          <IconQuote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editorState?.isCodeBlock}
          tooltip="Code Block"
        >
          <IconSourceCode className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="Horizontal Rule"
        >
          <IconSeparatorHorizontal className="size-4" />
        </ToolbarButton>

        <TableInsertButton editor={editor} />
        </motion.div>
      </FloatingMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
      />
      <EditorContent editor={editor} />
    </div>
  );
}
