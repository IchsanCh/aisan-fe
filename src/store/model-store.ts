import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModelState {
  // Model terakhir yang dipilih user -- dipake sebagai default buat chat baru.
  lastModelId: number | null;
  setLastModelId: (id: number | null) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      lastModelId: null,
      setLastModelId: (id) => set({ lastModelId: id }),
    }),
    { name: "aisan-model" },
  ),
);
