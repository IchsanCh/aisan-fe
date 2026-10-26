import { apiClient } from "@/lib/api-client";
import type {
  AIModel,
  AvailableModelsResponse,
  CreateModelResponse,
  ListModelsResponse,
} from "@/types/api";

// Cuma field yang dipake UI (picker + halaman Settings) yang disimpen di cache.
export interface ChatModel {
  id: number;
  name: string;
  provider: string;
  is_active: boolean;
}

export const modelsKey = ["models"] as const;
export const availableModelsKey = ["models", "available"] as const;

// Satu-satunya provider yang didukung BE sekarang (llm.New).
export const MODEL_PROVIDER = "openai";

export function toChatModel(m: AIModel): ChatModel {
  return {
    id: m.id,
    name: m.name,
    provider: m.provider,
    is_active: m.is_active,
  };
}

export async function fetchModels(): Promise<ChatModel[]> {
  const { data } = await apiClient.get<ListModelsResponse>("/models");
  return data.models.map(toChatModel);
}

// Manggil API provider langsung (lambat, bisa gagal kalau API key salah) --
// jangan dipanggil kecuali user beneran buka panel "Add model".
export async function fetchAvailableModels(): Promise<string[]> {
  const { data } = await apiClient.get<AvailableModelsResponse>(
    "/models/available",
    { params: { provider: MODEL_PROVIDER } },
  );
  return data.available_models ?? [];
}

export async function createModel(name: string): Promise<ChatModel> {
  // Cuma provider + nama. context_window, max_output_tokens, dan flag
  // supports_* sengaja gak dikirim: nilainya ditentuin BE dari katalog model
  // yang dikenal (GET /v1/models OpenAI cuma ngasih id, gak ada metadata).
  const { data } = await apiClient.post<CreateModelResponse>("/models", {
    provider: MODEL_PROVIDER,
    name,
  });
  return toChatModel(data.model);
}

export async function setModelActive(
  id: number,
  active: boolean,
): Promise<ChatModel> {
  const { data } = await apiClient.patch<CreateModelResponse>(`/models/${id}`, {
    is_active: active,
  });
  return toChatModel(data.model);
}
