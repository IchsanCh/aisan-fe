import axios from "axios";
import type { QueryClient } from "@tanstack/react-query";

import { addConversationToTop } from "@/lib/conversation-cache";
import { DEFAULT_CONVERSATION_TITLE } from "@/lib/conversations";
import {
  UploadError,
  upsertDocument,
  uploadDocument,
  validateDocumentFile,
} from "@/lib/documents";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { useUploadStore, type UploadItem } from "@/store/upload-store";

// Antrean upload hidup di level modul (bukan di komponen): upload tetap
// jalan walau komponennya ke-unmount, dan satu-satu (BE ngeproses embedding
// secara sinkron, paralel cuma nambah risiko kena rate limit).
const pendingFiles = new Map<string, File>();
const controllers = new Map<string, AbortController>();
let running = false;
let seq = 0;
let queryClient: QueryClient | null = null;

export function enqueueUploads(
  files: File[],
  qc: QueryClient,
  modelId: number | null,
) {
  queryClient = qc;
  const chat = useChatStore.getState();

  const items: UploadItem[] = files.map((file) => {
    const id = `up-${Date.now().toString(36)}-${seq++}`;
    const problem = validateDocumentFile(file);
    if (!problem) pendingFiles.set(id, file);
    return {
      id,
      name: file.name,
      size: file.size,
      status: problem ? "failed" : "queued",
      progress: 0,
      error: problem,
      conversationId: chat.conversationId,
      draftKey: chat.draftKey,
      modelId,
    };
  });

  useUploadStore.getState().add(items);
  void run();
}

// Batalin upload yang belum selesai. Antrean: langsung dibuang. Lagi
// ngirim byte: request di-abort. Udah "processing" di server: gak bisa
// dibatalin dengan aman, jadi diabaikan.
export function cancelUpload(id: string) {
  const item = useUploadStore.getState().items.find((i) => i.id === id);
  if (!item || item.status === "processing") return;
  controllers.get(id)?.abort();
  pendingFiles.delete(id);
  useUploadStore.getState().remove(id);
}

export function dismissUpload(id: string) {
  pendingFiles.delete(id);
  useUploadStore.getState().remove(id);
}

function cancelAll() {
  for (const c of controllers.values()) c.abort();
  controllers.clear();
  pendingFiles.clear();
  useUploadStore.getState().clear();
}

// Logout / ganti akun: buang semua upload & File yang masih ketahan.
useAuthStore.subscribe((state, prev) => {
  if (prev.user && !state.user) cancelAll();
});

async function run() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const next = useUploadStore
        .getState()
        .items.find((i) => i.status === "queued");
      if (!next) break;
      await uploadOne(next.id);
    }
  } finally {
    running = false;
  }
}

async function uploadOne(id: string) {
  const store = useUploadStore.getState();
  const file = pendingFiles.get(id);
  const item = store.items.find((i) => i.id === id);
  if (!file || !item) {
    store.remove(id);
    return;
  }

  store.patch(id, { status: "uploading", progress: 0 });
  const controller = new AbortController();
  controllers.set(id, controller);

  // Target dibaca ulang di sini (bukan dari `item` di atas): kalau file
  // sebelumnya dari chat kosong yang sama baru aja bikin conversation, item
  // ini udah di-adopt ke conversation itu.
  const current = () =>
    useUploadStore.getState().items.find((i) => i.id === id) ?? item;

  try {
    const result = await uploadDocument(
      file,
      { conversationId: current().conversationId, modelId: item.modelId },
      {
        signal: controller.signal,
        onProgress: (fraction) => {
          // Semua byte udah terkirim -> sisanya waktu server ngeproses.
          useUploadStore
            .getState()
            .patch(
              id,
              fraction >= 1
                ? { status: "processing", progress: 1 }
                : { progress: fraction },
            );
        },
      },
    );

    handleConversation(current(), result.conversationId);
    if (queryClient)
      upsertDocument(queryClient, result.conversationId, result.doc);
    useUploadStore.getState().remove(id);
  } catch (err) {
    if (axios.isCancel(err)) {
      useUploadStore.getState().remove(id);
      return;
    }
    const uploadErr =
      err instanceof UploadError
        ? err
        : new UploadError("Upload gagal. Coba lagi.", null, null);

    // Conversation bisa udah kebikin di server walau upload-nya gagal.
    if (uploadErr.conversationId != null) {
      handleConversation(current(), uploadErr.conversationId);
    }

    if (uploadErr.document && uploadErr.conversationId != null && queryClient) {
      // Row dokumen "failed" kesimpen di server: tampilin sebagai chip
      // dokumen gagal (bisa dihapus), bukan item upload sementara.
      upsertDocument(queryClient, uploadErr.conversationId, uploadErr.document);
      useUploadStore.getState().remove(id);
    } else {
      useUploadStore
        .getState()
        .patch(id, { status: "failed", error: uploadErr.message });
    }
  } finally {
    pendingFiles.delete(id);
    controllers.delete(id);
  }
}

// Upload dari chat kosong yang bikin conversation baru di server: arahkan
// sisa antrean ke conversation itu, munculin di sidebar, dan -- kalau user
// masih di chat kosong yang sama -- buka conversation-nya. Kalau user keburu
// pindah, jangan dibajak tampilannya.
function handleConversation(item: UploadItem, conversationId: number) {
  if (item.conversationId !== null) return;

  useUploadStore.getState().adopt(item.draftKey, conversationId);

  if (queryClient) {
    addConversationToTop(queryClient, {
      id: conversationId,
      title: DEFAULT_CONVERSATION_TITLE,
      updated_at: new Date().toISOString(),
    });
  }

  const chat = useChatStore.getState();
  if (chat.draftKey === item.draftKey && chat.conversationId === null) {
    chat.setConversationId(conversationId);
  }
}
