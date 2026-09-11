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

interface ChatState {
  conversationId: number | null;
  messages: ChatMessageItem[];
  hasMoreOlder: boolean;
  oldestCursor: number | null;
  isStreaming: boolean;

  setConversationId: (id: number | null) => void;
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
  messages: [],
  hasMoreOlder: false,
  oldestCursor: null,
  isStreaming: false,

  setConversationId: (id) => set({ conversationId: id }),

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

  updateMessage: (id, updater) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? updater(m) : m)),
    })),

  setStreaming: (value) => set({ isStreaming: value }),

  reset: () =>
    set({
      conversationId: null,
      messages: [],
      hasMoreOlder: false,
      oldestCursor: null,
      isStreaming: false,
    }),
}));
