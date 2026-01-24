import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  IconPlus,
  IconTrash,
  IconLogout,
  IconFileText,
  IconDots,
} from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import { useTransition, useState } from "react";
import { authClient } from "@/integrations/better-auth/auth-client";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notes/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.auth.getCurrentUser, {})
      ),
      context.queryClient.ensureQueryData(convexQuery(api.notes.list, {})),
    ]);
  },
  component: NotesPage,
});

function NoteCard({
  note,
  onDelete,
}: {
  note: Doc<"notes">;
  onDelete: (note: Doc<"notes">) => void;
}) {
  const contentPreview = getContentPreview(note.content);

  return (
    <div className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all">
      <Link
        to="/notes/$noteId"
        params={{ noteId: note._id }}
        className="block p-4"
      >
        <h3 className="font-medium text-foreground mb-2 line-clamp-1">
          {note.title}
        </h3>
        {contentPreview && (
          <div className="relative">
            <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
              {contentPreview}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-card to-transparent pointer-events-none" />
          </div>
        )}
        <p className="text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(note.updatedAt), {
            addSuffix: true,
          })}
        </p>
      </Link>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm">
                <IconDots className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete(note);
              }}
            >
              <IconTrash className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function getContentPreview(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;

  const doc = content as {
    type?: string;
    content?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (doc.type === "doc" && Array.isArray(doc.content)) {
    const textParts: string[] = [];

    for (const node of doc.content) {
      if (node.content && Array.isArray(node.content)) {
        for (const inline of node.content) {
          if (inline.type === "text" && inline.text) {
            const text = inline.text.trim();
            if (text && text !== "Start writing here...") {
              textParts.push(text);
            }
          }
        }
      }
    }

    return textParts.length > 0 ? textParts.join(" ") : null;
  }

  const blocks = Object.values(content as Record<string, unknown>);
  const textParts: string[] = [];

  for (const block of blocks) {
    if (
      block &&
      typeof block === "object" &&
      "value" in block &&
      Array.isArray((block as { value: unknown[] }).value)
    ) {
      for (const element of (block as { value: unknown[] }).value) {
        if (
          element &&
          typeof element === "object" &&
          "children" in element &&
          Array.isArray((element as { children: unknown[] }).children)
        ) {
          for (const child of (element as { children: unknown[] }).children) {
            if (child && typeof child === "object" && "text" in child) {
              const text = (child as { text: string }).text.trim();
              if (
                text &&
                text !==
                  "Start writing here. Type '/' to open the command menu."
              ) {
                textParts.push(text);
              }
            }
          }
        }
      }
    }
  }

  return textParts.length > 0 ? textParts.join(" ") : null;
}

function ListNavbar() {
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => location.reload(),
        },
      });
    });
  };

  return (
    <>
      <header className="flex items-center justify-between border-dashed border-b border-border bg-background/50 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">My Notes</h1>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-full"
              render={
                <Button variant="ghost" size="icon-sm" className="rounded-full">
                  <Avatar size="sm">
                    <AvatarImage src="https://github.com/kimmyxpow.png" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowLogoutDialog(true)}
              >
                <IconLogout className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign in again to access your notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({
  onCreateNote,
  isCreating,
}: {
  onCreateNote: () => void;
  isCreating: boolean;
}) {
  return (
    <Empty className="py-24 px-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFileText />
        </EmptyMedia>
        <EmptyTitle>No notes yet</EmptyTitle>
        <EmptyDescription>
          Create your first note to start writing and organizing your thoughts.
        </EmptyDescription>
      </EmptyHeader>
      <Button onClick={onCreateNote} disabled={isCreating}>
        {isCreating ? <Spinner /> : <IconPlus />}
        {isCreating ? "Creating..." : "Create your first note"}
      </Button>
    </Empty>
  );
}

function NotesGrid() {
  const navigate = useNavigate();
  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [noteToDelete, setNoteToDelete] = useState<Doc<"notes"> | null>(null);

  const { data: notes } = useSuspenseQuery(convexQuery(api.notes.list, {}));

  const createMutation = useConvexMutation(api.notes.create);
  const removeMutation = useConvexMutation(api.notes.remove);

  const handleCreate = () => {
    startCreateTransition(async () => {
      const newNoteId = await createMutation({});
      navigate({ to: "/notes/$noteId", params: { noteId: newNoteId } });
    });
  };

  const handleDelete = () => {
    if (!noteToDelete) return;
    startDeleteTransition(async () => {
      await removeMutation({ noteId: noteToDelete._id });
      setNoteToDelete(null);
    });
  };

  if (notes.length === 0) {
    return <EmptyState onCreateNote={handleCreate} isCreating={isCreating} />;
  }

  return (
    <>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={handleCreate}
            disabled={isCreating}
            className="rounded-xl border-2 border-dashed hover:border-primary/50 bg-card/50 hover:bg-card h-auto flex-col gap-2 min-h-[120px]"
          >
            {isCreating ? (
              <Spinner className="size-6 text-muted-foreground" />
            ) : (
              <IconPlus className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">New note</span>
          </Button>

          {notes.map((note) => (
            <NoteCard key={note._id} note={note} onDelete={setNoteToDelete} />
          ))}
        </div>
      </div>

      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={(open) => !open && setNoteToDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This
              action cannot be undone.
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

function NotesPage() {
  return (
    <div className="flex min-h-screen max-w-4xl mx-auto border-x border-dashed flex-col">
      <ListNavbar />
      <div className="flex-1 overflow-auto">
        <NotesGrid />
      </div>
    </div>
  );
}
