import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  IconArrowLeft,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconFileOff,
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
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { useState, useTransition, useCallback } from "react";
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

export const Route = createFileRoute("/_app/notes/$noteId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.notes.get, { noteId: params.noteId as Id<"notes"> })
    );
  },
  component: NotePage,
});

type SaveStatus = "idle" | "saving" | "saved" | "error";

type TiptapContent = {
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

function NoteEditor({
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
        await updateContentMutation({
          noteId,
          content,
        });
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
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg"
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
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg"
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

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "saving" && (
        <>
          <Spinner className="size-3.5" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <IconCheck className="size-3.5 text-green-500" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <IconAlertCircle className="size-3.5 text-destructive" />
          <span className="text-destructive">Error saving</span>
        </>
      )}
    </div>
  );
}

function NoteNavbar({
  title,
  saveStatus,
  onDelete,
}: {
  title: string;
  saveStatus: SaveStatus;
  onDelete: () => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      await onDelete();
      setShowDeleteDialog(false);
    });
  };

  return (
    <>
      <header className="flex items-center justify-between border-dashed border-b border-border bg-background/50 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link to="/notes" />}>
            <IconArrowLeft className="size-4" />
          </Button>
          <span className="font-medium text-sm truncate max-w-50">{title}</span>
          <SaveStatusIndicator status={saveStatus} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      </header>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Spinner />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NotFoundState() {
  return (
    <Empty className="py-24 px-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFileOff />
        </EmptyMedia>
        <EmptyTitle>Note not found</EmptyTitle>
        <EmptyDescription>
          This note may have been deleted or doesn't exist.
        </EmptyDescription>
      </EmptyHeader>
      <Button render={<Link to="/notes" />}>Back to notes</Button>
    </Empty>
  );
}

function NotePage() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const { data: note } = useSuspenseQuery(
    convexQuery(api.notes.get, { noteId: noteId as Id<"notes"> })
  );

  const removeMutation = useConvexMutation(api.notes.remove);

  const handleDelete = async () => {
    await removeMutation({ noteId: noteId as Id<"notes"> });
    navigate({ to: "/notes" });
  };

  if (!note) {
    return (
      <div className="flex min-h-screen max-w-4xl mx-auto border-x border-dashed flex-col">
        <header className="flex items-center justify-between border-dashed border-b border-border bg-background/50 backdrop-blur-sm px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" render={<Link to="/notes" />}>
              <IconArrowLeft className="size-4" />
            </Button>
          </div>
        </header>
        <NotFoundState />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen max-w-4xl mx-auto border-x border-dashed flex-col">
      <NoteNavbar
        title={note.title}
        saveStatus={saveStatus}
        onDelete={handleDelete}
      />
      <div className="flex-1 overflow-auto">
        <NoteEditor
          key={noteId}
          noteId={noteId as Id<"notes">}
          initialContent={note.content as TiptapContent}
          onSaveStatusChange={setSaveStatus}
        />
        <div className="h-24" />
      </div>
    </div>
  );
}
