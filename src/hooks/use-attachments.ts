import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteDocument,
  documentsKey,
  fetchDocuments,
  removeDocument,
} from "@/lib/documents";
import { enqueueUploads } from "@/lib/upload-runner";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useUploadStore } from "@/store/upload-store";

export function useConversationDocuments(conversationId: number | null) {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: documentsKey(userId, conversationId),
    queryFn: () => fetchDocuments(conversationId as number),
    enabled: conversationId != null,
    // Cache dijaga manual lewat upload/delete, jadi gak perlu refetch tiap
    // saat; gcTime pendek biar gak numpuk di memori.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; conversationId: number }) =>
      deleteDocument(id),
    onSuccess: (_data, { id, conversationId }) =>
      removeDocument(queryClient, conversationId, id),
  });
}

// Semua yang dibutuhin composer soal lampiran: dokumen yang udah ada di
// conversation ini, upload yang lagi jalan/gagal, dan fungsi nambah file.
export function useAttachments(modelId: number | null) {
  const queryClient = useQueryClient();
  const conversationId = useChatStore((s) => s.conversationId);
  const draftKey = useChatStore((s) => s.draftKey);
  const allUploads = useUploadStore((s) => s.items);
  const docsQuery = useConversationDocuments(conversationId);

  // Upload yang keliatan = yang tujuannya conversation ini, atau (di chat
  // kosong) yang berasal dari chat kosong ini.
  const uploads = React.useMemo(
    () =>
      allUploads.filter((u) =>
        u.conversationId != null
          ? u.conversationId === conversationId
          : conversationId === null && u.draftKey === draftKey,
      ),
    [allUploads, conversationId, draftKey],
  );

  // Masih ada yang belum selesai (antre / ngirim / diproses server). Selama
  // itu, kirim pesan di-disable: dokumen yang belum selesai di-embed belum
  // bisa dicari AI.
  const busy = uploads.some((u) => u.status !== "failed");

  const docs = React.useMemo(() => {
    const list = docsQuery.data ?? [];
    // Selama ada upload aktif, row "processing" dari server itu upload yang
    // sama -- disembunyiin biar gak dobel dengan chip upload-nya.
    return busy ? list.filter((d) => d.status !== "processing") : list;
  }, [docsQuery.data, busy]);

  const addFiles = React.useCallback(
    (files: File[]) => {
      if (files.length > 0) enqueueUploads(files, queryClient, modelId);
    },
    [queryClient, modelId],
  );

  return {
    conversationId,
    uploads,
    docs,
    busy,
    docsError: docsQuery.isError && conversationId != null,
    addFiles,
  };
}
