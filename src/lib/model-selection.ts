import type { ChatModel } from "@/lib/models";

export interface ModelItem {
  id: number;
  name: string;
  // true = model conversation ini udah di-nonaktifin di server. Tetap
  // ditampilin sebagai pilihan aktif sekarang, tapi gak bisa dipilih lagi.
  inactive: boolean;
}

export interface ModelSelection {
  selectedId: number | null;
  items: ModelItem[];
}

// Aturan milih model, urut prioritas:
// 1. Model yang nempel di conversation yang lagi kebuka (chatModelId).
// 2. Model terakhir yang dipilih user -- tapi cuma kalau masih aktif;
//    kalau udah dinonaktifin dan dikirim ke BE buat chat baru, BE nolak.
// 3. Model aktif pertama (id terkecil) -- sama persis dengan default BE
//    (resolveModelID: is_active, order id asc).
export function resolveModelSelection(
  models: ChatModel[],
  chatModelId: number | null,
  lastModelId: number | null,
): ModelSelection {
  const active = models.filter((m) => m.is_active);

  let selectedId: number | null;
  if (chatModelId != null) {
    selectedId = chatModelId;
  } else if (lastModelId != null && active.some((m) => m.id === lastModelId)) {
    selectedId = lastModelId;
  } else {
    selectedId = active[0]?.id ?? null;
  }

  const items: ModelItem[] = active.map((m) => ({
    id: m.id,
    name: m.name,
    inactive: false,
  }));

  if (selectedId != null && !items.some((i) => i.id === selectedId)) {
    const known = models.find((m) => m.id === selectedId);
    if (known) items.push({ id: known.id, name: known.name, inactive: true });
  }

  return { selectedId, items };
}
