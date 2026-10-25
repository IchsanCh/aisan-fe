import * as React from "react";
import { AlertCircle, FileArchive, FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeleteDocument } from "@/hooks/use-attachments";
import { formatBytes, type DocSummary } from "@/lib/documents";
import { cancelUpload, dismissUpload } from "@/lib/upload-runner";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/store/upload-store";

const chipClass =
  "relative flex max-w-[16rem] min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border bg-background py-1 pr-1 pl-2 text-xs";

function uploadStatusText(item: UploadItem) {
  if (item.status === "queued") return "Menunggu";
  if (item.status === "uploading") return `${Math.round(item.progress * 100)}%`;
  if (item.status === "processing") return "Memproses…";
  return "";
}

function UploadChip({ item }: { item: UploadItem }) {
  const failed = item.status === "failed";
  const cancellable = item.status === "queued" || item.status === "uploading";

  return (
    <li
      className={cn(
        chipClass,
        failed ? "border-destructive/50" : "border-border",
      )}
    >
      {failed ? (
        <AlertCircle
          className="size-3.5 shrink-0 text-destructive"
          aria-hidden="true"
        />
      ) : (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}

      <div className="min-w-0">
        <div className="truncate" title={item.name}>
          {item.name}
        </div>
        {failed && item.error && (
          <div className="line-clamp-2 text-destructive">{item.error}</div>
        )}
      </div>

      {!failed && (
        <span className="shrink-0 text-muted-foreground">
          {uploadStatusText(item)}
        </span>
      )}

      {(cancellable || failed) && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={
            failed ? `Dismiss ${item.name}` : `Cancel upload ${item.name}`
          }
          onClick={() =>
            failed ? dismissUpload(item.id) : cancelUpload(item.id)
          }
          className="shrink-0 text-muted-foreground"
        >
          <X />
        </Button>
      )}

      {item.status === "uploading" && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-150 motion-reduce:transition-none"
          style={{ width: `${Math.round(item.progress * 100)}%` }}
        />
      )}
    </li>
  );
}

interface DocChipProps {
  doc: DocSummary;
  confirming: boolean;
  deleting: boolean;
  failedDelete: boolean;
  onAskDelete: (id: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: number) => void;
}

function DocChip({
  doc,
  confirming,
  deleting,
  failedDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: DocChipProps) {
  const failed = doc.status === "failed";
  const stored = doc.status === "stored";
  const processing = doc.status === "processing";

  if (confirming) {
    return (
      <li className={cn(chipClass, "border-border")}>
        <span
          role={failedDelete ? "alert" : undefined}
          className={cn(
            "min-w-0 flex-1 truncate",
            failedDelete ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {failedDelete
            ? "Gagal menghapus. Coba lagi."
            : `Hapus ${doc.name} permanen?`}
        </span>
        <Button
          type="button"
          size="xs"
          variant="destructive"
          disabled={deleting}
          onClick={() => onConfirmDelete(doc.id)}
        >
          {deleting ? (
            <Loader2 className="animate-spin" aria-label="Deleting" />
          ) : (
            "Hapus"
          )}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={deleting}
          autoFocus
          onClick={onCancelDelete}
        >
          Batal
        </Button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        chipClass,
        failed ? "border-destructive/50" : "border-border",
      )}
    >
      {failed ? (
        <AlertCircle
          className="size-3.5 shrink-0 text-destructive"
          aria-hidden="true"
        />
      ) : processing ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : stored ? (
        <FileArchive
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      ) : (
        <FileText
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}

      <div className="min-w-0">
        <div className="truncate" title={doc.name}>
          {doc.name}
        </div>
        {failed && doc.error && (
          <div className="line-clamp-2 text-destructive">{doc.error}</div>
        )}
      </div>

      {!failed && (
        <span
          className="shrink-0 text-muted-foreground"
          title={
            stored ? "Disimpan, tidak di-index untuk pencarian" : undefined
          }
        >
          {processing
            ? "Memproses…"
            : stored
              ? "Disimpan"
              : doc.size != null
                ? formatBytes(doc.size)
                : ""}
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${doc.name}`}
        onClick={() => onAskDelete(doc.id)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X />
      </Button>
    </li>
  );
}

interface AttachmentsProps {
  conversationId: number | null;
  docs: DocSummary[];
  uploads: UploadItem[];
  docsError: boolean;
}

function Attachments({
  conversationId,
  docs,
  uploads,
  docsError,
}: AttachmentsProps) {
  const {
    mutate: deleteMutate,
    reset: resetDelete,
    isPending,
    isError,
    variables,
  } = useDeleteDocument();
  const [confirmingId, setConfirmingId] = React.useState<number | null>(null);

  const handleAsk = React.useCallback(
    (id: number) => {
      resetDelete();
      setConfirmingId(id);
    },
    [resetDelete],
  );
  const handleCancel = React.useCallback(() => {
    resetDelete();
    setConfirmingId(null);
  }, [resetDelete]);
  const handleConfirm = React.useCallback(
    (id: number) => {
      if (conversationId == null) return;
      deleteMutate(
        { id, conversationId },
        { onSuccess: () => setConfirmingId(null) },
      );
    },
    [conversationId, deleteMutate],
  );

  const failedCount = uploads.filter((u) => u.status === "failed").length;
  const busy = uploads.some((u) => u.status !== "failed");

  if (docs.length === 0 && uploads.length === 0 && !docsError) return null;

  // Dokumen dari server datang terbaru-dulu; tampilin urut lama -> baru,
  // dan upload yang lagi jalan nyambung di ujungnya.
  const ordered = docs.slice().reverse();

  return (
    <div>
      <ul
        aria-label="Attached files"
        className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pb-1"
      >
        {ordered.map((doc) => (
          <DocChip
            key={`d-${doc.id}`}
            doc={doc}
            confirming={confirmingId === doc.id}
            deleting={isPending && variables?.id === doc.id}
            failedDelete={isError && variables?.id === doc.id}
            onAskDelete={handleAsk}
            onCancelDelete={handleCancel}
            onConfirmDelete={handleConfirm}
          />
        ))}
        {uploads.map((item) => (
          <UploadChip key={item.id} item={item} />
        ))}
      </ul>
      {docsError && (
        <p className="pb-1 text-xs text-muted-foreground">
          Couldn&apos;t load files for this chat.
        </p>
      )}
      {/* Pengumuman buat screen reader: cuma saat status berubah, tanpa persen. */}
      <span className="sr-only" aria-live="polite">
        {busy
          ? "Memproses dokumen"
          : failedCount > 0
            ? `${failedCount} file gagal diunggah`
            : ""}
      </span>
    </div>
  );
}

export { Attachments };
