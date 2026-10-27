import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotifications,
  markAllNotificationsRead,
  NOTIFICATION_POLL_MS,
  notificationsKey,
} from "@/lib/notifications";
import { useAuthStore } from "@/store/auth-store";
import type { ListNotificationsResponse } from "@/types/api";

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: notificationsKey(userId),
    queryFn: fetchNotifications,
    refetchInterval: NOTIFICATION_POLL_MS,
    staleTime: NOTIFICATION_POLL_MS / 2,
    gcTime: 5 * 60_000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: markAllNotificationsRead,
    // Pessimistic: badge baru hilang setelah server sukses. Gagal -> badge
    // tetap, dropdown berikutnya nyoba lagi.
    onSuccess: () =>
      queryClient.setQueryData<ListNotificationsResponse>(
        notificationsKey(userId),
        (old) =>
          old
            ? {
                unread_count: 0,
                notifications: old.notifications.map((n) => ({
                  ...n,
                  is_read: true,
                })),
              }
            : old,
      ),
  });
}
