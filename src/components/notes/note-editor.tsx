import { useCallback } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
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
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
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
  const updateContentMutation = useConvexMutation(api.notes.updateContent);

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
    extensions: [StarterKit],
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

      <EditorContent editor={editor} />
    </div>
  );
}
