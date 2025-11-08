import { useState, useEffect } from "react";

import { TangentData } from "@/components/Tangent";

export interface Message {
  role: "user" | "assistant";
  content: string;
  tangents?: TangentData[];
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

  const addTangent = (convId: string, messageIndex: number, selectedText: string, startPos: number, endPos: number, content: string, parentTangentId?: string) => {
    const newTangent: TangentData = {
      id: crypto.randomUUID(),
      content,
      selectedText,
      startPos,
      endPos,
      replies: [],
      createdAt: Date.now(),
    };

    const updated = conversations.map((conv) => {
      if (conv.id !== convId) return conv;
      
      const msgs = [...conv.messages];
      const msg = msgs[messageIndex];
      
      if (!msg) return conv;

      if (!parentTangentId) {
        // Top-level tangent
        const tangents = msg.tangents || [];
        msgs[messageIndex] = { ...msg, tangents: [...tangents, newTangent] };
      } else {
        // Reply to existing tangent
        const addReply = (tangents: TangentData[]): TangentData[] => {
          return tangents.map((t) => {
            if (t.id === parentTangentId) {
              return { ...t, replies: [...t.replies, newTangent] };
            }
            if (t.replies.length > 0) {
              return { ...t, replies: addReply(t.replies) };
            }
            return t;
          });
        };
        
        const tangents = msg.tangents || [];
        msgs[messageIndex] = { ...msg, tangents: addReply(tangents) };
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
    addTangent,
  };
};
