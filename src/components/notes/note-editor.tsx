import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useConvex, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAsyncDebouncedCallback } from "@tanstack/react-pacer";
import { Spinner } from "@/components/ui/spinner";
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
        {children}
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
  noteId: Id<"notes">;
  initialContent: TiptapContent | undefined;
  onSaveStatusChange: (status: SaveStatus) => void;
}) {
  const convex = useConvex();
  const updateContentMutation = useConvexMutation(api.notes.updateContent);
  const generateImageUploadUrl = useConvexMutation(
    api.notes.generateImageUploadUrl
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const debouncedSave = useAsyncDebouncedCallback(
    async (content: TiptapContent) => {
      onSaveStatusChange("saving");
      try {
        await updateContentMutation({ noteId, content });
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
      StarterKit,
      Image.extend({
        addAttributes() {
          return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            storageId: { default: null },
          };
        },
      }),
    ],
    content: initialContent ?? DEFAULT_CONTENT,
    onUpdate: handleUpdate,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
      },
    },
  });

  const insertImage = useCallback(
    async (file: File) => {
      setUploadError(null);
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
        const url = await convex.query(api.notes.getImageUrl, { storageId });
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
        setUploadError("Image upload failed.");
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
        setUploadError("File must be an image.");
        return;
      }
      void insertImage(file);
      event.target.value = "";
    },
    [insertImage]
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
        prev.isCodeBlock === next.isCodeBlock
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
    <div className="relative w-full min-h-125 px-6 py-8">
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg"
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
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg"
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
      </FloatingMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      {uploadError ? (
        <p className="mt-2 text-pretty text-xs text-destructive" role="alert">
          {uploadError}
        </p>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
