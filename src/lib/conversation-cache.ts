import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth-store";
import type { ConversationSummary } from "@/types/api";

export interface ConversationListPage {
  offset: number;
  count: number;
  items: ConversationSummary[];
}

export type ConversationListData = InfiniteData<ConversationListPage, number>;

// userId ikut masuk key: kalau akun ganti (logout -> login lain), cache
// list conversation akun sebelumnya gak kepake / bocor ke akun baru.
export function conversationListKey(userId: number | undefined) {
  return ["conversations", userId ?? null] as const;
}

function currentKey() {
  return conversationListKey(useAuthStore.getState().user?.id);
}

// Semua helper di bawah cuma mutasi cache yang UDAH ADA. Kalau sidebar
// belum pernah dibuka (cache kosong), gak ngapa-ngapain -- list bakal
// di-fetch fresh pas sidebar mount. Jadi gak ada fetch tambahan.

export function addConversationToTop(
  qc: QueryClient,
  conv: ConversationSummary,
) {
  qc.setQueryData<ConversationListData>(currentKey(), (old) => {
    if (!old || old.pages.length === 0) return old;
    const pages = old.pages.map((p) => ({
      ...p,
      items: p.items.filter((c) => c.id !== conv.id),
    }));
    pages[0] = { ...pages[0], items: [conv, ...pages[0].items] };
    return { ...old, pages };
  });
}

// Dipanggil pas ada aktivitas baru di conversation: naikin ke paling atas.
export function touchConversation(qc: QueryClient, id: number) {
  const data = qc.getQueryData<ConversationListData>(currentKey());
  if (!data) return;

  for (const page of data.pages) {
    const found = page.items.find((c) => c.id === id);
    if (found) {
      addConversationToTop(qc, {
        ...found,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  // Conversation-nya ada di halaman yang belum ke-load: tandai stale aja
  // (tanpa refetch sekarang) biar kebaca fresh pas sidebar dibuka lagi.
  qc.invalidateQueries({ queryKey: currentKey(), refetchType: "none" });
}

export function removeConversation(qc: QueryClient, id: number) {
  qc.setQueryData<ConversationListData>(currentKey(), (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            items: p.items.filter((c) => c.id !== id),
          })),
        }
      : old,
  );
}
