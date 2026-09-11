import * as React from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallItem } from "@/store/chat-store";

// Nama tool di BE itu snake_case (search_documents, save_memory, dst) --
// tampilin versi manusiawinya di chip, tapi tetep tunjukkin nama asli pas
// di-expand (di argumentsRaw JSON).
const TOOL_LABELS: Record<string, string> = {
  search_documents: "Searching documents",
  save_memory: "Saving to memory",
  create_reminder: "Creating reminder",
  complete_reminder: "Completing reminder",
  list_reminders: "Checking reminders",
  copy_document_to_workspace: "Copying document",
  list_files: "Listing files",
  read_file: "Reading file",
  tail_file: "Reading file",
  write_file: "Writing file",
  append_file: "Writing file",
  create_folder: "Creating folder",
  extract_zip: "Extracting archive",
};

function formatArguments(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ToolCallChip({ toolCall }: { toolCall: ToolCallItem }) {
  const [expanded, setExpanded] = React.useState(false);
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;

  return (
    <div className="w-fit max-w-full rounded-md border border-border bg-secondary/50 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
      >
        <Wrench className="size-3 shrink-0" aria-hidden="true" />
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            toolCall.status === "running"
              ? "animate-pulse bg-primary"
              : "bg-muted-foreground/50",
          )}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <pre className="max-w-md overflow-x-auto border-t border-border px-2.5 py-2 font-mono text-[11px] text-muted-foreground">
          {toolCall.name}
          {"\n"}
          {formatArguments(toolCall.argumentsRaw)}
        </pre>
      )}
    </div>
  );
}

export { ToolCallChip };
