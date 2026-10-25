import axios from "axios";
import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type {
  ChatDocument,
  ListDocumentsResponse,
  UploadDocumentErrorBody,
  UploadDocumentResponse,
} from "@/types/api";

// Sama dengan supportedExtensions di BE (service/document_service.go).
// .zip cuma disimpen (gak di-index RAG), sisanya diproses buat RAG.
export const DOC_EXTENSIONS = [".txt", ".md", ".pdf", ".docx", ".json", ".zip"];
export const DOC_ACCEPT_ATTR = DOC_EXTENSIONS.join(",");
// Mirror default MAX_UPLOAD_SIZE_BYTES di BE (20 MB). Kalau di server diubah,
// BE tetap nolak dengan 413 dan pesannya ditampilin apa adanya.
export const DOC_MAX_BYTES = 20_000_000;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// null = valid. Divalidasi di sisi klien biar gak ngabisin upload buat file
// yang pasti ditolak (dan, di BE, gak bikin conversation kosong gara-gara
// file ditolak).
export function validateDocumentFile(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!DOC_EXTENSIONS.includes(ext)) {
    return `Tipe ${ext || "file ini"} belum didukung (${DOC_EXTENSIONS.join(" ")})`;
  }
  if (file.size === 0) return "File kosong";
  if (file.size > DOC_MAX_BYTES) {
    return `Terlalu besar (maks ${formatBytes(DOC_MAX_BYTES)})`;
  }
  return null;
}

// Cuma field yang dipake UI yang disimpen di cache.
export interface DocSummary {
  id: number;
  name: string;
  extension: string;
  size: number | null;
  status: string;
  error: string | null;
}

export function toDocSummary(d: ChatDocument): DocSummary {
  return {
    id: d.id,
    name: d.filename || "(tanpa nama)",
    extension: d.extension ?? "",
    size: d.file_size ?? null,
    status: d.status,
    error: d.error_message ?? null,
  };
}

export function documentsKey(
  userId: number | undefined,
  conversationId: number | null,
) {
  return ["documents", userId ?? null, conversationId] as const;
}

function currentKey(conversationId: number) {
  return documentsKey(useAuthStore.getState().user?.id, conversationId);
}

export async function fetchDocuments(
  conversationId: number,
): Promise<DocSummary[]> {
  const { data } = await apiClient.get<ListDocumentsResponse>("/documents", {
    params: { conversation_id: conversationId },
  });
  return (data.documents ?? []).map(toDocSummary);
}

export async function deleteDocument(id: number) {
  await apiClient.delete(`/documents/${id}`);
}

export class UploadError extends Error {
  document: DocSummary | null;
  conversationId: number | null;

  constructor(
    message: string,
    document: DocSummary | null,
    conversationId: number | null,
  ) {
    super(message);
    this.name = "UploadError";
    this.document = document;
    this.conversationId = conversationId;
  }
}

export interface UploadResult {
  doc: DocSummary;
  conversationId: number;
}

export async function uploadDocument(
  file: File,
  target: { conversationId: number | null; modelId: number | null },
  opts: { signal: AbortSignal; onProgress: (fraction: number) => void },
): Promise<UploadResult> {
  const form = new FormData();
  // `model_id` cuma ada artinya kalau upload ini yang bikin conversation baru.
  if (target.conversationId != null) {
    form.append("conversation_id", String(target.conversationId));
  } else if (target.modelId != null) {
    form.append("model_id", String(target.modelId));
  }
  form.append("file", file);

  try {
    const { data } = await apiClient.post<UploadDocumentResponse>(
      "/documents",
      form,
      {
        signal: opts.signal,
        onUploadProgress: (e) => {
          if (e.total) opts.onProgress(e.loaded / e.total);
        },
      },
    );
    return {
      doc: toDocSummary(data.document),
      conversationId: data.conversation_id,
    };
  } catch (err) {
    if (axios.isCancel(err)) throw err;
    if (axios.isAxiosError<UploadDocumentErrorBody>(err) && err.response) {
      const body = err.response.data;
      throw new UploadError(
        body?.error || `Upload gagal (${err.response.status})`,
        body?.document ? toDocSummary(body.document) : null,
        body?.conversation_id ?? null,
      );
    }
    throw new UploadError("Gagal terhubung ke server. Coba lagi.", null, null);
  }
}

// ----- mutasi cache daftar dokumen (cuma ngubah cache yang udah ada, atau
// bikin baru kalau conversation-nya baru dibikin oleh upload itu sendiri).

export function upsertDocument(
  qc: QueryClient,
  conversationId: number,
  doc: DocSummary,
) {
  qc.setQueryData<DocSummary[]>(currentKey(conversationId), (old) =>
    old ? [doc, ...old.filter((d) => d.id !== doc.id)] : [doc],
  );
}

export function removeDocument(
  qc: QueryClient,
  conversationId: number,
  id: number,
) {
  qc.setQueryData<DocSummary[]>(currentKey(conversationId), (old) =>
    old ? old.filter((d) => d.id !== id) : old,
  );
}
