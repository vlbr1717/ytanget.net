import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Tangent {
  id: string;
  highlighted_text: string;
  content: string;
  created_at: string;
  parent_tangent_id?: string;
  replies?: Tangent[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  id?: string;
  tangents?: Tangent[];
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

  const handleDeleteChat = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (updated.length === 0) {
        const newId = Date.now().toString();
        return [{ id: newId, title: "New Chat", messages: [] }];
      }
      return updated;
    });
    
    if (activeConvId === id) {
      setConversations(prev => {
        if (prev.length > 0) {
          setActiveConvId(prev[0].id);
        }
        return prev;
      });
    }
  };

  const handleCreateTangent = async (
    messageId: string, 
    highlightedText: string, 
    content: string,
    parentTangentId?: string
  ) => {
    console.log('handleCreateTangent called:', { messageId, content, parentTangentId });
    
    // Build AI context BEFORE updating state if user provided content
    let shouldGenerateAiReply = false;
    let contextMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    
    if (content.trim()) {
      console.log('User provided content, will generate AI reply');
      const message = messages.find(m => m.id === messageId);
      if (message) {
        shouldGenerateAiReply = true;
        
        if (parentTangentId) {
          // This is a reply to an existing tangent - include thread context
          console.log('Building context from tangent thread...');
          const buildTangentContext = (tangents: Tangent[], targetId: string, path: Tangent[] = []): Tangent[] | null => {
            for (const t of tangents) {
              const currentPath = [...path, t];
              if (t.id === targetId) return currentPath;
              if (t.replies) {
                const found = buildTangentContext(t.replies, targetId, currentPath);
                if (found) return found;
              }
            }
            return null;
          };

          const tangentPath = buildTangentContext(message.tangents || [], parentTangentId);
          console.log('Found tangent path:', tangentPath);
          
          if (tangentPath) {
            // Build conversation context with the full thread
            contextMessages = [
              { role: "assistant" as const, content: message.content },
              { role: "user" as const, content: `Context: Original highlighted text: "${tangentPath[0].highlighted_text}"` }
            ];

            // Add all tangents in the thread as conversation
            tangentPath.forEach(t => {
              contextMessages.push({ role: "user" as const, content: t.content });
            });

            // Add the new user tangent
            contextMessages.push({ role: "user" as const, content });
          } else {
            shouldGenerateAiReply = false;
          }
        } else {
          // This is a new tangent - just use the highlighted text and user's tangent
          console.log('New tangent on:', highlightedText);
          contextMessages = [
            { role: "assistant" as const, content: message.content },
            { role: "user" as const, content: `Regarding this part of your message: "${highlightedText}"\n\n${content}` }
          ];
        }
      }
    }

    // Create and add the user's tangent
    const newTangent: Tangent = {
      id: Date.now().toString(),
      highlighted_text: highlightedText,
      content,
      created_at: new Date().toISOString(),
      parent_tangent_id: parentTangentId,
      replies: []
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv;
      
      return {
        ...conv,
        messages: conv.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          
          // If this is a top-level tangent (no parent)
          if (!parentTangentId) {
            return {
              ...msg,
              tangents: [...(msg.tangents || []), newTangent]
            };
          }
          
          // If this is a reply to another tangent, nest it
          const addReplyToTangent = (tangents: Tangent[]): Tangent[] => {
            return tangents.map(t => {
              if (t.id === parentTangentId) {
                return {
                  ...t,
                  replies: [...(t.replies || []), newTangent]
                };
              }
              if (t.replies && t.replies.length > 0) {
                return {
                  ...t,
                  replies: addReplyToTangent(t.replies)
                };
              }
              return t;
            });
          };
          
          return {
            ...msg,
            tangents: addReplyToTangent(msg.tangents || [])
          };
        })
      };
    }));

    // Generate AI response if needed
    if (shouldGenerateAiReply) {
      console.log('Generating AI reply with context:', contextMessages);
      let aiContent = "";
      const aiTangentId = `ai-${Date.now()}`;

      await streamChat(
        contextMessages,
        (chunk) => {
          aiContent += chunk;
          
          setConversations(prev => prev.map(conv => {
            if (conv.id !== activeConvId) return conv;
            
            return {
              ...conv,
              messages: conv.messages.map(msg => {
                if (msg.id !== messageId) return msg;
                
                const addOrUpdateAiReply = (tangents: Tangent[]): Tangent[] => {
                  return tangents.map(t => {
                    if (t.id === newTangent.id) {
                      const existingAiReply = t.replies?.find(r => r.id === aiTangentId);
                      if (existingAiReply) {
                        return {
                          ...t,
                          replies: t.replies?.map(r => 
                            r.id === aiTangentId 
                              ? { ...r, content: aiContent }
                              : r
                          )
                        };
                      } else {
                        return {
                          ...t,
                          replies: [
                            ...(t.replies || []),
                            {
                              id: aiTangentId,
                              highlighted_text: highlightedText,
                              content: aiContent,
                              created_at: new Date().toISOString(),
                              parent_tangent_id: newTangent.id,
                              replies: []
                            }
                          ]
                        };
                      }
                    }
                    if (t.replies && t.replies.length > 0) {
                      return {
                        ...t,
                        replies: addOrUpdateAiReply(t.replies)
                      };
                    }
                    return t;
                  });
                };
                
                return {
                  ...msg,
                  tangents: addOrUpdateAiReply(msg.tangents || [])
                };
              })
            };
          }));
        },
        () => {
          console.log("AI tangent reply completed");
        }
      );
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { 
      role: "user", 
      content,
      id: `user-${Date.now()}`,
      tangents: []
    };
    
    setConversations(prev => prev.map(conv =>
      conv.id === activeConvId
        ? { ...conv, messages: [...conv.messages, userMessage] }
        : conv
    ));

    let assistantContent = "";
    const allMessages = [...messages, userMessage];
    const assistantMessageId = `assistant-${Date.now()}`;

    await streamChat(
      allMessages.map(m => ({ role: m.role, content: m.content })),
      (chunk) => {
        assistantContent += chunk;
        setConversations(prev => prev.map(conv => {
          if (conv.id !== activeConvId) return conv;
          
          const msgs = [...conv.messages];
          const lastMsg = msgs[msgs.length - 1];
          
          if (lastMsg?.role === "assistant") {
            msgs[msgs.length - 1] = { 
              ...lastMsg,
              content: assistantContent 
            };
          } else {
            msgs.push({ 
              role: "assistant", 
              content: assistantContent,
              id: assistantMessageId,
              tangents: []
            });
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
        onDeleteChat={handleDeleteChat}
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
                <ChatMessage 
                  key={msg.id || i} 
                  role={msg.role} 
                  content={msg.content}
                  messageId={msg.id}
                  tangents={msg.tangents}
                  onCreateTangent={handleCreateTangent}
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
