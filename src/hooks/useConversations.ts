import { useState, useEffect } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const STORAGE_KEY = "ytangent_conversations";

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConversations(JSON.parse(stored));
      } else {
        const initialConv: Conversation = {
          id: crypto.randomUUID(),
          title: "New Chat",
          messages: [],
        };
        setConversations([initialConv]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([initialConv]));
      }
    } catch (error: any) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConversations = (convs: Conversation[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    setConversations(convs);
  };

  const createConversation = async () => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
    };
    const updated = [newConv, ...conversations];
    saveConversations(updated);
    return newConv.id;
  };

  const updateConversationTitle = async (convId: string, title: string) => {
    const updated = conversations.map((conv) =>
      conv.id === convId ? { ...conv, title } : conv
    );
    saveConversations(updated);
  };

  const addMessage = async (convId: string, message: Message) => {
    const updated = conversations.map((conv) =>
      conv.id === convId
        ? { ...conv, messages: [...conv.messages, message] }
        : conv
    );
    saveConversations(updated);
  };

  const updateLastMessage = (convId: string, content: string) => {
    const updated = conversations.map((conv) => {
      if (conv.id !== convId) return conv;

      const msgs = [...conv.messages];
      const lastMsg = msgs[msgs.length - 1];

      if (lastMsg && lastMsg.role === "assistant") {
        msgs[msgs.length - 1] = { ...lastMsg, content };
      } else {
        msgs.push({ role: "assistant", content });
      }

      return { ...conv, messages: msgs };
    });
    saveConversations(updated);
  };

  return {
    conversations,
    loading,
    createConversation,
    updateConversationTitle,
    addMessage,
    updateLastMessage,
  };
};
