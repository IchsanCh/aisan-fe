import { create } from "zustand";

export type UploadStatus = "queued" | "uploading" | "processing" | "failed";

// Upload yang masih "di jalan" (atau gagal sebelum jadi dokumen). Begitu
// sukses, item-nya dihapus dan dokumennya pindah ke cache daftar dokumen.
export interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  progress: number; // 0..1, cuma bermakna pas "uploading"
  error: string | null;
  // Conversation tujuan. null = chat kosong (belum ada conversation di
  // server); keisi begitu upload pertama dari chat itu bikin conversation.
  conversationId: number | null;
  // Chat kosong asal file ini (lihat chat-store), buat ngenalin item yang
  // masih null-target milik chat kosong yang mana.
  draftKey: string;
  // Model pilihan user pas file dipilih; dipake kalau upload ini yang bikin
  // conversation baru.
  modelId: number | null;
}

interface UploadState {
  items: UploadItem[];
  add: (items: UploadItem[]) => void;
  patch: (id: string, partial: Partial<UploadItem>) => void;
  remove: (id: string) => void;
  // Item null-target dari chat kosong `draftKey` -> arahkan ke conversation
  // yang baru dibikin, biar file berikutnya di antrean masuk conversation
  // yang SAMA (bukan bikin conversation baru lagi).
  adopt: (draftKey: string, conversationId: number) => void;
  clear: () => void;
}

export const useUploadStore = create<UploadState>()((set) => ({
  items: [],
  add: (items) => set((s) => ({ items: [...s.items, ...items] })),
  patch: (id, partial) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...partial } : i)),
    })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  adopt: (draftKey, conversationId) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.conversationId === null && i.draftKey === draftKey
          ? { ...i, conversationId }
          : i,
      ),
    })),
  clear: () => set({ items: [] }),
}));
