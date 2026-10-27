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
  expires_at: string;
}

// BE bungkus token di dalam field `tokens` (lihat handler/auth_handler.go).
export interface LoginResponse {
  user: User;
  tokens: TokenPair;
}

// Register gak ngasih token -- user harus login dulu abis daftar.
export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RefreshResponse {
  tokens: TokenPair;
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

// GET /conversations -- pagination offset, BE gak ngirim `has_more`.
export interface ListConversationsResponse {
  conversations: Conversation[];
  limit: number;
  offset: number;
}

// Bentuk ringkas yang dipake sidebar. Sengaja cuma 3 field (bukan
// Conversation penuh) biar cache list-nya kecil di memori.
export interface ConversationSummary {
  id: number;
  title: string;
  updated_at: string;
}

// GET /models -- semua model terdaftar di DB (termasuk yang non-aktif).
// `id` inilah yang dikirim sebagai `model_id` di POST /chat.
export interface AIModel {
  id: number;
  provider: string;
  name: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_reasoning: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ListModelsResponse {
  models: AIModel[];
}

// PATCH /conversations/:id (rename) -- body: { title }
export interface UpdateConversationResponse {
  conversation: Conversation;
}

// GET /documents?conversation_id=ID -- dokumen di knowledge base conversation.
// `status`: processing | completed | stored (zip: disimpan, gak di-index) | failed.
export interface ChatDocument {
  id: number;
  knowledge_base_id: number;
  filename?: string;
  mime_type?: string;
  extension?: string;
  file_size?: number;
  status: string;
  total_chunks: number;
  error_message?: string;
  created_at: string;
}

export interface ListDocumentsResponse {
  documents: ChatDocument[] | null;
}

// POST /documents (multipart: file, conversation_id?, model_id?)
// 201 -> { document, conversation_id }.
// 422 -> { error, document | null, conversation_id } -- documentnya ada
// (status failed) kalau record-nya sempat kebikin sebelum gagal.
export interface UploadDocumentResponse {
  document: ChatDocument;
  conversation_id: number;
}

export interface UploadDocumentErrorBody {
  error?: string;
  document?: ChatDocument | null;
  conversation_id?: number;
}

// GET/PATCH /settings -- pengaturan global user. Sekarang cuma system prompt.
export interface UserSettings {
  system_prompt: string;
  // Model khusus judul auto-title. null = pakai model chat itu sendiri.
  title_model_id: number | null;
}

export interface SettingsResponse {
  settings: UserSettings;
}

// GET /models/available -- id model dari provider (manggil API provider
// langsung, jadi lambat). POST /models -> 201 { model } | 409 kalau udah ada.
export interface AvailableModelsResponse {
  available_models: string[] | null;
}

export interface CreateModelResponse {
  model: AIModel;
}

// GET /notifications -- `unread_count` itu TOTAL belum dibaca di server,
// bukan jumlah dari `notifications` (yang dibatasi limit).
export interface AppNotification {
  id: number;
  reminder_id?: number;
  type: string;
  title?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ListNotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

// GET /memories -- memory jangka panjang yang disimpan AI. `folder_id` /
// `folder_name` kosong = global (berlaku di semua chat).
export interface UserMemory {
  id: number;
  content: string;
  folder_id?: number;
  folder_name?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface ListMemoriesResponse {
  memories: UserMemory[];
}

export interface UpdateMemoryResponse {
  memory: UserMemory;
}
