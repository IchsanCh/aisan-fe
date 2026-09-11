import * as React from "react";
import { fetchConversationPage } from "@/lib/conversations";
import { useChatStore } from "@/store/chat-store";

export function useConversationHistory(conversationId: number | null) {
  const hydrateLatest = useChatStore((s) => s.hydrateLatest);
  const prependOlder = useChatStore((s) => s.prependOlder);
  const hasMoreOlder = useChatStore((s) => s.hasMoreOlder);
  const oldestCursor = useChatStore((s) => s.oldestCursor);

  const [isLoadingInitial, setIsLoadingInitial] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;

    setIsLoadingInitial(true);
    fetchConversationPage(conversationId)
      .then((res) => {
        if (cancelled) return;
        hydrateLatest(res.messages, res.has_more, res.next_cursor);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingInitial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, hydrateLatest]);

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
