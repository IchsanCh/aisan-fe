import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  conversationListKey,
  removeConversation,
} from "@/lib/conversation-cache";
import {
  CONVERSATION_PAGE_SIZE,
  deleteConversation,
  fetchConversationList,
} from "@/lib/conversations";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export function useConversationList() {
  const userId = useAuthStore((s) => s.user?.id);

  return useInfiniteQuery({
    queryKey: conversationListKey(userId),
    queryFn: ({ pageParam }) => fetchConversationList(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.count < CONVERSATION_PAGE_SIZE
        ? undefined
        : lastPage.offset + CONVERSATION_PAGE_SIZE,
    // List dijaga manual lewat conversation-cache (tambah/naik/hapus),
    // jadi gak perlu refetch tiap sidebar mount. gcTime pendek biar
    // cache gak numpuk di memori pas sidebar lama gak dibuka.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_data, id) => {
      removeConversation(queryClient, id);

      // Yang dihapus lagi dibuka -> balik ke chat kosong.
      if (useChatStore.getState().conversationId === id) {
        useChatStore.getState().reset();
        navigate("/chat", { replace: true });
      }
    },
  });
}
