import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, PanelLeftClose, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useConversationList,
  useDeleteConversation,
  useRenameConversation,
} from "@/hooks/use-conversation-list";
import { CONVERSATION_TITLE_MAX } from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import type { ConversationSummary } from "@/types/api";

type Row =
  | { kind: "header"; key: string; label: string }
  | { kind: "item"; key: string; conv: ConversationSummary };

// Tinggi baris tetap -> virtualizer gak perlu ngukur DOM tiap item.
const HEADER_HEIGHT = 32;
const ITEM_HEIGHT = 40;

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupLabel(updatedAt: string, todayStart: number) {
  const days = Math.round(
    (todayStart - startOfDay(new Date(updatedAt))) / DAY_MS,
  );
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 7) return "7 hari terakhir";
  if (days < 30) return "30 hari terakhir";
  return "Lebih lama";
}

function buildRows(items: ConversationSummary[]): Row[] {
  const todayStart = startOfDay(new Date());
  const seen = new Set<number>();
  const rows: Row[] = [];
  let lastLabel = "";

  for (const conv of items) {
    // Pagination offset + urutan updated_at bisa geser pas ada chat naik
    // ke atas, jadi item yang sama kadang muncul di dua halaman.
    if (seen.has(conv.id)) continue;
    seen.add(conv.id);

    const label = groupLabel(conv.updated_at, todayStart);
    if (label !== lastLabel) {
      rows.push({ kind: "header", key: `h-${rows.length}-${label}`, label });
      lastLabel = label;
    }
    rows.push({ kind: "item", key: `c-${conv.id}`, conv });
  }
  return rows;
}

interface RenameFieldProps {
  initial: string;
  saving: boolean;
  failed: boolean;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

// Input rename di dalam baris. Enter = simpan, Esc = batal, blur = simpan
// (kalau valid & berubah). Kosong / gak berubah -> batal tanpa request.
function RenameField({
  initial,
  saving,
  failed,
  onSubmit,
  onCancel,
}: RenameFieldProps) {
  const [draft, setDraft] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Dipake biar blur yang kepicu abis Enter/Esc (atau pas input di-unmount)
  // gak nge-submit / nge-cancel dua kali.
  const settledRef = React.useRef(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Request gagal: input tetap kebuka, jadi boleh coba simpan lagi.
  React.useEffect(() => {
    if (failed) settledRef.current = false;
  }, [failed]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === initial.trim()) {
      settledRef.current = true;
      onCancel();
      return;
    }
    settledRef.current = true;
    onSubmit(next);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 pl-2">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={CONVERSATION_TITLE_MAX}
        readOnly={saving}
        aria-label="Chat title"
        aria-busy={saving || undefined}
        aria-invalid={failed || undefined}
        title={failed ? "Couldn't rename. Try again." : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!saving) commit();
          } else if (e.key === "Escape") {
            // Jangan ikut nutup drawer mobile (listener Escape di window).
            e.stopPropagation();
            settledRef.current = true;
            onCancel();
          }
        }}
        onBlur={() => {
          if (settledRef.current || saving) return;
          if (failed) {
            settledRef.current = true;
            onCancel();
            return;
          }
          commit();
        }}
        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30"
      />
      {saving && (
        <Loader2
          className="size-4 shrink-0 animate-spin text-muted-foreground"
          aria-label="Saving"
        />
      )}
      {failed && (
        <span role="alert" className="sr-only">
          Couldn&apos;t rename. Try again.
        </span>
      )}
    </div>
  );
}

interface ConversationRowProps {
  conv: ConversationSummary;
  active: boolean;
  confirming: boolean;
  deleting: boolean;
  failed: boolean;
  editing: boolean;
  renaming: boolean;
  renameFailed: boolean;
  onSelect: (id: number, e: React.MouseEvent) => void;
  onAskDelete: (id: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: number) => void;
  onAskRename: (id: number) => void;
  onSubmitRename: (id: number, title: string) => void;
  onCancelRename: () => void;
}

// Tombol aksi di baris (rename / delete): di desktop muncul pas hover atau
// fokus (selalu keliatan di baris aktif); di layar sentuh gak ada hover,
// jadi di bawah md selalu keliatan.
const rowActionClass =
  "text-muted-foreground focus-visible:opacity-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100 max-md:opacity-100";

