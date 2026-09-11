import * as React from "react";
import { useThemeStore, type Theme } from "@/store/theme-store";

function resolveIsDark(theme: Theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", resolveIsDark(theme));
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  React.useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") return;

    // theme "system" -- ikutin kalau OS/browser ganti preference pas app
    // masih kebuka (gak perlu reload).
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}

export { ThemeProvider };
