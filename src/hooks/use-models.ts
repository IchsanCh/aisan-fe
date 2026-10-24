import { useQuery } from "@tanstack/react-query";

import { fetchModels, modelsKey } from "@/lib/models";

export function useModels() {
  return useQuery({
    queryKey: modelsKey,
    queryFn: fetchModels,
    // Daftar model jarang berubah: ambil sekali, simpen lama, dan jangan
    // refetch tiap window focus. Dropdown cuma baca dari cache ini.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
