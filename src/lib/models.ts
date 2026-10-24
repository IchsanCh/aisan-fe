import { apiClient } from "@/lib/api-client";
import type { ListModelsResponse } from "@/types/api";

// Cuma field yang dipake picker yang disimpen di cache.
export interface ChatModel {
  id: number;
  name: string;
  is_active: boolean;
}

export const modelsKey = ["models"] as const;

export async function fetchModels(): Promise<ChatModel[]> {
  const { data } = await apiClient.get<ListModelsResponse>("/models");
  return data.models.map((m) => ({
    id: m.id,
    name: m.name,
    is_active: m.is_active,
  }));
}
