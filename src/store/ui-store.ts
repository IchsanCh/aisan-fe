import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  // Sidebar conversation di desktop. Di layar kecil sidebar-nya drawer
  // yang kebuka/ketutup sendiri, jadi flag ini gak dipake di sana.
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "aisan-ui" },
  ),
);
