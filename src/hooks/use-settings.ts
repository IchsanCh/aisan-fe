import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSettings, settingsKey, updateSystemPrompt } from "@/lib/settings";
import { useAuthStore } from "@/store/auth-store";
import type { UserSettings } from "@/types/api";

export function useSettings() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: settingsKey(userId),
    queryFn: fetchSettings,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (systemPrompt: string) => updateSystemPrompt(systemPrompt),
    // Pake nilai dari response (BE nge-trim), bukan yang dikirim.
    onSuccess: (settings) =>
      queryClient.setQueryData<UserSettings>(settingsKey(userId), settings),
  });
}
