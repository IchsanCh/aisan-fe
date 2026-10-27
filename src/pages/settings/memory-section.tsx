import * as React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useDeleteMemory,
  useMemories,
  useUpdateMemory,
} from "@/hooks/use-memories";
import { getApiErrorMessage } from "@/lib/api-error";
import { MEMORY_MAX } from "@/lib/memories";
import { formatRelativeTime } from "@/lib/notifications";
import { countChars } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { UserMemory } from "@/types/api";

interface EditFormProps {
  memory: UserMemory;
  onDone: () => void;
}

// Edit di tempat. Ctrl/Cmd+Enter = simpan, Esc = batal. Gak berubah /
// kosong = tombol Save mati (BE juga nolak yang kosong).
function EditForm({ memory, onDone }: EditFormProps) {
  const [value, setValue] = React.useState(memory.content);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const { mutate, isPending, isError, error } = useUpdateMemory();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const trimmed = value.trim();
  const length = countChars(trimmed);
  const over = length > MEMORY_MAX;
  const canSave =
    !isPending && trimmed !== "" && trimmed !== memory.content && !over;

  const save = () => {
    if (!canSave) return;
    mutate({ id: memory.id, content: trimmed }, { onSuccess: onDone });
  };

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        rows={3}
        readOnly={isPending}
        aria-label="Edit memory"
        aria-invalid={over || isError || undefined}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape" && !isPending) {
            e.preventDefault();
            onDone();
          }
        }}
        className="min-h-20 w-full resize-y rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:border-primary aria-invalid:border-destructive"
      />
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        <p
          role={isError ? "alert" : undefined}
          className="min-w-0 text-destructive"
        >
          {isError
            ? getApiErrorMessage(error, "Couldn't save. Try again.")
            : ""}
        </p>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {length} / {MEMORY_MAX}
          {over && <span className="sr-only"> — terlalu panjang</span>}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" disabled={!canSave} onClick={save}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function MemoryRow({ memory }: { memory: UserMemory }) {
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const del = useDeleteMemory();

  const scope = memory.folder_name ? `Folder: ${memory.folder_name}` : "Global";

  return (
    <li className="border-b border-border/60 py-3">
      {editing ? (
        <EditForm memory={memory} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {memory.content}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scope} · {formatRelativeTime(memory.updated_at)}
            </p>
          </div>

          {confirming ? (
            <div className="flex shrink-0 items-center gap-1">
              <span
                role={del.isError ? "alert" : undefined}
                className={cn(
                  "text-xs",
                  del.isError ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {del.isError ? "Couldn't delete." : "Delete permanently?"}
              </span>
              <Button
                type="button"
                size="xs"
                variant="destructive"
                disabled={del.isPending}
                onClick={() => del.mutate(memory.id)}
              >
                {del.isPending ? (
                  <Loader2 className="animate-spin" aria-label="Deleting" />
                ) : (
                  "Delete"
                )}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={del.isPending}
                autoFocus
                onClick={() => {
                  del.reset();
                  setConfirming(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit memory"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete memory"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirming(true)}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function MemorySection() {
  const memories = useMemories();

  return (
    <section aria-labelledby="memory-heading">
      <h2 id="memory-heading" className="text-sm font-medium">
        Memory
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Hal-hal yang disimpan AI dari obrolan kalian dan dipakai lintas chat.
        Semua memory yang berlaku ikut terkirim di setiap pesan (dihitung
        token), jadi hapus yang sudah gak relevan.
      </p>

      {memories.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-secondary/60 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : memories.isError ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive" role="alert">
            {getApiErrorMessage(memories.error, "Couldn't load memories.")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void memories.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : memories.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada memory. AI akan menyimpannya sendiri kalau kamu cerita
          sesuatu yang penting buat diingat.
        </p>
      ) : (
        <ul aria-label="Memories">
          {memories.data.map((m) => (
            <MemoryRow key={m.id} memory={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

export { MemorySection };
