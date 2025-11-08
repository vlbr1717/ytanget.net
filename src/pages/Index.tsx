import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { useConversations } from "@/hooks/useConversations";
import { ScrollArea } from "@/components/ui/scroll-area";

const Index = () => {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { streamChat, isLoading } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    loading: convsLoading,
    createConversation,
    updateConversationTitle,
    addMessage,
    updateLastMessage,
    addTangent,
    deleteConversation,
  } = useConversations();

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

  const handleNewChat = async () => {
    const newId = await createConversation();
    if (newId) {
      setActiveConvId(newId);
    }
  };

  const handleDeleteChat = (convId: string) => {
    const newActiveId = deleteConversation(convId);
    
    // If we deleted the active conversation
    if (convId === activeConvId) {
      if (newActiveId) {
        // A new conversation was created
        setActiveConvId(newActiveId);
      } else {
        // Switch to first remaining conversation
        const remaining = conversations.filter(c => c.id !== convId);
        setActiveConvId(remaining[0]?.id || null);
      }
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
        // updateLastMessage already created the assistant message, just update title if needed
        const currentConv = conversations.find(c => c.id === activeConvId);
        if (currentConv?.title === "New Chat" && allMessages.length > 0) {
          const newTitle = allMessages[0].content.slice(0, 30) + 
            (allMessages[0].content.length > 30 ? "..." : "");
          await updateConversationTitle(activeConvId, newTitle);
        }
      }
    );
  };

  if (convsLoading) {
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
        onDeleteChat={handleDeleteChat}
      />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <h1 className="text-xl font-semibold">ytangent</h1>
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
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  tangents={msg.tangents}
                  messageIndex={i}
                  onAddTangent={(messageIndex, selectedText, startPos, endPos, content, parentTangentId) => {
                    if (activeConvId) {
                      addTangent(activeConvId, messageIndex, selectedText, startPos, endPos, content, parentTangentId);
                    }
                  }}
                />
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
