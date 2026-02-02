import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  IconFileText,
  IconNotes,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import {
  NoteEditor,
  type SaveStatus,
} from "@/components/notes/note-editor";
import { FolderSidebar } from "@/components/notes/folder-sidebar";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/_app/notes")({
  validateSearch: (search: Record<string, unknown>) => ({
    parentId: (search.parentId as string) || undefined,
    noteId: (search.noteId as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({
    parentId: search.parentId,
    noteId: search.noteId,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.auth.getCurrentUser, {})
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.items.listByParent, {
          parentId: deps.parentId as Id<"items"> | undefined,
        })
      ),
    ]);

    if (deps.parentId) {
      await context.queryClient.ensureQueryData(
        convexQuery(api.items.get, {
          itemId: deps.parentId as Id<"items">,
        })
      );
    }

    if (deps.noteId) {
      await context.queryClient.ensureQueryData(
        convexQuery(api.items.get, { itemId: deps.noteId as Id<"items"> })
      );
    }
  },
  component: NotesPage,
});

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status === "saving" && (
        <motion.div
          key="saving"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={springTransition}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Spinner className="size-3.5" />
          </motion.div>
          <span>Saving...</span>
        </motion.div>
      )}
      {status === "saved" && (
        <motion.div
          key="saved"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={springTransition}
          className="flex items-center gap-1.5 text-xs"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <IconCheck className="size-3.5 text-green-500" />
          </motion.div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600"
          >
            Saved
          </motion.span>
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          key="error"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={springTransition}
          className="flex items-center gap-1.5 text-xs"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <IconAlertCircle className="size-3.5 text-destructive" />
          </motion.div>
          <span className="text-destructive">Error saving</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NoteEditorPanel({
  noteId,
  saveStatus,
  onSaveStatusChange,
}: {
  noteId: Id<"items">;
  saveStatus: SaveStatus;
  onSaveStatusChange: (status: SaveStatus) => void;
}) {
  const { data: note } = useSuspenseQuery(
    convexQuery(api.items.get, { itemId: noteId })
  );

  if (!note) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springTransition}
        className="flex-1 flex items-center justify-center"
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <IconFileText />
              </motion.div>
            </EmptyMedia>
            <EmptyTitle>Note not found</EmptyTitle>
            <EmptyDescription>
              This note may have been deleted.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={noteId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="flex-1 flex flex-col m-6"
    >
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="flex items-center bg-white justify-between h-11 rounded-lg px-4 shrink-0"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-medium text-sm truncate"
          >
            {note.title}
          </motion.span>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-xs text-muted-foreground truncate"
        >
          {formatDistanceToNow(new Date(note.updatedAt), {
            addSuffix: true,
          })}
        </motion.p>
      </motion.header>
      <div className="flex-1 overflow-auto pb-22">
        <NoteEditor
          key={noteId}
          noteId={noteId}
          initialContent={note.content as string}
          onSaveStatusChange={onSaveStatusChange}
        />
      </div>
    </motion.div>
  );
}

function EmptyEditorPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
      className="flex-1 flex items-center justify-center bg-muted/10"
    >
      <Empty>
        <EmptyHeader>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <EmptyMedia variant="icon">
              <IconNotes />
            </EmptyMedia>
          </motion.div>
          <EmptyTitle>Select a note</EmptyTitle>
          <EmptyDescription>
            Choose a note from the sidebar or create a new one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </motion.div>
  );
}

function NotesPage() {
  const { parentId, noteId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const activeNoteId = noteId;

  const handleSelectNote = (newNoteId: Id<"items">) => {
    navigate({
      search: { parentId, noteId: newNoteId },
    });
  };

  const handleNavigateFolder = (newParentId?: Id<"items">) => {
    navigate({
      search: { parentId: newParentId, noteId: activeNoteId || undefined },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springTransition}
      className="flex h-screen max-w-7xl mx-auto"
    >
      <FolderSidebar
        currentParentId={parentId as Id<"items"> | undefined}
        selectedNoteId={activeNoteId as Id<"items"> | undefined}
        onSelectNote={handleSelectNote}
        onNavigateFolder={handleNavigateFolder}
      />
      <div className="flex flex-1">
        <AnimatePresence mode="wait">
          {activeNoteId ? (
            <NoteEditorPanel
              key={activeNoteId}
              noteId={activeNoteId as Id<"items">}
              saveStatus={saveStatus}
              onSaveStatusChange={setSaveStatus}
            />
          ) : (
            <EmptyEditorPanel key="empty" />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
