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
import { IconPlus } from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/integrations/better-auth/auth-client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import IconFolder2BoldDuotone from "~icons/solar/folder-2-bold-duotone";
import IconDocumentBoldDuotone from "~icons/solar/document-bold-duotone";
import IconStarsBoldDuotone from "~icons/solar/stars-bold-duotone";
import IconDocumentAddBoldDuotone from "~icons/solar/document-add-bold-duotone";
import IconAddFolderBoldDuotone from "~icons/solar/add-folder-bold-duotone";
import IconTrashBinTrashBoldDuotone from "~icons/solar/trash-bin-trash-bold-duotone";
import IconPenBoldDuotone from "~icons/solar/pen-bold-duotone";
import IconLogout2BoldDuotone from "~icons/solar/logout-2-bold-duotone";
import IconMenuDotsBoldDuotone from "~icons/solar/menu-dots-bold-duotone";
import IconSadCircleBoldDuotone from "~icons/solar/sad-circle-bold-duotone";
import { DndContextProvider } from "./dnd/dnd-context-provider";
import { DraggableItem } from "./dnd/draggable-item";
import { DroppableFolder } from "./dnd/droppable-folder";
import { ParentDropZone } from "./dnd/parent-drop-zone";
import type { DragData, FolderDragData, NoteDragData } from "./dnd/types";
import { useDndMonitor } from "@dnd-kit/core";

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
  const moveFolderMutation = useConvexMutation(api.folders.move);
  const updateNoteFolderMutation = useConvexMutation(api.notes.updateFolder);

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

  const handleMoveNote = (
    noteId: string,
    targetFolderId: string | undefined
  ) => {
    updateNoteFolderMutation({
      noteId: noteId as Id<"notes">,
      folderId: targetFolderId as Id<"folders"> | undefined,
    });
  };

  const handleMoveFolder = (
    folderId: string,
    targetParentId: string | undefined
  ) => {
    moveFolderMutation({
      folderId: folderId as Id<"folders">,
      parentId: targetParentId as Id<"folders"> | undefined,
    });
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
      <DndContextProvider
        onMoveNote={handleMoveNote}
        onMoveFolder={handleMoveFolder}
      >
        <FolderSidebarContent
          currentFolderId={currentFolderId}
          currentFolder={currentFolder}
          folders={folders}
          notes={notes}
          selectedNoteId={selectedNoteId}
          slideDirection={slideDirection}
          slideVariants={slideVariants}
          springTransition={springTransition}
          isCreatingNote={isCreatingNote}
          isCreatingFolder={isCreatingFolder}
          onSelectNote={onSelectNote}
          onNavigateIntoFolder={handleNavigateIntoFolder}
          onGoBack={handleGoBack}
          onCreateNote={handleCreateNote}
          onCreateFolder={() => {
            setFolderName("");
            setShowNewFolderDialog(true);
          }}
          onDeleteNote={setNoteToDelete}
          onDeleteFolder={setFolderToDelete}
          onRenameFolder={openRenameDialog}
          onShowLogoutDialog={() => setShowLogoutDialog(true)}
        />
      </DndContextProvider>

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

function FolderSidebarContent({
  currentFolderId,
  currentFolder,
  folders,
  notes,
  selectedNoteId,
  slideDirection,
  slideVariants,
  springTransition,
  isCreatingNote,
  isCreatingFolder,
  onSelectNote,
  onNavigateIntoFolder,
  onGoBack,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onDeleteFolder,
  onRenameFolder,
  onShowLogoutDialog,
}: {
  currentFolderId?: Id<"folders">;
  currentFolder: Doc<"folders"> | null | undefined;
  folders: Doc<"folders">[];
  notes: Doc<"notes">[];
  selectedNoteId?: Id<"notes">;
  slideDirection: "left" | "right";
  slideVariants: {
    enter: (direction: "left" | "right") => { x: number; opacity: number };
    center: { x: number; opacity: number };
    exit: (direction: "left" | "right") => { x: number; opacity: number };
  };
  springTransition: { type: "spring"; stiffness: number; damping: number };
  isCreatingNote: boolean;
  isCreatingFolder: boolean;
  onSelectNote: (noteId: Id<"notes">) => void;
  onNavigateIntoFolder: (folderId: Id<"folders">) => void;
  onGoBack: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onDeleteNote: (note: Doc<"notes">) => void;
  onDeleteFolder: (folder: Doc<"folders">) => void;
  onRenameFolder: (folder: Doc<"folders">) => void;
  onShowLogoutDialog: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeItem, setActiveItem] = useState<DragData | null>(null);

  useDndMonitor({
    onDragStart: (event) => {
      setIsDragging(true);
      setActiveItem(event.active.data.current as DragData);
    },
    onDragEnd: () => {
      setIsDragging(false);
      setActiveItem(null);
    },
    onDragCancel: () => {
      setIsDragging(false);
      setActiveItem(null);
    },
  });

  return (
    <div className="w-72 flex flex-col m-6 gap-4">
      <header className="flex bg-white rounded-lg items-center justify-between p-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <IconStarsBoldDuotone className="text-primary size-5 ml-3" />
          <span className="text-sm font-medium truncate">Recallable</span>
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
                onClick={onCreateNote}
                disabled={isCreatingNote}
              >
                {isCreatingNote ? (
                  <Spinner />
                ) : (
                  <IconDocumentAddBoldDuotone className="text-foreground/60" />
                )}
                New Note
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onCreateFolder}
                disabled={isCreatingFolder}
              >
                {isCreatingFolder ? (
                  <Spinner />
                ) : (
                  <IconAddFolderBoldDuotone className="text-foreground/60" />
                )}
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
                onClick={onShowLogoutDialog}
              >
                <IconLogout2BoldDuotone className="text-foreground/60" />
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
            <ParentDropZone
              targetFolderId={currentFolder?.parentId}
              isVisible={!!currentFolderId}
              isDragging={isDragging}
              currentFolderName={currentFolder?.name}
              onNavigateBack={onGoBack}
            />

            {folders.length === 0 && notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <IconSadCircleBoldDuotone className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground/70">
                  Create a note or folder
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {folders.map((folder, index) => {
                  const folderData: FolderDragData = {
                    type: "folder",
                    folderId: folder._id,
                    name: folder.name,
                    parentId: folder.parentId,
                  };

                  return (
                    <DroppableFolder
                      key={folder._id}
                      id={`droppable-folder-${folder._id}`}
                      folderId={folder._id}
                      activeItem={activeItem}
                    >
                      <DraggableItem
                        id={`draggable-folder-${folder._id}`}
                        data={folderData}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            ...springTransition,
                            delay: index * 0.03,
                          }}
                          className={cn(
                            "group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 cursor-grab active:cursor-grabbing",
                            isDragging &&
                              activeItem?.type === "folder" &&
                              (activeItem as FolderDragData).folderId ===
                                folder._id &&
                              "opacity-50"
                          )}
                          onClick={() => onNavigateIntoFolder(folder._id)}
                        >
                          <IconFolder2BoldDuotone className="size-4 text-foreground/60 shrink-0" />
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
                                  <IconMenuDotsBoldDuotone className="text-foreground/60" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRenameFolder(folder);
                                }}
                              >
                                <IconPenBoldDuotone className="text-foreground/60" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFolder(folder);
                                }}
                              >
                                <IconTrashBinTrashBoldDuotone className="text-foreground/60" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      </DraggableItem>
                    </DroppableFolder>
                  );
                })}

                {notes.map((note, index) => {
                  const noteData: NoteDragData = {
                    type: "note",
                    noteId: note._id,
                    title: note.title,
                    currentFolderId: note.folderId,
                  };

                  return (
                    <DraggableItem
                      key={note._id}
                      id={`draggable-note-${note._id}`}
                      data={noteData}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          ...springTransition,
                          delay: (folders.length + index) * 0.03,
                        }}
                        className={cn(
                          "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing",
                          selectedNoteId === note._id
                            ? "bg-secondary text-secondary-foreground"
                            : "hover:bg-accent/30",
                          isDragging &&
                            activeItem?.type === "note" &&
                            (activeItem as NoteDragData).noteId === note._id &&
                            "opacity-50"
                        )}
                        onClick={() => onSelectNote(note._id)}
                      >
                        <IconDocumentBoldDuotone className="size-4 text-foreground/60 shrink-0" />
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
                                size="icon-xs"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconMenuDotsBoldDuotone className="text-foreground/60" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note);
                              }}
                            >
                              <IconTrashBinTrashBoldDuotone className="text-foreground/60" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    </DraggableItem>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
