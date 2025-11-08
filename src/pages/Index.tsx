import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "1", title: "New Chat", messages: [] }
  ]);
  const [activeConvId, setActiveConvId] = useState<string>("1");
  const { streamChat, isLoading } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setConversations(prev => [
      ...prev,
      { id: newId, title: "New Chat", messages: [] }
    ]);
    setActiveConvId(newId);
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    
    setConversations(prev => prev.map(conv =>
      conv.id === activeConvId
        ? { ...conv, messages: [...conv.messages, userMessage] }
        : conv
    ));

    let assistantContent = "";
    const allMessages = [...messages, userMessage];

    await streamChat(
      allMessages,
      (chunk) => {
        assistantContent += chunk;
        setConversations(prev => prev.map(conv => {
          if (conv.id !== activeConvId) return conv;
          
          const msgs = [...conv.messages];
          const lastMsg = msgs[msgs.length - 1];
          
          if (lastMsg?.role === "assistant") {
            msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
          } else {
            msgs.push({ role: "assistant", content: assistantContent });
          }
          
          const title = conv.title === "New Chat" && msgs.length > 0
            ? msgs[0].content.slice(0, 30) + (msgs[0].content.length > 30 ? "..." : "")
            : conv.title;
          
          return { ...conv, messages: msgs, title };
        }));
      },
      () => {
        console.log("Stream completed");
      }
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvId}
        onNewChat={handleNewChat}
        onSelectChat={setActiveConvId}
      />
      
      <div className="flex-1 flex flex-col">
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
