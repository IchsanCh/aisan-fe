import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { formatRelativeTime } from "@/lib/notifications";
import { cn } from "@/lib/utils";

function NotificationBell() {
  const { data, isError, isPending, refetch } = useNotifications();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const unreadCount = data?.unread_count ?? 0;

  // Dropdown dibuka = semua ditandai dibaca, tapi yang tadinya belum dibaca
  // tetap diberi penanda selama dropdown kebuka (snapshot id pas dibuka),
  // biar kamu masih bisa bedain mana yang baru.
  const [open, setOpen] = React.useState(false);
  const [freshIds, setFreshIds] = React.useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setFreshIds(
      new Set(
        (data?.notifications ?? []).filter((n) => !n.is_read).map((n) => n.id),
      ),
    );
    if (unreadCount > 0) markAllRead();
  };

  const items = data?.notifications ?? [];
  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            className="relative"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-4 text-primary-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-[min(22rem,calc(100vw-2rem))] origin-(--transform-origin) rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Popover.Title className="border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
              notifications_
            </Popover.Title>

            <div className="max-h-96 overflow-y-auto">
              {isPending ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading…
                </p>
              ) : isError && !data ? (
                <div className="flex flex-col items-center gap-1 px-4 py-6 text-sm">
                  <p className="text-muted-foreground">
                    Couldn&apos;t load notifications.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className="relative flex flex-col gap-0.5 px-4 py-3"
                    >
                      {freshIds.has(n.id) && (
                        <span
                          aria-label="New"
                          className="absolute top-4 left-1.5 size-1.5 rounded-full bg-primary"
                        />
                      )}
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            "min-w-0 truncate text-sm",
                            freshIds.has(n.id) ? "font-medium" : "font-normal",
                          )}
                        >
                          {n.title || "Reminder"}
                        </span>
                        <time
                          dateTime={n.created_at}
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          {formatRelativeTime(n.created_at)}
                        </time>
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
                        {n.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { NotificationBell };
