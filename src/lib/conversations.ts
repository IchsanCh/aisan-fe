import { apiClient } from "@/lib/api-client";
import type { GetConversationResponse } from "@/types/api";

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
