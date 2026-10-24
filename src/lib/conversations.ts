import { apiClient } from "@/lib/api-client";
import type { ConversationListPage } from "@/lib/conversation-cache";
import type {
  GetConversationResponse,
  ListConversationsResponse,
} from "@/types/api";

export const CONVERSATION_PAGE_SIZE = 20;

export async function fetchConversationPage(
  conversationId: number,
  opts?: { beforeId?: number; limit?: number },
) {
  const params = new URLSearchParams();
  params.set("limit", String(opts?.limit ?? 30));
  if (opts?.beforeId) params.set("before_id", String(opts.beforeId));

  const { data } = await apiClient.get<GetConversationResponse>(
    `/conversations/${conversationId}?${params.toString()}`,
  );
  return data;
}

export async function fetchConversationList(
  offset: number,
): Promise<ConversationListPage> {
  const { data } = await apiClient.get<ListConversationsResponse>(
    "/conversations",
    { params: { limit: CONVERSATION_PAGE_SIZE, offset } },
  );
  return {
    offset,
    // `count` = jumlah mentah dari server. Dipake buat nentuin masih ada
    // halaman berikutnya atau nggak, terpisah dari `items` yang bisa
    // dimodif lokal (mis. nambah chat baru di paling atas).
    count: data.conversations.length,
    items: data.conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updated_at: c.updated_at,
    })),
  };
}

export async function deleteConversation(id: number) {
  await apiClient.delete(`/conversations/${id}`);
}
