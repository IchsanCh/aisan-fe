import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";

import { useChatStore } from "@/store/chat-store";
import { useConversationHistory } from "@/hooks/use-conversation-history";
import { MessageBubble } from "@/pages/chat/message-bubble";

interface MessageListProps {
  conversationId: number | null;
}

// Cuma ~15-20 pesan yang keliatan di viewport yang bener-bener ada di DOM
// (sisanya di-unmount virtualizer), jadi RAM & re-render tetep stabil walau
// conversation-nya udah nyimpen ribuan pesan.
function MessageList({ conversationId }: MessageListProps) {
  const messages = useChatStore((s) => s.messages);
  const { isLoadingInitial, isLoadingMore, loadOlder } =
    useConversationHistory(conversationId);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const prevMessageCountRef = React.useRef(0);
  const prevScrollHeightRef = React.useRef(0);
  const isPrependingRef = React.useRef(false);
  const isNearBottomRef = React.useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
    // key stabil per pesan (ID), bukan index -- penting karena pesan lama
    // di-prepend ke DEPAN array pas "load older", jadi index tiap pesan
    // yang udah ada ikut geser.
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const handleScroll = React.useCallback(() => {
    const el = parentRef.current;
    if (!el) return;

    if (el.scrollTop < 120) {
      isPrependingRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlder();
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 160;
  }, [loadOlder]);

  // Pas jumlah pesan berubah: kalau ini hasil "load older" (prepend di
  // depan), pertahanin posisi scroll biar konten gak "loncat". Kalau ini
  // pesan baru & user emang lagi deket bawah, auto-scroll ngikutin ke bawah.
  React.useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const countDelta = messages.length - prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (countDelta === 0) return;

    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      requestAnimationFrame(() => {
        el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      });
      return;
    }

    if (isNearBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length]);

  // Konten pesan yang lagi streaming nambah terus tanpa nambah JUMLAH pesan
  // -- tetep nempel bawah kalau user lagi di situ.
  const lastMessage = messages[messages.length - 1];
  React.useEffect(() => {
    if (!isNearBottomRef.current) return;
    const el = parentRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessage?.content]);

  if (isLoadingInitial) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Mulai chat sama AISAN
        </p>
        <p className="text-sm text-muted-foreground">
          Tanya apa aja, atau minta bantu ngerjain sesuatu.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 [content-visibility:auto] sm:px-6"
    >
      {isLoadingMore && (
        <div className="flex justify-center pb-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          if (!message) return null;
          return (
            <div
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: 16,
              }}
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { MessageList };
