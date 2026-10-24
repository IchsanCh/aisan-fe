import * as React from "react";
import { ArrowUp, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useModelSelection } from "@/hooks/use-model-selection";

// Dropdown (Base UI Select + floating-ui) lumayan berat dan gak dibutuhin
// buat render pertama, jadi dipisah jadi chunk sendiri yang di-load paralel
// sama fetch daftar model.
const ModelPicker = React.lazy(() =>
  import("@/pages/chat/model-picker").then((m) => ({ default: m.ModelPicker })),
);

interface ComposerProps {
  onSend: (text: string, modelId: number | null) => void;
  onStop: () => void;
  isStreaming: boolean;
}

function Composer({ onSend, onStop, isStreaming }: ComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const model = useModelSelection();

  const autoGrow = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSubmit = () => {
    if (isStreaming) return;
    const text = value.trim();
    if (!text) return;
    onSend(text, model.selectedId);
    setValue("");
    requestAnimationFrame(autoGrow);
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">
      <div
        className={cn(
          "mx-auto flex max-w-3xl flex-col gap-1 rounded-2xl border border-border bg-secondary/40 px-3 py-2",
          "focus-within:border-primary",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={1}
          placeholder="Tanya sesuatu…"
          className="max-h-[200px] w-full resize-none bg-transparent px-0.5 py-1.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <React.Suspense
              fallback={
                <span className="px-2 text-xs text-muted-foreground">
                  Loading models…
                </span>
              }
            >
              <ModelPicker
                items={model.items}
                selectedId={model.selectedId}
                isLoading={model.isLoading}
                // Ganti model di tengah balasan gak masuk akal.
                disabled={isStreaming}
                onSelect={model.select}
              />
            </React.Suspense>
          </div>

          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={handleSubmit}
              disabled={!value.trim()}
              aria-label="Send"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { Composer };
