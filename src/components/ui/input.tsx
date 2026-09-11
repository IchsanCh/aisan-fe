import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

// Style-nya sengaja underline, bukan kotak ber-border kayak default shadcn --
// biar form terasa kayak dokumen yang diisi, bukan kartu SaaS generik.
const Input = React.forwardRef<HTMLInputElement, InputPrimitive.Props>(
  ({ className, ...props }, ref) => {
    return (
      <InputPrimitive
        ref={ref}
        data-slot="input"
        className={cn(
          "flex h-10 w-full min-w-0 border-0 border-b border-border bg-transparent px-0 py-2 text-base text-foreground outline-none transition-colors",
          "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
          "focus-visible:border-primary",
          "aria-invalid:border-destructive",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
