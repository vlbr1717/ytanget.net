export type ChatModelId =
  | 'openai/gpt-5'
  | 'openai/gpt-5-mini'
  | 'openai/gpt-5.2'
  | 'google/gemini-2.5-pro'
  | 'google/gemini-2.5-flash'
  | 'google/gemini-3-flash-preview'
  | 'google/gemini-3.1-pro-preview';

export interface ChatModelOption {
  id: ChatModelId;
  label: string;
  description: string;
}

export const CHAT_MODELS: ChatModelOption[] = [
  { id: 'openai/gpt-5', label: 'GPT-5', description: 'Smartest all-rounder' },
  { id: 'openai/gpt-5.2', label: 'GPT-5.2', description: 'Latest, deep reasoning' },
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Faster, cheaper' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Strong reasoning + multimodal' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Newest Gemini reasoning' },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast, efficient' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Balanced speed' },
];

export const DEFAULT_CHAT_MODEL: ChatModelId = 'openai/gpt-5';
export const CHAT_MODEL_STORAGE_KEY = 'tangent-chat-model';

export const getStoredModel = (): ChatModelId => {
  if (typeof window === 'undefined') return DEFAULT_CHAT_MODEL;
  const stored = localStorage.getItem(CHAT_MODEL_STORAGE_KEY) as ChatModelId | null;
  if (stored && CHAT_MODELS.some((m) => m.id === stored)) return stored;
  return DEFAULT_CHAT_MODEL;
};

export const setStoredModel = (id: ChatModelId) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_MODEL_STORAGE_KEY, id);
};
