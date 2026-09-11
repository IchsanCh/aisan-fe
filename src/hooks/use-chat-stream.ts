import * as React from "react";
import { refreshAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore, type ChatMessageItem } from "@/store/chat-store";
import { parseSSEStream } from "@/lib/sse";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

let toolCallSeq = 0;

async function postChat(
  body: { conversation_id: number | null; message: string },
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
  const conversationId = useChatStore((s) => s.conversationId);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const pushMessage = useChatStore((s) => s.pushMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);

  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const sendMessage = React.useCallback(
    async (text: string) => {
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

      try {
        const payload = { conversation_id: conversationId, message: trimmed };
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
              if (!conversationId) setConversationId(parsed.conversation_id);
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
              updateMessage(assistantId, (m) => ({
                ...m,
                status: m.status === "failed" ? "failed" : "completed",
                toolCalls: (m.toolCalls ?? []).map((t) => ({
                  ...t,
                  status: "done",
                })),
              }));
              break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(
            (err as Error).message ||
              "Sesi kamu abis atau gagal connect, coba login lagi.",
          );
          updateMessage(assistantId, (m) => ({ ...m, status: "failed" }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [
      conversationId,
      pushMessage,
      setConversationId,
      setStreaming,
      updateMessage,
    ],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, stop, error };
}
