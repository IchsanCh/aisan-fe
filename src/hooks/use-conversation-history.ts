import * as React from "react";
import { fetchConversationPage } from "@/lib/conversations";
import { useChatStore } from "@/store/chat-store";

export function useConversationHistory(conversationId: number | null) {
  const hydrateLatest = useChatStore((s) => s.hydrateLatest);
  const setModelId = useChatStore((s) => s.setModelId);
  const prependOlder = useChatStore((s) => s.prependOlder);
  const hasMoreOlder = useChatStore((s) => s.hasMoreOlder);
  const oldestCursor = useChatStore((s) => s.oldestCursor);

  const [isLoadingInitial, setIsLoadingInitial] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId) return;

    // Conversation baru dibikin dari chat yang lagi streaming (event `start`
    // nge-set conversationId). Store udah megang pesan lokal + bubble
    // assistant yang lagi diisi; hydrate dari server di sini bakal nimpa
    // semuanya dan bikin balasan streaming-nya ilang.
    if (useChatStore.getState().isStreaming) return;

    let cancelled = false;

    setIsLoadingInitial(true);
    fetchConversationPage(conversationId)
      .then((res) => {
        if (cancelled) return;
        hydrateLatest(res.messages, res.has_more, res.next_cursor);
        setModelId(res.conversation.model_id ?? null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInitial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, hydrateLatest, setModelId]);

  const loadOlder = React.useCallback(async () => {
    if (!conversationId || !hasMoreOlder || !oldestCursor || isLoadingMore)
      return;

    setIsLoadingMore(true);
    try {
      const res = await fetchConversationPage(conversationId, {
        beforeId: oldestCursor,
      });
      prependOlder(res.messages, res.has_more, res.next_cursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMoreOlder, oldestCursor, isLoadingMore, prependOlder]);

  return { isLoadingInitial, isLoadingMore, loadOlder };
}
