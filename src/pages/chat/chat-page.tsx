import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LogOut, PanelLeft, PanelLeftOpen } from "lucide-react";

import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ConversationSidebar,
  SidebarDrawer,
} from "@/pages/chat/conversation-sidebar";
import { MessageList } from "@/pages/chat/message-list";
import { Composer } from "@/pages/chat/composer";
import { useChatStore } from "@/store/chat-store";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

function parseRouteId(raw: string | undefined) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function ChatPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const routeConversationId = parseRouteId(params.id);

  const conversationId = useChatStore((s) => s.conversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const reset = useChatStore((s) => s.reset);
  const clearSession = useAuthStore((s) => s.clearSession);

  const { sendMessage, stop } = useChatStream();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const asideRef = React.useRef<HTMLElement>(null);
  const expandButtonRef = React.useRef<HTMLButtonElement>(null);
  // Fokus cuma dipindah kalau user yang nge-toggle (bukan pas pertama mount
  // dengan state tersimpan dari localStorage).
  const moveFocusRef = React.useRef(false);

  const toggleSidebar = React.useCallback(
    (collapsed: boolean) => {
      moveFocusRef.current = true;
      setSidebarCollapsed(collapsed);
    },
    [setSidebarCollapsed],
  );

  // Tombol yang barusan diklik hilang / jadi inert abis toggle, jadi fokus
  // dipindah ke tombol pasangannya biar keyboard user gak "jatuh" ke body.
  // preventScroll: aside yang lagi animasi itu overflow-hidden, jangan
  // sampai fokus nge-scroll isinya.
  React.useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    const target = sidebarCollapsed
      ? expandButtonRef.current
      : asideRef.current?.querySelector<HTMLElement>("button");
    target?.focus({ preventScroll: true });
  }, [sidebarCollapsed]);

  // Sinkronin store sama param URL -- ini CUMA jalan pas route id-nya
  // beneran ganti (mis. klik conversation di sidebar), bukan pas
  // store.conversationId keisi sendiri abis chat baru dibikin (itu gak
  // ada di dependency array, sengaja).
  React.useEffect(() => {
    if (routeConversationId !== conversationId) {
      reset();
      if (routeConversationId) setConversationId(routeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeConversationId]);

  // Chat baru dibikin dari /chat -> URL ikut jadi /chat/:id (replace, jadi
  // tombol back gak nyangkut di /chat kosong). Karena id-nya udah sama
  // dengan store, effect di atas gak bakal nge-reset.
  React.useEffect(() => {
    if (conversationId && routeConversationId === null) {
      navigate(`/chat/${conversationId}`, { replace: true });
    }
  }, [conversationId, routeConversationId, navigate]);

  // Drawer cuma buat layar kecil; kalau layar melebar, tutup.
  React.useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  return (
    <div className="flex h-svh bg-background">
      {isDesktop && (
        // Lebar dianimasiin 18rem <-> 0. Isinya tetap w-72 (bukan ikut
        // mengecil) biar gak ke-remas selama transisi, cuma ke-clip.
        // `inert` pas collapsed: isinya keluar dari tab order & a11y tree
        // tapi tetap ke-mount, jadi posisi scroll list gak ilang.
        <aside
          ref={asideRef}
          inert={sidebarCollapsed}
          className={cn(
            "shrink-0 overflow-hidden border-r transition-[width,border-color] duration-200 ease-out motion-reduce:transition-none",
            sidebarCollapsed
              ? "w-0 border-transparent"
              : "w-72 border-sidebar-border",
          )}
        >
          <div className="h-full w-72">
            <ConversationSidebar
              stop={stop}
              onCollapse={() => toggleSidebar(true)}
            />
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            {!isDesktop && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open chats"
                onClick={() => setDrawerOpen(true)}
              >
                <PanelLeft className="size-4" />
              </Button>
            )}
            {isDesktop && sidebarCollapsed && (
              <Button
                ref={expandButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Expand sidebar"
                aria-expanded="false"
                onClick={() => toggleSidebar(false)}
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            )}
            <div className="font-mono text-sm text-muted-foreground">
              aisan_
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
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
        <Composer
          onSend={sendMessage}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </div>

      {!isDesktop && drawerOpen && (
        <SidebarDrawer onClose={closeDrawer}>
          <ConversationSidebar
            stop={stop}
            onNavigate={closeDrawer}
            onClose={closeDrawer}
          />
        </SidebarDrawer>
      )}
    </div>
  );
}

export { ChatPage };
