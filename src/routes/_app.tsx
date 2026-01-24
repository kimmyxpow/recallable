import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { motion } from "motion/react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";

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

function AppLayout() {
  return (
    <>
      <Outlet />
      <AIInput />
    </>
  );
}
