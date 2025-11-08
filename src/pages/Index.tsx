import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { streamChat, isLoading } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    conversations,
    loading: convsLoading,
    createConversation,
    updateConversationTitle,
    addMessage,
    updateLastMessage,
  } = useConversations(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleNewChat = async () => {
    const newId = await createConversation();
    if (newId) {
      setActiveConvId(newId);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConvId) return;

    const userMessage = { role: "user" as const, content };
    await addMessage(activeConvId, userMessage);

    let assistantContent = "";
    const allMessages = [...messages, userMessage];

    await streamChat(
      allMessages,
      (chunk) => {
        assistantContent += chunk;
        updateLastMessage(activeConvId, assistantContent);
      },
      async () => {
        await addMessage(activeConvId, { role: "assistant", content: assistantContent });
        
        const currentConv = conversations.find(c => c.id === activeConvId);
        if (currentConv?.title === "New Chat" && allMessages.length > 0) {
          const newTitle = allMessages[0].content.slice(0, 30) + 
            (allMessages[0].content.length > 30 ? "..." : "");
          await updateConversationTitle(activeConvId, newTitle);
        }
      }
    );
  };

  if (convsLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        onNewChat={handleNewChat}
        onSelectChat={setActiveConvId}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">ytangent</h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-semibold">ytangent</h1>
                <p className="text-muted-foreground">Start a conversation</p>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
            </div>
          )}
        </ScrollArea>
        
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default Index;
