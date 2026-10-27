import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModels } from "@/hooks/use-models";
import { useSettings, useUpdateTitleModel } from "@/hooks/use-settings";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

// Select base-ui butuh value yang bukan null buat item "tanpa pilihan";
// id model di DB mulai dari 1, jadi 0 aman dipakai sebagai "model chat".
const USE_CHAT_MODEL = 0;

interface Option {
  value: number;
  label: string;
  disabled?: boolean;
}

function TitleModelSection() {
  const settings = useSettings();
  const models = useModels();
  const update = useUpdateTitleModel();

  const loading = settings.isPending || models.isPending;
  const failed = settings.isError || models.isError;

  const options: Option[] = [];
  let value = USE_CHAT_MODEL;
  let staleName: string | null = null;

  if (settings.data && models.data) {
    options.push({ value: USE_CHAT_MODEL, label: "Sama dengan model chat" });
    for (const m of models.data) {
      if (m.is_active) options.push({ value: m.id, label: m.name });
    }

    const selectedId = settings.data.title_model_id;
    if (selectedId !== null) {
      if (options.some((o) => o.value === selectedId)) {
        value = selectedId;
      } else {
        // Model pilihan udah dinonaktifin: BE otomatis fallback ke model
        // chat, jadi tampilkan itu + peringatan, bukan nama model mati.
        staleName =
          models.data.find((m) => m.id === selectedId)?.name ?? "model ini";
      }
    }
  }

  return (
    <section aria-labelledby="title-model-heading">
      <h2 id="title-model-heading" className="text-sm font-medium">
        Title model
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Model yang bikin judul chat otomatis (sekali per chat baru). Pilih yang
        lebih murah dan cepat dari model chat. Kalau gagal, judul dibuat pakai
        model chat itu sendiri.
      </p>

      {loading ? (
        <div
          aria-busy="true"
          className="h-9 w-64 animate-pulse rounded-lg bg-secondary/60 motion-reduce:animate-none"
        />
      ) : failed ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive" role="alert">
            {getApiErrorMessage(
              settings.error ?? models.error,
              "Couldn't load settings.",
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (settings.isError) void settings.refetch();
              if (models.isError) void models.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <Select.Root
            items={options}
            value={value}
            disabled={update.isPending}
            onValueChange={(next) => {
              if (typeof next !== "number" || next === value) return;
              update.reset();
              update.mutate(next === USE_CHAT_MODEL ? null : next);
            }}
          >
            <Select.Trigger
              aria-label="Title model"
              className={cn(
                "flex h-9 w-full max-w-xs items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm outline-none select-none",
                "hover:bg-muted data-popup-open:bg-muted",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "data-disabled:pointer-events-none data-disabled:opacity-50",
              )}
            >
              <Select.Value className="truncate font-mono" />
              <Select.Icon>
                <ChevronDown className="size-4" aria-hidden="true" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Positioner
                side="bottom"
                align="start"
                sideOffset={6}
                alignItemWithTrigger={false}
                className="z-50 outline-none select-none"
              >
                <Select.Popup
                  className={cn(
                    "min-w-[max(var(--anchor-width),12rem)] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-sm outline-none",
                    "transition-[scale,opacity] duration-100 ease-out motion-reduce:transition-none",
                    "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
                  )}
                >
                  <Select.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto">
                    {options.map((o) => (
                      <Select.Item
                        key={o.value}
                        value={o.value}
                        className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                      >
                        <Select.ItemIndicator className="col-start-1">
                          <Check className="size-4" aria-hidden="true" />
                        </Select.ItemIndicator>
                        <Select.ItemText
                          className={cn(
                            "col-start-2 truncate",
                            o.value !== USE_CHAT_MODEL && "font-mono",
                          )}
                        >
                          {o.label}
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>

          <p
            role={update.isError ? "alert" : "status"}
            aria-live="polite"
            className={cn(
              "mt-1.5 text-xs",
              update.isError ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {update.isError
              ? getApiErrorMessage(update.error, "Couldn't save. Try again.")
              : staleName
                ? `${staleName} sudah nonaktif, jadi judul sementara pakai model chat.`
                : update.isSuccess
                  ? "Saved. Berlaku mulai chat baru berikutnya."
                  : ""}
          </p>
        </>
      )}
    </section>
  );
}

export { TitleModelSection };
