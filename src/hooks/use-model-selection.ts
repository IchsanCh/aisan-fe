import * as React from "react";

import { useModels } from "@/hooks/use-models";
import { resolveModelSelection } from "@/lib/model-selection";
import { useChatStore } from "@/store/chat-store";
import { useModelStore } from "@/store/model-store";

export function useModelSelection() {
  const { data: models, isPending } = useModels();
  const chatModelId = useChatStore((s) => s.modelId);
  const setChatModelId = useChatStore((s) => s.setModelId);
  const lastModelId = useModelStore((s) => s.lastModelId);
  const setLastModelId = useModelStore((s) => s.setLastModelId);

  const { selectedId, items } = React.useMemo(
    () => resolveModelSelection(models ?? [], chatModelId, lastModelId),
    [models, chatModelId, lastModelId],
  );

  const select = React.useCallback(
    (id: number) => {
      setChatModelId(id);
      setLastModelId(id);
    },
    [setChatModelId, setLastModelId],
  );

  return { items, selectedId, select, isLoading: isPending };
}