const ConversationRow = React.memo(function ConversationRow({
  conv,
  active,
  confirming,
  deleting,
  failed,
  editing,
  renaming,
  renameFailed,
  onSelect,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onAskRename,
  onSubmitRename,
  onCancelRename,
}: ConversationRowProps) {
  const label = conv.title || "Untitled chat";
  const linkRef = React.useRef<HTMLAnchorElement>(null);

  // Abis edit selesai input-nya hilang dan fokus jatuh ke body. Balikin ke
  // link baris ini -- tapi cuma kalau fokus emang "kosong"; kalau user
  // udah klik ke tempat lain (blur), jangan direbut.
  const wasEditingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasEditingRef.current && !editing) {
      const el = document.activeElement;
      if (!el || el === document.body) {
        linkRef.current?.focus({ preventScroll: true });
      }
    }
    wasEditingRef.current = editing;
  }, [editing]);

  return (
    <div
      className={cn(
        "group/row relative flex h-10 items-center rounded-lg pr-1",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/60",
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary"
        />
      )}

      {editing ? (
        <RenameField
          initial={conv.title}
          saving={renaming}
          failed={renameFailed}
          onSubmit={(title) => onSubmitRename(conv.id, title)}
          onCancel={onCancelRename}
        />
      ) : confirming ? (
        <div className="flex min-w-0 flex-1 items-center gap-1 pl-3">
          <span
            role={failed ? "alert" : undefined}
            className={cn(
              "min-w-0 flex-1 truncate text-xs",
              failed ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {failed ? "Couldn't delete. Try again." : "Delete permanently?"}
          </span>
          <Button
            type="button"
            size="xs"
            variant="destructive"
            disabled={deleting}
            onClick={() => onConfirmDelete(conv.id)}
          >
            {deleting ? (
              <Loader2 className="animate-spin" aria-label="Deleting" />
            ) : (
              "Delete"
            )}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={deleting}
            autoFocus
            onClick={onCancelDelete}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <Link
            ref={linkRef}
            to={`/chat/${conv.id}`}
            aria-current={active ? "page" : undefined}
            onClick={(e) => onSelect(conv.id, e)}
            className="flex h-full min-w-0 flex-1 items-center rounded-lg pr-2 pl-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="truncate">{label}</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Rename chat: ${label}`}
            onClick={() => onAskRename(conv.id)}
            className={cn(
              rowActionClass,
              "hover:text-foreground",
              active ? "opacity-100" : "opacity-0",
            )}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Delete chat: ${label}`}
            onClick={() => onAskDelete(conv.id)}
            className={cn(
              rowActionClass,
              "hover:text-destructive",
              active ? "opacity-100" : "opacity-0",
            )}
          >
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );
});

interface ConversationSidebarProps {
  // Dipanggil sebelum pindah/ganti conversation: ChatPage ngasih fungsi
  // buat nge-abort stream yang lagi jalan.
  stop: () => void;
  // Dipanggil abis navigasi (mis. nutup drawer di mobile).
  onNavigate?: () => void;
  // Kalau ada, tombol X muncul (dipake di drawer mobile).
  onClose?: () => void;
  // Kalau ada, tombol collapse muncul (dipake di sidebar desktop).
  onCollapse?: () => void;
}

function ConversationSidebar({
  stop,
  onNavigate,
  onClose,
  onCollapse,
}: ConversationSidebarProps) {
  const navigate = useNavigate();
  const activeId = useChatStore((s) => s.conversationId);

  const {
    data,
    status,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useConversationList();
  const {
    mutate: deleteMutate,
    reset: resetDelete,
    isPending,
    isError: deleteFailed,
    variables,
  } = useDeleteConversation();

  const {
    mutate: renameMutate,
    reset: resetRename,
    isPending: isRenaming,
    isError: renameError,
    variables: renameVars,
  } = useRenameConversation();

  // Satu baris aja yang boleh dalam mode aksi: rename ATAU konfirmasi delete.
  const [confirmingId, setConfirmingId] = React.useState<number | null>(null);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const rows = React.useMemo(
    () => buildRows(data?.pages.flatMap((p) => p.items) ?? []),
    [data],
  );

  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) =>
      rows[i]?.kind === "header" ? HEADER_HEIGHT : ITEM_HEIGHT,
    getItemKey: (i) => rows[i]?.key ?? i,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualItems.length
    ? virtualItems[virtualItems.length - 1].index
    : -1;

  // Infinite scroll: ambil halaman berikutnya pas udah deket ujung list.
  React.useEffect(() => {
    if (
      lastVisibleIndex >= rows.length - 4 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [
    lastVisibleIndex,
    rows.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const startNewChat = () => {
    stop();
    useChatStore.getState().reset();
    navigate("/chat");
    onNavigate?.();
  };

  const handleSelect = React.useCallback(
    (id: number, e: React.MouseEvent) => {
      // Ctrl/Cmd/Shift-click = buka di tab baru, jangan ganggu stream di sini.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (useChatStore.getState().conversationId !== id) stop();
      onNavigate?.();
    },
    [stop, onNavigate],
  );

  const handleConfirmDelete = React.useCallback(
    (id: number) => {
      if (useChatStore.getState().conversationId === id) stop();
      deleteMutate(id, { onSuccess: () => setConfirmingId(null) });
    },
    [stop, deleteMutate],
  );

  const handleAskDelete = React.useCallback(
    (id: number) => {
      resetDelete();
      resetRename();
      setEditingId(null);
      setConfirmingId(id);
    },
    [resetDelete, resetRename],
  );
  const handleCancelDelete = React.useCallback(() => {
    resetDelete();
    setConfirmingId(null);
  }, [resetDelete]);

  const handleAskRename = React.useCallback(
    (id: number) => {
      resetRename();
      resetDelete();
      setConfirmingId(null);
      setEditingId(id);
    },
    [resetRename, resetDelete],
  );
  const handleCancelRename = React.useCallback(() => {
    resetRename();
    setEditingId(null);
  }, [resetRename]);
  const handleSubmitRename = React.useCallback(
    (id: number, title: string) => {
      renameMutate({ id, title }, { onSuccess: () => setEditingId(null) });
    },
    [renameMutate],
  );

  return (
    <nav
      aria-label="Chats"
      className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-1 p-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1 justify-start"
          onClick={startNewChat}
        >
          <Plus />
          New chat
        </Button>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Close chats"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
        {onCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Collapse sidebar"
            aria-expanded="true"
            onClick={onCollapse}
          >
            <PanelLeftClose />
          </Button>
        )}
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {status === "pending" ? (
          <div aria-busy="true" className="flex flex-col gap-1">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-sidebar-accent motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : isError && !data ? (
          <div className="flex flex-col items-start gap-1 px-1 py-2 text-sm">
            <p className="text-muted-foreground">Couldn&apos;t load chats.</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No chats yet. Send a message to start one.
          </p>
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize() }}
            className="relative w-full"
          >
            {virtualItems.map((vi) => {
              const row = rows[vi.index];
              if (!row) return null;
              return (
                <div
                  key={vi.key}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  {row.kind === "header" ? (
                    <div className="flex h-full items-end px-3 pb-1 text-xs font-medium text-muted-foreground">
                      {row.label}
                    </div>
                  ) : (
                    <ConversationRow
                      conv={row.conv}
                      active={row.conv.id === activeId}
                      confirming={confirmingId === row.conv.id}
                      deleting={isPending && variables === row.conv.id}
                      failed={deleteFailed && variables === row.conv.id}
                      editing={editingId === row.conv.id}
                      renaming={isRenaming && renameVars?.id === row.conv.id}
                      renameFailed={
                        renameError && renameVars?.id === row.conv.id
                      }
                      onSelect={handleSelect}
                      onAskDelete={handleAskDelete}
                      onCancelDelete={handleCancelDelete}
                      onConfirmDelete={handleConfirmDelete}
                      onAskRename={handleAskRename}
                      onSubmitRename={handleSubmitRename}
                      onCancelRename={handleCancelRename}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-label="Loading more chats"
            />
          </div>
        )}
      </div>
    </nav>
  );
}

// Drawer buat layar kecil. Isinya (termasuk virtualizer) cuma di-mount
// selama drawer kebuka, jadi gak makan memori pas ketutup.
function SidebarDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chats"
      className="fixed inset-0 z-40"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close chats"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 animate-in fade-in duration-150 motion-reduce:animate-none"
      />
      <aside className="absolute inset-y-0 left-0 w-[min(20rem,85vw)] border-r border-sidebar-border bg-sidebar animate-in slide-in-from-left duration-200 motion-reduce:animate-none">
        {children}
      </aside>
    </div>
  );
}

export { ConversationSidebar, SidebarDrawer };
