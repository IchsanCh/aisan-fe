import * as React from "react";
import { useParams } from "react-router-dom";
import { LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/pages/chat/message-list";
import { Composer } from "@/pages/chat/composer";
import { useChatStore } from "@/store/chat-store";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAuthStore } from "@/store/auth-store";

function ChatPage() {
  const params = useParams<{ id?: string }>();
  const routeConversationId = params.id ? Number(params.id) : null;

  const conversationId = useChatStore((s) => s.conversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const reset = useChatStore((s) => s.reset);
  const clearSession = useAuthStore((s) => s.clearSession);

  const { sendMessage, stop } = useChatStream();

  // Sinkronin store sama param URL -- ini CUMA jalan pas route id-nya
  // beneran ganti (mis. sidebar nanti nge-link ke conversation lain), bukan
  // pas store.conversationId keisi sendiri abis chat baru dibikin (itu gak
  // ada di dependency array, sengaja).
  React.useEffect(() => {
    if (routeConversationId !== conversationId) {
      reset();
      if (routeConversationId) setConversationId(routeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeConversationId]);

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="font-mono text-sm text-muted-foreground">aisan_</div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Logout"
            onClick={clearSession}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <MessageList conversationId={conversationId} />
      <Composer onSend={sendMessage} onStop={stop} isStreaming={isStreaming} />
    </div>
  );
}

export { ChatPage };
