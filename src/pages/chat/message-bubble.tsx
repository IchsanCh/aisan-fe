import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatMessageItem } from "@/store/chat-store";
import { ToolCallChip } from "@/pages/chat/tool-call-chip";

const markdownComponents = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => (
    <ul className="mb-2 list-disc pl-5 last:mb-0" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="mb-2 list-decimal pl-5 last:mb-0" {...props} />
  ),
  a: ({ ...props }) => (
    <a
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = /language-/.test(className ?? "");
    return isBlock ? (
      <code className={cn("font-mono text-[13px]", className)} {...props} />
    ) : (
      <code
        className="rounded bg-muted px-1 py-0.5 font-mono text-[13px]"
        {...props}
      />
    );
  },
  pre: ({ ...props }) => (
    <pre
      className="mb-2 overflow-x-auto rounded-md bg-muted p-3 last:mb-0"
      {...props}
    />
  ),
};

function MessageBubbleBase({ message }: { message: ChatMessageItem }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex max-w-[85%] flex-col gap-1.5 sm:max-w-[75%]")}>
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.toolCalls.map((tc) => (
              <ToolCallChip key={tc.clientId} toolCall={tc} />
            ))}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {message.content ? (
            isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            )
          ) : message.status === "streaming" ? (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-label="Mengetik…"
            />
          ) : null}
        </div>

        {message.status === "failed" && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Gagal dapet balasan.
          </div>
        )}
      </div>
    </div>
  );
}

// React.memo -- pesan yang udah `completed` gak pernah re-render lagi pas
// pesan lain lagi streaming; cuma bubble yang bener-bener berubah yang
// re-render.
const MessageBubble = React.memo(MessageBubbleBase, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.toolCalls === next.message.toolCalls
  );
});

export { MessageBubble };
