import * as React from "react";
import { Switch } from "@base-ui/react/switch";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useAddModel,
  useAvailableModels,
  useModels,
  useSetModelActive,
} from "@/hooks/use-models";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ChatModel } from "@/lib/models";
import { cn } from "@/lib/utils";

interface AddModelPanelProps {
  registered: ChatModel[];
  onClose: () => void;
}

// Panel "Add model": daftar model dari provider yang BELUM terdaftar.
// Di-mount cuma pas dibuka, jadi request ke provider (lambat) baru jalan
// saat itu, bukan tiap halaman Settings dibuka.
function AddModelPanel({ registered, onClose }: AddModelPanelProps) {
  const available = useAvailableModels(true);
  const {
    mutate: addMutate,
    isPending,
    isError,
    error,
    variables,
    reset,
  } = useAddModel();
  const [filter, setFilter] = React.useState("");

  const registeredNames = React.useMemo(
    () => new Set(registered.map((m) => m.name.toLowerCase())),
    [registered],
  );

  const items = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (available.data ?? []).filter(
      (name) =>
        !registeredNames.has(name.toLowerCase()) &&
        (q === "" || name.toLowerCase().includes(q)),
    );
  }, [available.data, registeredNames, filter]);

  const allRegistered =
    available.isSuccess &&
    (available.data ?? []).every((n) => registeredNames.has(n.toLowerCase()));

  return (
    <div className="mt-4 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Tambah dari provider</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        Chat selalu memakai tool calling, jadi pilih model yang mendukungnya.
      </p>

      {available.isPending ? (
        <p
          aria-busy="true"
          className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Mengambil daftar model dari provider…
        </p>
      ) : available.isError ? (
        <div className="flex flex-col items-start gap-2 py-1 text-sm">
          <p className="text-destructive" role="alert">
            {getApiErrorMessage(
              available.error,
              "Couldn't load available models.",
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void available.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter models…"
            aria-label="Filter available models"
            className="mb-2 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-primary"
          />

          {isError && (
            <p role="alert" className="mb-2 text-xs text-destructive">
              {getApiErrorMessage(error, "Couldn't add model.")}
            </p>
          )}

          {items.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {allRegistered
                ? "Semua model yang tersedia sudah terdaftar."
                : filter.trim()
                  ? `Tidak ada model yang cocok dengan "${filter.trim()}".`
                  : "Tidak ada model yang tersedia."}
            </p>
          ) : (
            <ul
              aria-label="Available models"
              className="max-h-72 overflow-y-auto"
            >
              {items.map((name) => {
                const adding = isPending && variables === name;
                return (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0"
                  >
                    <span className="min-w-0 truncate font-mono text-sm">
                      {name}
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      disabled={isPending}
                      aria-label={`Add ${name}`}
                      onClick={() => {
                        reset();
                        addMutate(name);
                      }}
                    >
                      {adding ? (
                        <Loader2
                          className="animate-spin motion-reduce:animate-none"
                          aria-label="Adding"
                        />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ModelsSection() {
  const models = useModels();
  const toggle = useSetModelActive();
  const [adding, setAdding] = React.useState(false);

  const list = models.data ?? [];
  const activeCount = list.filter((m) => m.is_active).length;

  return (
    <section aria-labelledby="models-heading">
      <h2 id="models-heading" className="text-sm font-medium">
        Models
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Model yang aktif muncul di pilihan model di chat. Minimal satu model
        harus tetap aktif.
      </p>

      {models.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg bg-secondary/60 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : models.isError ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive" role="alert">
            {getApiErrorMessage(models.error, "Couldn't load models.")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void models.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {toggle.isError && (
            <p role="alert" className="mb-2 text-xs text-destructive">
              {getApiErrorMessage(toggle.error, "Couldn't update model.")}
            </p>
          )}

          <ul aria-label="Registered models">
            {list.map((m) => {
              const isLastActive = m.is_active && activeCount <= 1;
              const pending = toggle.isPending && toggle.variables?.id === m.id;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5"
                >
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "block truncate font-mono text-sm",
                        !m.is_active && "text-muted-foreground",
                      )}
                    >
                      {m.name}
                    </span>
                    {(m.provider !== "openai" || !m.is_active) && (
                      <span className="text-xs text-muted-foreground">
                        {m.provider !== "openai" ? `${m.provider} · ` : ""}
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>
                  <Switch.Root
                    checked={m.is_active}
                    disabled={isLastActive || pending}
                    aria-label={`${m.name} active`}
                    title={
                      isLastActive
                        ? "Minimal satu model harus aktif"
                        : undefined
                    }
                    onCheckedChange={(checked) => {
                      toggle.reset();
                      toggle.mutate({ id: m.id, active: checked });
                    }}
                    className="flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-muted p-0.5 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-disabled:opacity-50"
                  >
                    <Switch.Thumb className="size-3.5 rounded-full bg-foreground/60 transition-transform motion-reduce:transition-none data-checked:translate-x-4 data-checked:bg-primary-foreground" />
                  </Switch.Root>
                </li>
              );
            })}
          </ul>

          {adding ? (
            <AddModelPanel registered={list} onClose={() => setAdding(false)} />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setAdding(true)}
            >
              <Plus />
              Add model
            </Button>
          )}
        </>
      )}
      {/* TODO(settings): pilihan "model khusus judul" (auto-title) bisa ditaruh
          di sini nanti -- BE-nya masih pakai model chat itu sendiri (lihat TODO
          di service/chat_title.go). */}
    </section>
  );
}

export { ModelsSection };
