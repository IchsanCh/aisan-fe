import { apiClient } from "@/lib/api-client";
import type { SettingsResponse, UserSettings } from "@/types/api";

// Sama dengan MaxSystemPromptRunes di BE. Prompt ini ikut terkirim di SETIAP
// request chat (jadi ikut dihitung token input), makanya dibatasi.
export const SYSTEM_PROMPT_MAX = 4000;

export const settingsKey = (userId: number | undefined) =>
  ["settings", userId ?? null] as const;

// Hitung per karakter (code point), sama seperti BE yang ngitung rune --
// bukan .length (UTF-16) yang bikin emoji kehitung dua.
export function countChars(text: string) {
  return Array.from(text).length;
}

export async function fetchSettings(): Promise<UserSettings> {
  const { data } = await apiClient.get<SettingsResponse>("/settings");
  return data.settings;
}

export async function updateSystemPrompt(
  systemPrompt: string,
): Promise<UserSettings> {
  const { data } = await apiClient.patch<SettingsResponse>("/settings", {
    system_prompt: systemPrompt,
  });
  return data.settings;
}

// null = hapus pilihan (judul pakai model chat). Cuma ngirim title_model_id,
// jadi system prompt gak ikut kereset.
export async function updateTitleModel(
  titleModelId: number | null,
): Promise<UserSettings> {
  const { data } = await apiClient.patch<SettingsResponse>("/settings", {
    title_model_id: titleModelId,
  });
  return data.settings;
}
