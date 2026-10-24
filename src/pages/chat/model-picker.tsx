import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ModelItem } from "@/lib/model-selection";

interface ModelPickerProps {
  items: ModelItem[];
  selectedId: number | null;
  isLoading: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
}

function ModelPicker({
  items,
  selectedId,
  isLoading,
  disabled,
  onSelect,
}: ModelPickerProps) {
  const current = items.find((i) => i.id === selectedId);

  // Belum ada model yang bisa ditampilin: lagi loading, atau list gagal
  // dimuat. Chat tetap jalan (BE pake model default), jadi gak perlu error.
  if (!current) {
    return isLoading ? (
      <span aria-busy="true" className="px-2 text-xs text-muted-foreground">
        Loading models…
      </span>
    ) : null;
  }

  // Cuma satu model: dropdown gak ada gunanya, tampilin namanya aja.
  if (items.length < 2) {
    return (
      <span className="truncate px-2 text-xs text-muted-foreground">
        {current.name}
      </span>
    );
  }

  const selectItems = items.map((i) => ({
    label: i.inactive ? `${i.name} (inactive)` : i.name,
    value: i.id,
  }));

  return (
    <Select.Root
      items={selectItems}
      value={current.id}
      disabled={disabled}
      onValueChange={(value) => {
        if (typeof value === "number") onSelect(value);
      }}
    >
      <Select.Trigger
        aria-label="Model"
        className={cn(
          "flex h-8 max-w-[14rem] items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground outline-none select-none",
          "hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground",
          "focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
        )}
      >
        <Select.Value className="truncate" />
        <Select.Icon>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          side="top"
          align="start"
          sideOffset={8}
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
              {selectItems.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  disabled={items.find((i) => i.id === item.value)?.inactive}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-lg py-1.5 pr-3 pl-2 text-sm outline-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <Select.ItemIndicator className="col-start-1">
                    <Check className="size-4" aria-hidden="true" />
                  </Select.ItemIndicator>
                  <Select.ItemText className="col-start-2 truncate">
                    {item.label}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

export { ModelPicker };
