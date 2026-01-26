import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  IconSend,
  IconSparkles,
  IconLoader2,
  IconTool,
  IconRefresh,
} from "@tabler/icons-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import type { UIMessage } from "@convex-dev/agent/react";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

type AIContextType = {
  isWorking: boolean;
  setIsWorking: (v: boolean) => void;
};

const AIContext = createContext<AIContextType>({
  isWorking: false,
  setIsWorking: () => {},
});

function useAIContext() {
  return useContext(AIContext);
}

const TOOL_TYPES = [
  "tool-searchNotes",
  "tool-getNote",
  "tool-listRecentNotes",
  "tool-getDocumentStructure",
  "tool-getFolderTree",
  "tool-updateNote",
  "tool-createNote",
  "tool-createFolder",
  "tool-moveItem",
  "tool-removeItem",
] as const;

type ToolType = (typeof TOOL_TYPES)[number];

const TOOL_LABELS: Record<ToolType, string> = {
  "tool-searchNotes": "Searching notes...",
  "tool-getNote": "Reading note...",
  "tool-listRecentNotes": "Listing notes...",
  "tool-getDocumentStructure": "Analyzing structure...",
  "tool-getFolderTree": "Loading folders...",
  "tool-updateNote": "Updating note...",
  "tool-createNote": "Creating note...",
  "tool-createFolder": "Creating folder...",
  "tool-moveItem": "Moving item...",
  "tool-removeItem": "Removing item...",
};

function ToolCallIndicator({
  toolType,
  isComplete,
}: {
  toolType: ToolType;
  isComplete: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 bg-muted"
      )}
    >
      {isComplete ? (
        <IconTool className="size-3" />
      ) : (
        <IconLoader2 className="size-3 animate-spin" />
      )}
      <span>
        {isComplete
          ? TOOL_LABELS[toolType].replace("...", "")
          : TOOL_LABELS[toolType]}
      </span>
    </motion.div>
  );
}

