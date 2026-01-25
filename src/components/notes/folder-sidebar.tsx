import { useTransition, useState, useRef, useEffect } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IconPlus,
  IconTrash,
  IconLogout,
  IconFileText,
  IconDots,
  IconFolder,
  IconFolderPlus,
  IconChevronLeft,
  IconPencil,
  IconNotes,
  IconSparkles2,
} from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/integrations/better-auth/auth-client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function FolderSidebar({
  currentFolderId,
  selectedNoteId,
  onSelectNote,
  onNavigateFolder,
}: {
  currentFolderId?: Id<"folders">;
  selectedNoteId?: Id<"notes">;
  onSelectNote: (noteId: Id<"notes">) => void;
  onNavigateFolder: (folderId?: Id<"folders">) => void;
}) {
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isCreatingNote, startCreateNoteTransition] = useTransition();
  const [isCreatingFolder, startCreateFolderTransition] = useTransition();
  const [isDeletingNote, startDeleteNoteTransition] = useTransition();
  const [isDeletingFolder, startDeleteFolderTransition] = useTransition();
  const [isRenamingFolder, startRenameFolderTransition] = useTransition();

  const [noteToDelete, setNoteToDelete] = useState<Doc<"notes"> | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Doc<"folders"> | null>(
    null
  );
  const [folderToRename, setFolderToRename] = useState<Doc<"folders"> | null>(
    null
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );
  const prevFolderIdRef = useRef<Id<"folders"> | undefined>(currentFolderId);

  useEffect(() => {
    if (prevFolderIdRef.current !== currentFolderId) {
      prevFolderIdRef.current = currentFolderId;
    }
  }, [currentFolderId]);

  const { data: currentFolder } = useQuery(
    convexQuery(api.folders.get, {
      folderId: currentFolderId as Id<"folders">,
    })
  );

  const { data: folders } = useSuspenseQuery(
    convexQuery(api.folders.listByParent, { parentId: currentFolderId })
  );

  const { data: notes } = useSuspenseQuery(
    convexQuery(api.notes.listByFolder, { folderId: currentFolderId })
  );

  const createNoteMutation = useConvexMutation(api.notes.create);
  const removeNoteMutation = useConvexMutation(api.notes.remove);
  const createFolderMutation = useConvexMutation(api.folders.create);
  const removeFolderMutation = useConvexMutation(api.folders.remove);
  const updateFolderMutation = useConvexMutation(api.folders.update);

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await authClient.signOut({
        fetchOptions: { onSuccess: () => location.reload() },
      });
    });
  };

  const handleCreateNote = () => {
    startCreateNoteTransition(async () => {
      const newNoteId = await createNoteMutation({ folderId: currentFolderId });
      onSelectNote(newNoteId);
    });
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    startCreateFolderTransition(async () => {
      await createFolderMutation({
        name: folderName.trim(),
        parentId: currentFolderId,
      });
      setFolderName("");
      setShowNewFolderDialog(false);
    });
  };

  const handleDeleteNote = () => {
    if (!noteToDelete) return;
    startDeleteNoteTransition(async () => {
      await removeNoteMutation({ noteId: noteToDelete._id });
      setNoteToDelete(null);
    });
  };

  const handleDeleteFolder = () => {
    if (!folderToDelete) return;
    startDeleteFolderTransition(async () => {
      await removeFolderMutation({ folderId: folderToDelete._id });
      setFolderToDelete(null);
    });
  };

  const handleRenameFolder = () => {
    if (!folderToRename || !newFolderName.trim()) return;
    startRenameFolderTransition(async () => {
      await updateFolderMutation({
        folderId: folderToRename._id,
        name: newFolderName.trim(),
      });
      setFolderToRename(null);
      setNewFolderName("");
    });
  };

  const openRenameDialog = (folder: Doc<"folders">) => {
    setFolderToRename(folder);
    setNewFolderName(folder.name);
  };

  const handleGoBack = () => {
    setSlideDirection("right");
    if (currentFolder?.parentId) {
      onNavigateFolder(currentFolder.parentId);
    } else {
      onNavigateFolder(undefined);
    }
  };

  const handleNavigateIntoFolder = (folderId: Id<"folders">) => {
    setSlideDirection("left");
    onNavigateFolder(folderId);
  };

  const slideVariants = {
    enter: (direction: "left" | "right") => ({
      x: direction === "left" ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "left" | "right") => ({
      x: direction === "left" ? -50 : 50,
      opacity: 0,
    }),
  };

  const springTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  };

  return (
    <>
      <div className="w-72 flex flex-col m-6 gap-4">
        <header className="flex bg-white rounded-lg items-center justify-between p-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {currentFolderId ? (
                <motion.div
                  key="back-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springTransition}
                >
                  <Button variant="ghost" size="icon" onClick={handleGoBack}>
                    <IconChevronLeft />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="home-icon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={springTransition}
                >
                  <IconSparkles2 className="text-muted-foreground size-5 ml-3" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentFolderId ?? "root"}
                initial={{
                  opacity: 0,
                  x: slideDirection === "left" ? 10 : -10,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === "left" ? -10 : 10 }}
                transition={springTransition}
                className="text-sm font-medium truncate"
              >
                {currentFolder?.name ?? "Recallable"}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <IconPlus />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleCreateNote}
                  disabled={isCreatingNote}
                >
                  {isCreatingNote ? <Spinner /> : <IconFileText />}
                  New Note
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setFolderName("");
                    setShowNewFolderDialog(true);
                  }}
                  disabled={isCreatingFolder}
                >
                  {isCreatingFolder ? <Spinner /> : <IconFolderPlus />}
                  New Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Avatar>
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
                  <IconLogout />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative bg-white rounded-lg">
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={currentFolderId ?? "root"}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              className="absolute inset-0 overflow-auto"
            >
              {folders.length === 0 && notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <IconNotes className="size-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Create a note or folder
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {folders.map((folder, index) => (
                    <motion.div
                      key={folder._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...springTransition,
                        delay: index * 0.03,
                      }}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 cursor-pointer"
                      onClick={() => handleNavigateIntoFolder(folder._id)}
                    >
                      <IconFolder className="size-4 shrink-0" />
                      <span className="text-sm truncate flex-1">
                        {folder.name}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDots />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openRenameDialog(folder);
                            }}
                          >
                            <IconPencil />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderToDelete(folder);
                            }}
                          >
                            <IconTrash />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  ))}

                  {notes.map((note, index) => (
                    <motion.div
                      key={note._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...springTransition,
                        delay: (folders.length + index) * 0.03,
                      }}
                      className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
                        selectedNoteId === note._id
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-accent"
                      )}
                      onClick={() => onSelectNote(note._id)}
                    >
                      <IconFileText className="size-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-inherit">
                          {note.title}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="opacity-0 group-hover:opacity-100 size-6"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconDots className="size-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteToDelete(note);
                            }}
                          >
                            <IconTrash />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-sm">
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

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your notes.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !folderName.trim()}
            >
              {isCreatingFolder && <Spinner />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!folderToRename}
        onOpenChange={(open) => !open && setFolderToRename(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderToRename(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={isRenamingFolder || !newFolderName.trim()}
            >
              {isRenamingFolder && <Spinner />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={(open) => !open && setNoteToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingNote}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteNote}
              disabled={isDeletingNote}
            >
              {isDeletingNote && <Spinner />}
              {isDeletingNote ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"? Contents
              will be moved to the parent folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFolder}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={isDeletingFolder}
            >
              {isDeletingFolder && <Spinner />}
              {isDeletingFolder ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
