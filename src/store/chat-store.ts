import { create } from "zustand";
import type { Message } from "@/types/api";

export type ChatMessageStatus =
  | "pending"
  | "streaming"
  | "completed"
  | "failed";

export interface ToolCallItem {
  clientId: string;
  name: string;
  argumentsRaw: string;
  status: "running" | "done";
}

export interface ChatMessageItem {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  status: ChatMessageStatus;
  toolCalls?: ToolCallItem[];
  createdAt: string;
}

function mapServerMessage(m: Message): ChatMessageItem | null {
  if (m.role !== "user" && m.role !== "assistant") return null;
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    status: m.status === "failed" ? "failed" : "completed",
    createdAt: m.created_at,
  };
}

// Penanda "chat kosong yang lagi dibuka". Ganti tiap reset() (New chat /
// pindah conversation), jadi file yang diupload di chat kosong bisa
// dikenali milik chat kosong yang mana -- walau user keburu pindah.
function newDraftKey() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface ChatState {
  conversationId: number | null;
  draftKey: string;
  // Model yang nempel di conversation yang lagi kebuka. null = belum ada
  // (chat baru) -> picker jatuh ke model terakhir dipilih / default BE.
  modelId: number | null;
  messages: ChatMessageItem[];
  hasMoreOlder: boolean;
  oldestCursor: number | null;
  isStreaming: boolean;

  setConversationId: (id: number | null) => void;
  setModelId: (id: number | null) => void;
  hydrateLatest: (
    messages: Message[],
    hasMore: boolean,
    cursor: number | null,
  ) => void;
  prependOlder: (
    messages: Message[],
    hasMore: boolean,
    cursor: number | null,
  ) => void;
  pushMessage: (message: ChatMessageItem) => void;
  updateMessage: (
    id: string | number,
    updater: (message: ChatMessageItem) => ChatMessageItem,
  ) => void;
  setStreaming: (value: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  conversationId: null,
  draftKey: newDraftKey(),
  modelId: null,
  messages: [],
  hasMoreOlder: false,
  oldestCursor: null,
  isStreaming: false,

  setConversationId: (id) => set({ conversationId: id }),
  setModelId: (id) => set({ modelId: id }),

  hydrateLatest: (messages, hasMore, cursor) =>
    set({
      messages: messages
        .map(mapServerMessage)
        .filter((m): m is ChatMessageItem => m !== null),
      hasMoreOlder: hasMore,
      oldestCursor: cursor,
    }),

  prependOlder: (messages, hasMore, cursor) =>
    set((state) => ({
      messages: [
        ...messages
          .map(mapServerMessage)
          .filter((m): m is ChatMessageItem => m !== null),
        ...state.messages,
      ],
      hasMoreOlder: hasMore,
      oldestCursor: cursor,
    })),

  pushMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // Yang di-update hampir selalu pesan paling akhir (bubble yang lagi
  // streaming), jadi cari dari belakang dan jangan map seluruh array.
  // Kalau id-nya gak ketemu (mis. store udah di-reset), state dibalikin
  // apa adanya supaya gak ada re-render sia-sia.
  updateMessage: (id, updater) =>
    set((state) => {
      const list = state.messages;
      let idx = -1;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].id === id) {
          idx = i;
          break;
        }
      }
      if (idx === -1) return state;
      const next = list.slice();
      next[idx] = updater(list[idx]);
      return { messages: next };
    }),

  setStreaming: (value) => set({ isStreaming: value }),

  reset: () =>
    set({
      conversationId: null,
      draftKey: newDraftKey(),
      modelId: null,
      messages: [],
      hasMoreOlder: false,
      oldestCursor: null,
      isStreaming: false,
    }),
}));