function TextBubble({ text, isUser }: { text: string; isUser: boolean }) {
  const renderContent = (content: string) => {
    const linkRegex = /(https?:\/\/[^\s]+|\/notes\?[^\s]+)/g;
    const parts = content.split(linkRegex);

    return parts.map((part, i) => {
      if (linkRegex.test(part)) {
        linkRegex.lastIndex = 0;
        return (
          <a
            key={i}
            href={part}
            className="text-primary underline underline-offset-2 hover:no-underline"
            target={part.startsWith("http") ? "_blank" : undefined}
            rel={part.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {part.startsWith("http") ? part : "note link"}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={cn(
        "inline-block rounded-2xl px-3 py-2 text-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted rounded-tl-sm"
      )}
    >
      <div className="whitespace-pre-wrap wrap-break-word">
        {renderContent(text)}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming =
    message.status === "streaming" || message.status === "pending";

  const renderPart = (part: (typeof message.parts)[number], index: number) => {
    switch (part.type) {
      case "text": {
        if (!part.text?.trim()) return null;
        return (
          <TextBubble key={`text-${index}`} text={part.text} isUser={isUser} />
        );
      }
      case "tool-searchNotes": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-searchNotes"
            isComplete={isComplete}
          />
        );
      }
      case "tool-getNote": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-getNote"
            isComplete={isComplete}
          />
        );
      }
      case "tool-listRecentNotes": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-listRecentNotes"
            isComplete={isComplete}
          />
        );
      }
      case "tool-getDocumentStructure": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-getDocumentStructure"
            isComplete={isComplete}
          />
        );
      }
      case "tool-getFolderTree": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-getFolderTree"
            isComplete={isComplete}
          />
        );
      }
      case "tool-updateNote": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-updateNote"
            isComplete={isComplete}
          />
        );
      }
      case "tool-createNote": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-createNote"
            isComplete={isComplete}
          />
        );
      }
      case "tool-createFolder": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-createFolder"
            isComplete={isComplete}
          />
        );
      }
      case "tool-moveItem": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-moveItem"
            isComplete={isComplete}
          />
        );
      }
      case "tool-removeItem": {
        const isComplete = part.state === "output-available";
        return (
          <ToolCallIndicator
            key={part.toolCallId}
            toolType="tool-removeItem"
            isComplete={isComplete}
          />
        );
      }
      default:
        return null;
    }
  };

  const hasParts = message.parts && message.parts.length > 0;
  const hasVisibleContent = message.parts?.some(
    (p) => (p.type === "text" && p.text?.trim()) || p.type.startsWith("tool-")
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn("max-w-[80%] space-y-1.5")}>
        {hasParts && message.parts.map((part, i) => renderPart(part, i))}
        {isStreaming && !hasVisibleContent && (
          <div className="inline-block rounded-2xl px-3 py-2 text-sm bg-muted rounded-tl-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                Thinking...
              </motion.span>
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AIInput() {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const { setIsWorking } = useAIContext();

  const createThread = useConvexMutation(api.chat.createAgentThread);
  const sendMessage = useConvexMutation(api.chat.sendMessage);

  const { results: messages, status } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const isAgentStreaming = messages.some(
    (m) => m.status === "streaming" || m.status === "pending"
  );

  const hasMessages = messages.length > 0;

  useEffect(() => {
    setIsWorking(isAgentStreaming);
  }, [isAgentStreaming, setIsWorking]);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!threadId) {
      createThread({}).then(setThreadId).catch(console.error);
    }
  }, [threadId, createThread]);

  useEffect(() => {
    if (inputContainerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setInputHeight(entry.contentRect.height);
        }
      });
      observer.observe(inputContainerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const insideInput = target && inputContainerRef.current?.contains(target);
      const insideHistory =
        target && historyContainerRef.current?.contains(target);
      if (!insideInput && !insideHistory) {
        setIsFocused(false);
      }
    };

    document.addEventListener("click", handleClickOutside, { capture: true });
    return () =>
      document.removeEventListener("click", handleClickOutside, { capture: true });
  }, []);

  const handleClear = async () => {
    const newThreadId = await createThread({}).catch(console.error);
    setThreadId(newThreadId ?? null);
  };

  const handleSend = useCallback(async () => {
    if (!value.trim() || !threadId || isSending || isAgentStreaming) return;

    const message = value.trim();
    setValue("");
    setIsSending(true);

    try {
      await sendMessage({ threadId, message });
    } catch (error) {
      console.error("Failed to send message:", error);
      setValue(message);
    } finally {
      setIsSending(false);
    }
  }, [value, threadId, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const showHistory = isFocused && hasMessages;
  const popupBottom = inputHeight + 24 + 16;
  const inputWidth = isAgentStreaming ? 420 : isFocused ? 600 : 400;
  const inputPadding = isAgentStreaming ? "p-2.5" : "p-3";
  const inputGap = isAgentStreaming ? "gap-2" : "gap-3";

  return (
    <>
      <AnimatePresence>
        {showHistory && (
          <motion.div
            ref={historyContainerRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ bottom: popupBottom }}
            className="fixed left-1/2 z-40 w-150 -translate-x-1/2 rounded-2xl border border-border bg-white shadow-xl shadow-black/6 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b">
              <div className="flex items-center gap-2">
                <IconSparkles className="size-4 text-primary" />
                <span className="text-sm font-medium">Conversation</span>
                {isAgentStreaming && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <IconLoader2 className="size-3.5 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleClear}
                className="size-7"
                title="New conversation"
              >
                <IconRefresh className="size-3.5" />
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto px-4 py-3">
              {status === "LoadingFirstPage" ? (
                <div className="flex items-center justify-center h-20">
                  <Spinner className="size-5" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message) => (
                    <MessageBubble key={message.key} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={inputContainerRef}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      >
        <motion.div
          layout
          initial={false}
          animate={{ width: inputWidth }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "rounded-2xl border border-border bg-white shadow-xl shadow-black/10",
            inputPadding,
            isFocused && "border-primary",
            isAgentStreaming && "opacity-80"
          )}
        >
          <div className={cn("flex flex-col", inputGap)}>
            <TextareaAutosize
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to help you write..."
              disabled={!threadId}
              minRows={isAgentStreaming ? 1 : isFocused ? 3 : 1}
              maxRows={8}
              className="resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-50"
              style={{ transition: "min-height 0.2s ease-out" }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAgentStreaming && !showHistory && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <IconLoader2 className="size-3" />
                    </motion.div>
                    <span>AI is responding...</span>
                  </motion.div>
                )}
              </div>
              <Button
                onClick={handleSend}
                disabled={
                  !value.trim() || isSending || isAgentStreaming || !threadId
                }
              >
                {isSending ? (
                  <Spinner className="size-4" />
                ) : (
                  <IconSend className="size-4" />
                )}
                <span className="ml-1.5">Send</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function AppLayout() {
  const [isWorking, setIsWorking] = useState(false);

  return (
    <AIContext.Provider value={{ isWorking, setIsWorking }}>
      <Outlet />
      <AIInput />
    </AIContext.Provider>
  );
}
