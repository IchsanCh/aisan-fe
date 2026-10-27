import { apiClient } from "@/lib/api-client";
import type {
  ListMemoriesResponse,
  UpdateMemoryResponse,
  UserMemory,
} from "@/types/api";

// Sama dengan MaxMemoryContentRunes di BE. Semua memory yang berlaku ikut
// terkirim di SETIAP request chat (dihitung token input), makanya dibatasi.
export const MEMORY_MAX = 1000;

export const memoriesKey = (userId: number | undefined) =>
  ["memories", userId ?? null] as const;

export async function fetchMemories(): Promise<UserMemory[]> {
  const { data } = await apiClient.get<ListMemoriesResponse>("/memories");
  return data.memories;
}

// Balikin versi server (BE nge-trim), bukan versi yang dikirim.
export async function updateMemory(
  id: number,
  content: string,
): Promise<UserMemory> {
  const { data } = await apiClient.patch<UpdateMemoryResponse>(
    `/memories/${id}`,
    { content },
  );
  return data.memory;
}

export async function deleteMemory(id: number) {
  await apiClient.delete(`/memories/${id}`);
}
