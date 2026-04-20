import { useEffect, useState } from 'react';
import { CHAT_MODELS, ChatModelId, getStoredModel, setStoredModel } from '@/lib/chatModels';

export const useChatModel = () => {
  const [model, setModelState] = useState<ChatModelId>(getStoredModel);

  useEffect(() => {
    setStoredModel(model);
  }, [model]);

  return {
    model,
    setModel: setModelState,
    models: CHAT_MODELS,
  };
};
