import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputPrimitive.Props, "type">;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const invalid = ariaInvalid === true || ariaInvalid === "true";

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
        <Lock
          className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
          aria-hidden="true"
        />
        <InputPrimitive
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={ariaInvalid}
          className={cn(
            "h-9 w-full min-w-0 border-0 bg-transparent py-1 text-base text-foreground outline-none transition-colors",
            "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="relative shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
