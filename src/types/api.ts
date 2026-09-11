// Tipe-tipe ini dijaga supaya 1:1 sama struct/DTO di aisan-be (internal/model,
// internal/handler). Kalau BE nambah field, update di sini juga.

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RegisterResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface ApiErrorBody {
  error: string;
}

// --- Chat ---

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: number;
  conversation_id: number;
  parent_message_id?: number | null;
  model_id?: number | null;
  role: MessageRole;
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  finish_reason?: string | null;
  latency_ms?: number | null;
  status: string;
  is_edited: boolean;
  edited_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  workspace_id?: number | null;
  folder_id?: number | null;
  user_id: number;
  model_id?: number | null;
  knowledge_base_id?: number | null;
  title: string;
  system_prompt?: string | null;
  temperature: number;
  top_p: number;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
  created_at: string;
  updated_at: string;
}

export interface GetConversationResponse {
  conversation: Conversation;
  messages: Message[];
  has_more: boolean;
  next_cursor: number | null;
}
