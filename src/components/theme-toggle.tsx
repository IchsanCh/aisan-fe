import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeStore, type Theme } from "@/store/theme-store";

const order: Theme[] = ["light", "dark", "system"];
const icons = { light: Sun, dark: Moon, system: Monitor };
const labels = { light: "Light", dark: "Dark", system: "System" };

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const Icon = icons[theme];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${labels[theme]}`}
      title={`Theme: ${labels[theme]}`}
      onClick={() => setTheme(order[(order.indexOf(theme) + 1) % order.length])}
    >
      <Icon className="size-4" />
    </Button>
  );
}

export { ThemeToggle };
