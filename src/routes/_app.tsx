import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { IconSend, IconSparkles, IconX, IconLoader2, IconTool } from "@tabler/icons-react";
import { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useUIMessages, useSmoothText } from "@convex-dev/agent/react";
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

const AIContext = createContext<AIContextType>({ isWorking: false, setIsWorking: () => {} });

function useAIContext() {
  return useContext(AIContext);
}

const TOOL_LABELS: Record<string, string> = {
  searchNotes: "Searching notes...",
  getNote: "Reading note...",
  listRecentNotes: "Listing notes...",
  getDocumentStructure: "Analyzing structure...",
  updateNote: "Updating note...",
  createNote: "Creating note...",
  createFolder: "Creating folder...",
};

function ToolCallIndicator({ toolName }: { toolName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1"
    >
      <IconTool className="size-3" />
      <span>{TOOL_LABELS[toolName] ?? `Running ${toolName}...`}</span>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const [visibleText] = useSmoothText(message.text ?? "", {
    startStreaming: isStreaming,
  });

  const toolCalls = (message.parts ?? []).filter(
    (part) => typeof part.type === "string" && part.type.startsWith("tool-")
  );
  const pendingTools = toolCalls.filter(
    (t) => "state" in t && t.state !== "done" && t.state !== "output-available"
  );

  const getToolName = (part: unknown): string => {
    if (part && typeof part === "object" && "type" in part) {
      const type = (part as { type: string }).type;
      return type.replace("tool-", "");
    }
    return "unknown";
  };

  const renderContent = (text: string) => {
    const linkRegex = /(https?:\/\/[^\s]+|\/notes\?[^\s]+)/g;
    const parts = text.split(linkRegex);
    
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? "U" : <IconSparkles className="size-3" />}
      </div>
      <div className={cn("max-w-[80%] space-y-1", isUser ? "text-right" : "text-left")}>
        {pendingTools.map((tool, i) => (
          <ToolCallIndicator key={i} toolName={getToolName(tool)} />
        ))}
        {(visibleText || isStreaming) && (
          <div
            className={cn(
              "inline-block rounded-2xl px-3 py-2 text-sm",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted rounded-tl-sm"
            )}
          >
            <div className="whitespace-pre-wrap break-words">
              {visibleText ? (
                renderContent(visibleText)
              ) : isStreaming ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    Thinking...
                  </motion.span>
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AIInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isWorking, setIsWorking } = useAIContext();

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

  useEffect(() => {
    setIsWorking(isAgentStreaming);
  }, [isAgentStreaming, setIsWorking]);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (!threadId) {
      try {
        const id = await createThread({});
        setThreadId(id);
      } catch (error) {
        console.error("Failed to create thread:", error);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClear = async () => {
    setThreadId(null);
    try {
      const id = await createThread({});
      setThreadId(id);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  const handleSend = useCallback(async () => {
    if (!value.trim() || !threadId || isSending) return;

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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 left-1/2 z-50 w-[460px] -translate-x-1/2 rounded-2xl border border-border bg-white shadow-xl shadow-black/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b">
              <div className="flex items-center gap-2">
                <IconSparkles className="size-4 text-primary" />
                <span className="text-sm font-medium">AI Assistant</span>
                {isAgentStreaming && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <IconLoader2 className="size-3.5 text-muted-foreground" />
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  className="size-7"
                >
                  <IconX className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClose}
                  className="size-7"
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            </div>

            <div className="h-72 overflow-y-auto px-4 py-3">
              {status === "LoadingFirstPage" ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner className="size-5" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <IconSparkles className="size-8 text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">How can I help?</p>
                    <p className="text-xs text-muted-foreground">
                      Ask about your notes, tasks, or paste a note link.
                    </p>
                  </div>
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

            <div className="border-t p-3">
              <div className="flex gap-2">
                <TextareaAutosize
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything or paste a note link..."
                  disabled={isSending || !threadId}
                  minRows={1}
                  maxRows={4}
                  className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!value.trim() || isSending || !threadId}
                >
                  {isSending ? <Spinner className="size-4" /> : <IconSend className="size-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <motion.div
          layout
          animate={{ width: isOpen ? 300 : 400 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "rounded-2xl border border-border bg-white p-3 shadow-xl shadow-black/10",
            isOpen && "border-primary"
          )}
        >
          {isOpen ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {isAgentStreaming ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <IconLoader2 className="size-4" />
                  </motion.div>
                  <span>AI is working...</span>
                </>
              ) : (
                <>
                  <IconSparkles className="size-4" />
                  <span>Chat open above</span>
                </>
              )}
            </div>
          ) : (
            <div
              className="flex items-center gap-3 cursor-text"
              onClick={handleOpen}
            >
              <div className="flex items-center gap-2 flex-1">
                {isWorking ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <IconLoader2 className="size-5 text-primary" />
                  </motion.div>
                ) : (
                  <IconSparkles className="size-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {isWorking ? "AI is working..." : "Ask AI to help you write..."}
                </span>
              </div>
              <Button size="sm" onClick={handleOpen}>
                <IconSend className="size-3.5 mr-1.5" />
                Ask
              </Button>
            </div>
          )}
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
