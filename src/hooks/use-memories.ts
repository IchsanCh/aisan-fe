import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteMemory,
  fetchMemories,
  memoriesKey,
  updateMemory,
} from "@/lib/memories";
import { useAuthStore } from "@/store/auth-store";
import type { UserMemory } from "@/types/api";

export function useMemories() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: memoriesKey(userId),
    queryFn: fetchMemories,
    // AI bisa nambah memory kapan aja dari chat, jadi gak di-cache lama.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

// Pessimistic (cache baru diupdate setelah server sukses): gagal -> cache
// gak disentuh, jadi gak perlu rollback.
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      updateMemory(id, content),
    onSuccess: (memory) =>
      queryClient.setQueryData<UserMemory[]>(memoriesKey(userId), (old) =>
        old?.map((m) => (m.id === memory.id ? memory : m)),
      ),
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: deleteMemory,
    onSuccess: (_data, id) =>
      queryClient.setQueryData<UserMemory[]>(memoriesKey(userId), (old) =>
        old?.filter((m) => m.id !== id),
      ),
  });
}
