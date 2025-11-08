import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export const useConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId]);

  const loadConversations = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      const conversationsWithMessages = await Promise.all(
        (convData || []).map(async (conv) => {
          const { data: msgData } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });

          return {
            id: conv.id,
            title: conv.title,
            messages: (msgData || []).map(msg => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
          };
        })
      );

      setConversations(conversationsWithMessages);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to load conversations",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: "New Chat" })
        .select()
        .single();

      if (error) throw error;

      const newConv = { id: data.id, title: data.title, messages: [] };
      setConversations((prev) => [newConv, ...prev]);
      return data.id;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create conversation",
        description: error.message,
      });
      return null;
    }
  };

  const updateConversationTitle = async (convId: string, title: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", convId);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title } : c))
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update title",
        description: error.message,
      });
    }
  };

  const addMessage = async (convId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          role: message.role,
          content: message.content,
        });

      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, message] }
            : c
        )
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save message",
        description: error.message,
      });
    }
  };

  const updateLastMessage = (convId: string, content: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const msgs = [...c.messages];
        if (msgs[msgs.length - 1]?.role === "assistant") {
          msgs[msgs.length - 1] = { role: "assistant", content };
        } else {
          msgs.push({ role: "assistant", content });
        }
        return { ...c, messages: msgs };
      })
    );
  };

  return {
    conversations,
    loading,
    createConversation,
    updateConversationTitle,
    addMessage,
    updateLastMessage,
    refreshConversations: loadConversations,
  };
};
