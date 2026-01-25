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
  type TiptapContent,
} from "@/components/notes/note-editor";
import { FolderSidebar } from "@/components/notes/folder-sidebar";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notes")({
  validateSearch: (search: Record<string, unknown>) => ({
    folderId: (search.folderId as string) || undefined,
    noteId: (search.noteId as string) || undefined,
  }),
  loaderDeps: ({ search }) => ({
    folderId: search.folderId,
    noteId: search.noteId,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.auth.getCurrentUser, {})
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.folders.listByParent, {
          parentId: deps.folderId as Id<"folders"> | undefined,
        })
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.notes.listByFolder, {
          folderId: deps.folderId as Id<"folders"> | undefined,
        })
      ),
    ]);

    if (deps.folderId) {
      await context.queryClient.ensureQueryData(
        convexQuery(api.folders.get, {
          folderId: deps.folderId as Id<"folders">,
        })
      );
    }

    if (deps.noteId) {
      await context.queryClient.ensureQueryData(
        convexQuery(api.notes.get, { noteId: deps.noteId as Id<"notes"> })
      );
    }
  },
  component: NotesPage,
});

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

function NoteEditorPanel({
  noteId,
  saveStatus,
  onSaveStatusChange,
}: {
  noteId: Id<"notes">;
  saveStatus: SaveStatus;
  onSaveStatusChange: (status: SaveStatus) => void;
}) {
  const { data: note } = useSuspenseQuery(
    convexQuery(api.notes.get, { noteId })
  );

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconFileText />
            </EmptyMedia>
            <EmptyTitle>Note not found</EmptyTitle>
            <EmptyDescription>
              This note may have been deleted.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col m-6">
      <header className="flex items-center bg-white justify-between h-11 rounded-lg px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm truncate">{note.title}</span>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {formatDistanceToNow(new Date(note.updatedAt), {
            addSuffix: true,
          })}
        </p>
      </header>
      <div className="flex-1 overflow-auto pb-22">
        <NoteEditor
          key={noteId}
          noteId={noteId}
          initialContent={note.content as TiptapContent}
          onSaveStatusChange={onSaveStatusChange}
        />
      </div>
    </div>
  );
}

function EmptyEditorPanel() {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted/10">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconNotes />
          </EmptyMedia>
          <EmptyTitle>Select a note</EmptyTitle>
          <EmptyDescription>
            Choose a note from the sidebar or create a new one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

function NotesPage() {
  const { folderId, noteId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const activeNoteId = noteId;

  const handleSelectNote = (newNoteId: Id<"notes">) => {
    navigate({
      search: { folderId, noteId: newNoteId },
    });
  };

  const handleNavigateFolder = (newFolderId?: Id<"folders">) => {
    navigate({
      search: { folderId: newFolderId, noteId: activeNoteId || undefined },
    });
  };

  return (
    <div className="flex h-screen max-w-7xl mx-auto">
      <FolderSidebar
        currentFolderId={folderId as Id<"folders"> | undefined}
        selectedNoteId={activeNoteId as Id<"notes"> | undefined}
        onSelectNote={handleSelectNote}
        onNavigateFolder={handleNavigateFolder}
      />
      {activeNoteId ? (
        <NoteEditorPanel
          noteId={activeNoteId as Id<"notes">}
          saveStatus={saveStatus}
          onSaveStatusChange={setSaveStatus}
        />
      ) : (
        <EmptyEditorPanel />
      )}
    </div>
  );
}
