import { apiClient } from "@/lib/api-client";
import type { ListNotificationsResponse } from "@/types/api";

// Cukup buat dropdown bell; yang lebih lama dari ini belum ada UI-nya.
export const NOTIFICATION_LIMIT = 20;

// Polling pelan: reminder cuma jatuh tempo per menit-an, dan scheduler BE
// sendiri jalan per interval. Polling gak jalan di tab yang lagi gak aktif
// (default react-query).
export const NOTIFICATION_POLL_MS = 30_000;

export const notificationsKey = (userId: number | undefined) =>
  ["notifications", userId ?? null] as const;

export async function fetchNotifications(): Promise<ListNotificationsResponse> {
  const { data } = await apiClient.get<ListNotificationsResponse>(
    "/notifications",
    { params: { limit: NOTIFICATION_LIMIT } },
  );
  return data;
}

export async function markAllNotificationsRead() {
  await apiClient.patch("/notifications/read-all");
}

// "baru saja", "5 menit lalu", "kemarin", ... Pakai Intl biar gak perlu
// dependency tanggal.
const rtf = new Intl.RelativeTimeFormat("id", { numeric: "auto" });

export function formatRelativeTime(iso: string, now = Date.now()) {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "baru saja";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86_400), "day");
}
