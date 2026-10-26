import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { ModelsSection } from "@/pages/settings/models-section";
import { SystemPromptSection } from "@/pages/settings/system-prompt-section";

function SettingsPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Link
            to="/chat"
            aria-label="Back to chat"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="font-mono text-sm text-muted-foreground">settings_</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8 sm:px-6">
        <SystemPromptSection />
        <div className="border-t border-border pt-10">
          <ModelsSection />
        </div>
      </main>
    </div>
  );
}

export { SettingsPage };
