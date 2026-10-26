import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  availableModelsKey,
  createModel,
  fetchAvailableModels,
  fetchModels,
  modelsKey,
  setModelActive,
  type ChatModel,
} from "@/lib/models";

export function useModels() {
  return useQuery({
    queryKey: modelsKey,
    queryFn: fetchModels,
    // Daftar model jarang berubah: ambil sekali, simpen lama, dan jangan
    // refetch tiap window focus. Dropdown cuma baca dari cache ini.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Cache `models` dipake bareng picker di composer, jadi tiap perubahan dari
// halaman Settings langsung kelihatan di sana tanpa fetch ulang.
function upsertModel(qc: QueryClient, model: ChatModel) {
  const old = qc.getQueryData<ChatModel[]>(modelsKey);
  if (!old) {
    void qc.invalidateQueries({ queryKey: modelsKey });
    return;
  }
  qc.setQueryData<ChatModel[]>(
    modelsKey,
    [...old.filter((m) => m.id !== model.id), model].sort(
      (a, b) => a.id - b.id,
    ),
  );
}

// Daftar dari provider: lambat dan gak berubah-ubah, jadi di-cache sebentar
// dan cuma di-fetch pas panel "Add model" dibuka (enabled).
export function useAvailableModels(enabled: boolean) {
  return useQuery({
    queryKey: availableModelsKey,
    queryFn: fetchAvailableModels,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useAddModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createModel(name),
    onSuccess: (model) => upsertModel(queryClient, model),
  });
}

export function useSetModelActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      setModelActive(id, active),
    onSuccess: (model) => upsertModel(queryClient, model),
  });
}
