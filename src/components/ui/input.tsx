import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface InputProps extends InputPrimitive.Props {
  /** Ikon opsional di sisi kiri, warnanya ikut jadi primary pas field di-fokus. */
  icon?: LucideIcon;
}

// Underline style (bukan kotak ber-border) -- garis dasar tipis & tenang,
// tapi pas fokus ada aksen 2px yang "mancar" dari tengah ke kedua ujung
// (bukan cuma ganti warna doang).
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = ariaInvalid === true || ariaInvalid === "true";

    const field = (
      <InputPrimitive
        ref={ref}
        data-slot="input"
        aria-invalid={ariaInvalid}
        className={cn(
          "h-9 w-full min-w-0 border-0 bg-transparent py-1 text-base text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          !Icon && "px-0",
          className,
        )}
        {...props}
      />
    );

    return (
      <div
        className={cn(
          "group relative flex items-center gap-2.5 border-b border-border",
          "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:origin-center after:scale-x-0",
          "after:bg-primary after:transition-transform after:duration-300 after:ease-out",
          "focus-within:after:scale-x-100",
          invalid &&
            "border-destructive after:scale-x-100 after:bg-destructive",
        )}
      >
        {Icon && (
          <Icon
            className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
            aria-hidden="true"
          />
        )}
        {field}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
