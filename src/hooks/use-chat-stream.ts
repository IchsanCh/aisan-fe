import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  addConversationToTop,
  touchConversation,
  updateConversationTitle,
} from "@/lib/conversation-cache";
import { refreshAccessToken } from "@/lib/api-client";
import { modelsKey } from "@/lib/models";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore, type ChatMessageItem } from "@/store/chat-store";
import { parseSSEStream } from "@/lib/sse";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

let toolCallSeq = 0;

const TITLE_MAX = 50;

// BE nerima `title` pas bikin conversation baru; tanpa ini semuanya jadi
// "New Conversation" dan sidebar isinya judul kembar.
function deriveTitle(message: string) {
  const oneLine = message.replace(/\s+/g, " ").trim();
  return oneLine.length > TITLE_MAX
    ? `${oneLine.slice(0, TITLE_MAX).trimEnd()}…`
    : oneLine;
}

async function postChat(
  body: {
    conversation_id: number | null;
    message: string;
    title?: string;
    model_id?: number;
  },
  accessToken: string | null,
  signal: AbortSignal,
) {
  return fetch(`${baseURL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
    },
    body: JSON.stringify(body),
    signal,
  });
}

export function useChatStream() {
  const queryClient = useQueryClient();
  const conversationId = useChatStore((s) => s.conversationId);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setModelId = useChatStore((s) => s.setModelId);
  const pushMessage = useChatStore((s) => s.pushMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const sendMessage = React.useCallback(
    async (text: string, modelId?: number | null) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setError(null);

      const userMessage: ChatMessageItem = {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        status: "completed",
        createdAt: new Date().toISOString(),
      };
      pushMessage(userMessage);

      const assistantId = `stream-${Date.now()}`;
      pushMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        status: "streaming",
        toolCalls: [],
        createdAt: new Date().toISOString(),
      });

      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      // true begitu event `done` datang: balasan udah lengkap. Koneksi bisa
      // masih kebuka beberapa detik buat nunggu event `title`.
      let finished = false;

      try {
        const title = conversationId ? undefined : deriveTitle(trimmed);
        const payload = {
          conversation_id: conversationId,
          message: trimmed,
          title,
          // BE otomatis nge-update model conversation kalau beda; kalau
          // gak ada (list model belum ke-load) BE pake model default.
          model_id: modelId ?? undefined,
        };
        let activeConversationId = conversationId;
        let accessToken = useAuthStore.getState().accessToken;
        let res = await postChat(payload, accessToken, controller.signal);

        // Token invalid/expired -- coba refresh sekali (single-flight, sama
        // kayak yang dipake axios interceptor), baru retry request-nya.
        // Cuma logout beneran kalau refresh-nya juga gagal.
        if (res.status === 401) {
          accessToken = await refreshAccessToken();
          res = await postChat(payload, accessToken, controller.signal);
        }

        if (!res.ok || !res.body) {
          throw new Error(`Chat request gagal (${res.status})`);
        }

        for await (const evt of parseSSEStream(res)) {
          switch (evt.event) {
            case "start": {
              const parsed = JSON.parse(evt.data) as {
                conversation_id: number;
              };
              activeConversationId = parsed.conversation_id;
              if (!conversationId) {
                setConversationId(parsed.conversation_id);
                // Conversation baru nempel ke model yang barusan dipakai.
                if (modelId != null) setModelId(modelId);
                addConversationToTop(queryClient, {
                  id: parsed.conversation_id,
                  title: title ?? "New Conversation",
                  updated_at: new Date().toISOString(),
                });
              }
              break;
            }
            case "message": {
              const parsed = JSON.parse(evt.data) as { content: string };
              updateMessage(assistantId, (m) => ({
                ...m,
                content: m.content + parsed.content,
              }));
              break;
            }
            case "tool_call": {
              const parsed = JSON.parse(evt.data) as {
                name: string;
                arguments: string;
              };
              updateMessage(assistantId, (m) => ({
                ...m,
                toolCalls: [
                  ...(m.toolCalls ?? []).map((t) => ({
                    ...t,
                    status: "done" as const,
                  })),
                  {
                    clientId: `tc-${toolCallSeq++}`,
                    name: parsed.name,
                    argumentsRaw: parsed.arguments,
                    status: "running" as const,
                  },
                ],
              }));
              break;
            }
            case "error": {
              const parsed = JSON.parse(evt.data) as { message: string };
              setError(parsed.message);
              updateMessage(assistantId, (m) => ({ ...m, status: "failed" }));
              break;
            }
            case "done": {
              finished = true;
              // Balasan udah lengkap: bebasin composer sekarang, jangan
              // nunggu koneksi ditutup (BE masih bisa nahan stream sebentar
              // buat ngirim judul AI).
              setStreaming(false);
              updateMessage(assistantId, (m) => ({
                ...m,
                status: m.status === "failed" ? "failed" : "completed",
                toolCalls: (m.toolCalls ?? []).map((t) => ({
                  ...t,
                  status: "done",
                })),
              }));
              // Ada aktivitas baru -> naikin ke paling atas sidebar.
              if (activeConversationId) {
                touchConversation(queryClient, activeConversationId);
              }
              break;
            }
            case "title": {
              // Judul AI, dikirim BE sesudah `done`. Update by id, jadi tetap
              // bener walau user udah pindah conversation / kirim pesan lagi.
              const parsed = JSON.parse(evt.data) as {
                conversation_id: number;
                title: string;
              };
              updateConversationTitle(
                queryClient,
                parsed.conversation_id,
                parsed.title,
              );
              break;
            }
          }
        }
      } catch (err) {
        // Koneksi putus / data `title` rusak SETELAH `done`: balasannya udah
        // lengkap dan kesimpen, jadi jangan ditandai gagal.
        if (!finished && (err as Error).name !== "AbortError") {
          // Bisa jadi model yang dikirim barusan dinonaktifin di server:
          // tandai daftar model stale biar kebaca fresh di request berikutnya.
          if (modelId != null) {
            void queryClient.invalidateQueries({ queryKey: modelsKey });
          }
          setError(
            (err as Error).message ||
              "Sesi kamu abis atau gagal connect, coba login lagi.",
          );
          updateMessage(assistantId, (m) => ({ ...m, status: "failed" }));
        }
      } finally {
        // Reset cuma kalau request ini masih yang aktif. Stream lama yang
        // lagi nunggu `title` bisa kelar SETELAH user kirim pesan berikutnya;
        // tanpa guard ini dia bakal nge-reset state stream yang baru.
        if (abortRef.current === controller) {
          setStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [
      conversationId,
      queryClient,
      pushMessage,
      setConversationId,
      setModelId,
      setStreaming,
      updateMessage,
    ],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stop, error };
}
