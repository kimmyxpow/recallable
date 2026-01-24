import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  IconSend,
  IconPlus,
  IconTrash,
  IconLogout,
  IconFile,
} from "@tabler/icons-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { motion } from "motion/react";
import TextareaAutosize from "react-textarea-autosize";
import YooptaEditor, {
  createYooptaEditor,
  type YooptaContentValue,
  type YooptaOnChangeOptions,
} from "@yoopta/editor";
import Paragraph from "@yoopta/paragraph";
import Blockquote from "@yoopta/blockquote";
import Embed from "@yoopta/embed";
import Image from "@yoopta/image";
import Link from "@yoopta/link";
import Callout from "@yoopta/callout";
import Video from "@yoopta/video";
import File from "@yoopta/file";
import Accordion from "@yoopta/accordion";
import { NumberedList, BulletedList, TodoList } from "@yoopta/lists";
import {
  Bold,
  Italic,
  CodeMark,
  Underline,
  Strike,
  Highlight,
} from "@yoopta/marks";
import { HeadingOne, HeadingTwo, HeadingThree } from "@yoopta/headings";
import Code from "@yoopta/code";
import Table from "@yoopta/table";
import Divider from "@yoopta/divider";
import ActionMenuList, {
  DefaultActionMenuRender,
} from "@yoopta/action-menu-list";
import Toolbar, { DefaultToolbarRender } from "@yoopta/toolbar";
import LinkTool, { DefaultLinkToolRender } from "@yoopta/link-tool";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.auth.getCurrentUser, {})
    );
  },
  component: DashboardPage,
});

const plugins = [
  Paragraph,
  Table,
  Divider,
  Accordion,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  Blockquote,
  Callout,
  NumberedList,
  BulletedList,
  TodoList,
  Code,
  Link,
  Embed,
  Image.extend({
    options: {
      async onUpload(file) {
        const url = URL.createObjectURL(file);
        return {
          src: url,
          alt: file.name,
          sizes: {
            width: 800,
            height: 600,
          },
        };
      },
    },
  }),
  Video.extend({
    options: {
      async onUpload(file) {
        const url = URL.createObjectURL(file);
        return {
          src: url,
          alt: file.name,
          sizes: {
            width: 800,
            height: 450,
          },
        };
      },
    },
  }),
  File.extend({
    options: {
      async onUpload(file) {
        const url = URL.createObjectURL(file);
        return {
          src: url,
          format: file.type,
          name: file.name,
          size: file.size,
        };
      },
    },
  }),
];

const TOOLS = {
  ActionMenu: {
    render: DefaultActionMenuRender,
    tool: ActionMenuList,
  },
  Toolbar: {
    render: DefaultToolbarRender,
    tool: Toolbar,
  },
  LinkTool: {
    render: DefaultLinkToolRender,
    tool: LinkTool,
  },
};

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

const INITIAL_VALUE: YooptaContentValue = {
  "block-1": {
    id: "block-1",
    type: "HeadingOne",
    value: [
      {
        id: "element-1",
        type: "heading-one",
        children: [{ text: "Welcome to Recallable" }],
        props: { nodeType: "block" },
      },
    ],
    meta: { order: 0, depth: 0 },
  },
  "block-2": {
    id: "block-2",
    type: "Paragraph",
    value: [
      {
        id: "element-2",
        type: "paragraph",
        children: [
          {
            text: "Start writing here. Type '/' to open the command menu and choose from headings, lists, quotes, and more.",
          },
        ],
        props: { nodeType: "block" },
      },
    ],
    meta: { order: 1, depth: 0 },
  },
};

function NotionEditor() {
  const [value, setValue] = useState<YooptaContentValue>(INITIAL_VALUE);
  const editor = useMemo(() => createYooptaEditor(), []);
  const selectionRef = useRef<HTMLDivElement>(null);

  const onChange = (
    newValue: YooptaContentValue,
    _options: YooptaOnChangeOptions
  ) => {
    setValue(newValue);
  };

  return (
    <div ref={selectionRef} className="relative w-full min-h-125 px-6 py-8">
      <YooptaEditor
        editor={editor}
        plugins={plugins as any}
        tools={TOOLS}
        marks={MARKS}
        value={value}
        onChange={onChange}
        selectionBoxRoot={selectionRef}
        autoFocus
        placeholder="Type '/' for commands..."
        style={{
          width: "100%",
        }}
      />
    </div>
  );
}

function AIInput() {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <motion.div
        layout
        initial={false}
        animate={{
          width: isFocused ? 600 : 400,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        className={cn(
          "rounded-2xl border border-border bg-background/80 p-3 shadow-xl shadow-black/10 backdrop-blur-xl",
          isFocused && "border-primary"
        )}
      >
        <div className="flex flex-col gap-3">
          <TextareaAutosize
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask AI to help you write..."
            minRows={isFocused ? 3 : 1}
            maxRows={8}
            className="resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
            style={{
              transition: "min-height 0.2s ease-out",
            }}
          />
          <div className="flex justify-end">
            <Button disabled={!value.trim()}>
              <IconSend />
              Send
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface Document {
  id: string;
  title: string;
}

const dummyDocuments: Document[] = [
  { id: "1", title: "Meeting Notes" },
  { id: "2", title: "Project Ideas" },
  { id: "3", title: "Quick Draft" },
];

function Navbar({
  documents,
  selectedDocId,
  onSelectDoc,
  onAddDoc,
  onDeleteDoc,
}: {
  documents: Document[];
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
  onAddDoc: () => void;
  onDeleteDoc: () => void;
}) {
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
        <div className="flex items-center gap-2">
          <Select
            value={selectedDocId}
            onValueChange={(val) => val && onSelectDoc(val)}
          >
            <SelectTrigger className="w-[240px]">
              <IconFile className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Select a doc..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <Button className="w-full" onClick={onAddDoc}>
                  <IconPlus />
                  New Doc
                </Button>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onDeleteDoc}>
            <IconTrash />
          </Button>

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
              You'll need to sign in again to access your docs.
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

function MainContent() {
  const [selectedDocId, setSelectedDocId] = useState(dummyDocuments[0].id);
  const [documents, setDocuments] = useState(dummyDocuments);

  const handleAddDoc = () => {
    const newDoc: Document = {
      id: String(Date.now()),
      title: `Untitled ${documents.length + 1}`,
    };
    setDocuments([...documents, newDoc]);
    setSelectedDocId(newDoc.id);
  };

  const handleDeleteDoc = () => {
    if (documents.length <= 1) return;
    const newDocs = documents.filter((d) => d.id !== selectedDocId);
    setDocuments(newDocs);
    setSelectedDocId(newDocs[0].id);
  };

  return (
    <div className="flex size-full flex-col">
      <Navbar
        documents={documents}
        selectedDocId={selectedDocId}
        onSelectDoc={setSelectedDocId}
        onAddDoc={handleAddDoc}
        onDeleteDoc={handleDeleteDoc}
      />
      <div className="flex-1 overflow-auto">
        <NotionEditor />
        <div className="h-24" />
      </div>
      <AIInput />
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="flex min-h-screen max-w-4xl mx-auto border-x border-dashed">
      <MainContent />
    </div>
  );
}
