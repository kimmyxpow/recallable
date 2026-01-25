import { useTransition, useState, useRef, useEffect } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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

type Item = {
  _id: Id<"items">;
  type: "folder" | "note";
  title: string;
  parentId?: Id<"items">;
  createdAt: number;
  updatedAt: number;
};

export function FolderSidebar({
  currentParentId,
  selectedNoteId,
  onSelectNote,
  onNavigateFolder,
}: {
  currentParentId?: Id<"items">;
  selectedNoteId?: Id<"items">;
  onSelectNote: (noteId: Id<"items">) => void;
  onNavigateFolder: (parentId?: Id<"items">) => void;
}) {
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isCreatingNote, startCreateNoteTransition] = useTransition();
  const [isCreatingFolder, startCreateFolderTransition] = useTransition();
  const [isDeletingItem, startDeleteItemTransition] = useTransition();
  const [isRenamingItem, startRenameItemTransition] = useTransition();

  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [itemToRename, setItemToRename] = useState<Item | null>(null);
  const [newName, setNewName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");

  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "left"
  );
  const prevParentIdRef = useRef<Id<"items"> | undefined>(currentParentId);

  useEffect(() => {
    if (prevParentIdRef.current !== currentParentId) {
      prevParentIdRef.current = currentParentId;
    }
  }, [currentParentId]);

  const { data: currentFolder } = useQuery(
    convexQuery(api.items.get, {
      itemId: currentParentId as Id<"items">,
    })
  );

  const { data: items } = useSuspenseQuery(
    convexQuery(api.items.listByParent, { parentId: currentParentId })
  );

  const folders = items.filter((item: Item) => item.type === "folder");
  const notes = items.filter((item: Item) => item.type === "note");

  const createNoteMutation = useConvexMutation(api.items.createNote);
  const createFolderMutation = useConvexMutation(api.items.createFolder);
  const removeItemMutation = useConvexMutation(api.items.remove);
  const updateTitleMutation = useConvexMutation(api.items.updateTitle);
  const moveItemMutation = useConvexMutation(api.items.move);

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await authClient.signOut({
        fetchOptions: { onSuccess: () => location.reload() },
      });
    });
  };

  const handleCreateNote = () => {
    startCreateNoteTransition(async () => {
      const newNoteId = await createNoteMutation({ parentId: currentParentId });
      onSelectNote(newNoteId);
    });
  };

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    startCreateFolderTransition(async () => {
      await createFolderMutation({
        title: folderName.trim(),
        parentId: currentParentId,
      });
      setFolderName("");
      setShowNewFolderDialog(false);
    });
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    startDeleteItemTransition(async () => {
      await removeItemMutation({ itemId: itemToDelete._id });
      setItemToDelete(null);
    });
  };

  const handleRenameItem = () => {
    if (!itemToRename || !newName.trim()) return;
    startRenameItemTransition(async () => {
      await updateTitleMutation({
        itemId: itemToRename._id,
        title: newName.trim(),
      });
      setItemToRename(null);
      setNewName("");
    });
  };

  const openRenameDialog = (item: Item) => {
    setItemToRename(item);
    setNewName(item.title);
  };

  const handleGoBack = () => {
    setSlideDirection("right");
    if (currentFolder?.parentId) {
      onNavigateFolder(currentFolder.parentId);
    } else {
      onNavigateFolder(undefined);
    }
  };

  const handleNavigateIntoFolder = (folderId: Id<"items">) => {
    setSlideDirection("left");
    onNavigateFolder(folderId);
  };

  const handleMoveItem = (
    itemId: string,
    targetParentId: string | undefined
  ) => {
    moveItemMutation({
      itemId: itemId as Id<"items">,
      parentId: targetParentId as Id<"items"> | undefined,
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
      <DndContextProvider onMoveItem={handleMoveItem}>
        <FolderSidebarContent
          currentParentId={currentParentId}
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
          onDeleteItem={setItemToDelete}
          onRenameItem={openRenameDialog}
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
        open={!!itemToRename}
        onOpenChange={(open) => !open && setItemToRename(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Rename {itemToRename?.type === "folder" ? "folder" : "note"}
            </DialogTitle>
            <DialogDescription>
              Enter a new name for this{" "}
              {itemToRename?.type === "folder" ? "folder" : "note"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            onKeyDown={(e) => e.key === "Enter" && handleRenameItem()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToRename(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameItem}
              disabled={isRenamingItem || !newName.trim()}
            >
              {isRenamingItem && <Spinner />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="place-items-start text-start">
            <AlertDialogTitle>
              Delete {itemToDelete?.type === "folder" ? "folder" : "note"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === "folder"
                ? `Are you sure you want to delete "${itemToDelete?.title}"? Contents will be moved to the parent folder.`
                : `Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingItem}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={isDeletingItem}
            >
              {isDeletingItem && <Spinner />}
              {isDeletingItem ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FolderSidebarContent({
  currentParentId,
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
  onDeleteItem,
  onRenameItem,
  onShowLogoutDialog,
}: {
  currentParentId?: Id<"items">;
  currentFolder: Item | null | undefined;
  folders: Item[];
  notes: Item[];
  selectedNoteId?: Id<"items">;
  slideDirection: "left" | "right";
  slideVariants: {
    enter: (direction: "left" | "right") => { x: number; opacity: number };
    center: { x: number; opacity: number };
    exit: (direction: "left" | "right") => { x: number; opacity: number };
  };
  springTransition: { type: "spring"; stiffness: number; damping: number };
  isCreatingNote: boolean;
  isCreatingFolder: boolean;
  onSelectNote: (noteId: Id<"items">) => void;
  onNavigateIntoFolder: (folderId: Id<"items">) => void;
  onGoBack: () => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onDeleteItem: (item: Item) => void;
  onRenameItem: (item: Item) => void;
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
            key={currentParentId ?? "root"}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
            className="absolute inset-0 overflow-auto"
          >
            <ParentDropZone
              targetParentId={currentFolder?.parentId}
              isVisible={!!currentParentId}
              isDragging={isDragging}
              currentFolderName={currentFolder?.title}
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
                    itemId: folder._id,
                    title: folder.title,
                    parentId: folder.parentId,
                  };

                  return (
                    <DroppableFolder
                      key={folder._id}
                      id={`droppable-folder-${folder._id}`}
                      itemId={folder._id}
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
                              (activeItem as FolderDragData).itemId ===
                                folder._id &&
                              "opacity-50"
                          )}
                          onClick={() => onNavigateIntoFolder(folder._id)}
                        >
                          <IconFolder2BoldDuotone className="size-4 text-foreground/60 shrink-0" />
                          <span className="text-sm truncate flex-1">
                            {folder.title}
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
                                  onRenameItem(folder);
                                }}
                              >
                                <IconPenBoldDuotone className="text-foreground/60" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteItem(folder);
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
                    itemId: note._id,
                    title: note.title,
                    parentId: note.parentId,
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
                            (activeItem as NoteDragData).itemId === note._id &&
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
                                onDeleteItem(note);
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
