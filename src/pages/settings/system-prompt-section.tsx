import * as React from "react";

import { Button } from "@/components/ui/button";
import { useSettings, useUpdateSystemPrompt } from "@/hooks/use-settings";
import { getApiErrorMessage } from "@/lib/api-error";
import { countChars, SYSTEM_PROMPT_MAX } from "@/lib/settings";
import { cn } from "@/lib/utils";

const SAVED_FLASH_MS = 3000;

function SystemPromptForm({ initial }: { initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [justSaved, setJustSaved] = React.useState(false);
  const update = useUpdateSystemPrompt();
  const { mutate, reset, isPending, isError, error } = update;

  // `initial` = nilai tersimpan di server (cache). Beda dari isi textarea
  // berarti ada perubahan yang belum disimpan.
  const dirty = value !== initial;
  // BE nge-trim sebelum nyimpen & ngitung, jadi hitungnya ikut di-trim.
  const length = countChars(value.trim());
  const over = length > SYSTEM_PROMPT_MAX;
  const canSave = dirty && !over && !isPending;

  // Peringatan bawaan browser kalau tab ditutup/di-reload dengan perubahan
  // yang belum disimpan.
  React.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Indikator "Saved" cuma sebentar.
  React.useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [justSaved]);

  const save = () => {
    if (!canSave) return;
    setJustSaved(false);
    mutate(value, {
      onSuccess: (settings) => {
        setValue(settings.system_prompt);
        setJustSaved(true);
      },
    });
  };

  return (
    <div>
      <textarea
        id="system-prompt"
        aria-labelledby="system-prompt-heading"
        aria-describedby="system-prompt-meta"
        aria-invalid={over || undefined}
        value={value}
        rows={10}
        placeholder="Contoh: Kamu asisten pribadi yang menjawab ringkas dalam bahasa Indonesia. Kalau ada kode, kasih contoh yang bisa langsung dijalankan."
        onChange={(e) => {
          setValue(e.target.value);
          setJustSaved(false);
          if (isError) reset();
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
        className={cn(
          "min-h-40 w-full resize-y rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70",
          "focus-visible:border-primary aria-invalid:border-destructive",
        )}
      />

      <div
        id="system-prompt-meta"
        className="mt-1.5 flex items-start justify-between gap-3 text-xs"
      >
        <p
          role={isError ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "min-w-0",
            isError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {isError
            ? getApiErrorMessage(error, "Couldn't save. Try again.")
            : justSaved
              ? "Saved. Berlaku mulai pesan berikutnya."
              : dirty
                ? "Unsaved changes"
                : ""}
        </p>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {length} / {SYSTEM_PROMPT_MAX}
          {over && <span className="sr-only"> — terlalu panjang</span>}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!canSave} onClick={save}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              reset();
              setValue(initial);
            }}
          >
            Revert
          </Button>
        )}
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              if (isError) reset();
              setValue("");
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function SystemPromptSection() {
  const settings = useSettings();

  return (
    <section aria-labelledby="system-prompt-heading">
      <h2 id="system-prompt-heading" className="text-sm font-medium">
        System prompt
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Instruksi yang dikirim ke AI di awal setiap percakapan, berlaku untuk
        semua chat. Dihitung sebagai token di setiap pesan, jadi tulis
        seperlunya.
      </p>

      {settings.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <div className="h-40 animate-pulse rounded-xl bg-secondary/60 motion-reduce:animate-none" />
        </div>
      ) : settings.isError ? (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-destructive" role="alert">
            {getApiErrorMessage(settings.error, "Couldn't load settings.")}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void settings.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : (
        <SystemPromptForm initial={settings.data.system_prompt} />
      )}
    </section>
  );
}

export { SystemPromptSection };
