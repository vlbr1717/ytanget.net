import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TangentMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

interface Tangent {
  id: string;
  highlighted_text: string;
  conversation: TangentMessage[];
  created_at: string;
  parent_tangent_id?: string;
  sub_tangents?: Tangent[];
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

  const handlePresetClick = (presetId: string) => {
    const newConvId = `conv-${Date.now()}`;
    let title = "";
    let initialMessage = "";

    if (presetId === 'why-built') {
      title = "Why we built tangent";
      initialMessage = "Tell me about why Tangent was built and what problem it solves.";
    } else if (presetId === 'how-to-use') {
      title = "How to use";
      initialMessage = "How do I use Tangent? What are the key features?";
    }

    const newConv: Conversation = {
      id: newConvId,
      title,
      messages: []
    };
    setConversations(prev => [...prev, newConv]);
    setActiveConvId(newConvId);

    // Automatically send the initial message
    setTimeout(() => {
      handleSendMessage(initialMessage);
    }, 100);
  };

  const handleCreateTangent = async (
    messageId: string, 
    highlightedText: string, 
    content: string,
    parentTangentId?: string,
    isSubTangent?: boolean
  ) => {
    console.log('handleCreateTangent called:', { messageId, content, parentTangentId, isSubTangent });
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    // If parentTangentId exists and isSubTangent is true, create a nested sub-tangent
    if (parentTangentId && isSubTangent) {
      // Create a new sub-tangent nested under the parent
      const newSubTangent: Tangent = {
        id: Date.now().toString(),
        highlighted_text: highlightedText,
        conversation: [
          {
            id: Date.now().toString(),
            content,
            role: "user",
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date().toISOString(),
        sub_tangents: []
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv;
        
        return {
          ...conv,
          messages: conv.messages.map(msg => {
            if (msg.id !== messageId) return msg;
            
            const addSubTangent = (tangents: Tangent[]): Tangent[] => {
              return tangents.map(t => {
                if (t.id === parentTangentId) {
                  return {
                    ...t,
                    sub_tangents: [...(t.sub_tangents || []), newSubTangent]
                  };
                }
                if (t.sub_tangents && t.sub_tangents.length > 0) {
                  return {
                    ...t,
                    sub_tangents: addSubTangent(t.sub_tangents)
                  };
                }
                return t;
              });
            };
            
            return {
              ...msg,
              tangents: addSubTangent(msg.tangents || [])
            };
          })
        };
      }));

      // Generate AI response for the sub-tangent
      if (content.trim()) {
        // Build context from parent tangent path
        const buildTangentContext = (tangents: Tangent[], targetId: string, path: Tangent[] = []): Tangent[] | null => {
          for (const t of tangents) {
            const currentPath = [...path, t];
            if (t.id === targetId) return currentPath;
            if (t.sub_tangents) {
              const found = buildTangentContext(t.sub_tangents, targetId, currentPath);
              if (found) return found;
            }
          }
          return null;
        };

        const tangentPath = buildTangentContext(message.tangents || [], parentTangentId);
        if (tangentPath) {
          // Build full context from the entire tangent path
          const contextMessages: Array<{ role: "user" | "assistant"; content: string }> = [
            { role: "assistant" as const, content: message.content }
          ];
          
          // Add all messages from parent tangent path
          for (const t of tangentPath) {
            contextMessages.push({ role: "user" as const, content: `Context: "${t.highlighted_text}"` });
            contextMessages.push(...t.conversation.map(m => ({ role: m.role, content: m.content })));
          }
          
          // Add the new sub-tangent context
          contextMessages.push({ role: "user" as const, content: `New context: "${highlightedText}"\n\n${content}` });

          let aiContent = "";
          const aiMessageId = `ai-${Date.now()}`;

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
                    
                    const updateSubTangent = (tangents: Tangent[]): Tangent[] => {
                      return tangents.map(t => {
                        if (t.id === parentTangentId) {
                          // Update the newly created sub-tangent
                          const updatedSubTangents = (t.sub_tangents || []).map(st => {
                            if (st.id === newSubTangent.id) {
                              const existingAi = st.conversation.find(m => m.id === aiMessageId);
                              if (existingAi) {
                                return {
                                  ...st,
                                  conversation: st.conversation.map(m =>
                                    m.id === aiMessageId ? { ...m, content: aiContent } : m
                                  )
                                };
                              } else {
                                return {
                                  ...st,
                                  conversation: [
                                    ...st.conversation,
                                    {
                                      id: aiMessageId,
                                      content: aiContent,
                                      role: "assistant" as const,
                                      created_at: new Date().toISOString()
                                    }
                                  ]
                                };
                              }
                            }
                            return st;
                          });
                          return { ...t, sub_tangents: updatedSubTangents };
                        }
                        if (t.sub_tangents && t.sub_tangents.length > 0) {
                          return {
                            ...t,
                            sub_tangents: updateSubTangent(t.sub_tangents)
                          };
                        }
                        return t;
                      });
                    };
                    
                    return {
                      ...msg,
                      tangents: updateSubTangent(msg.tangents || [])
                    };
                  })
                };
              }));
            },
            () => console.log("Sub-tangent AI reply completed")
          );
        }
      }
      return;
    }

    // If parentTangentId exists but not a sub-tangent, this is a reply within an existing tangent
    if (parentTangentId) {
      // Add message to the tangent's conversation
      const userMessage: TangentMessage = {
        id: Date.now().toString(),
        content,
        role: "user",
        created_at: new Date().toISOString()
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv;
        
        return {
          ...conv,
          messages: conv.messages.map(msg => {
            if (msg.id !== messageId) return msg;
            
            const addMessageToTangent = (tangents: Tangent[]): Tangent[] => {
              return tangents.map(t => {
                if (t.id === parentTangentId) {
                  return {
                    ...t,
                    conversation: [...t.conversation, userMessage]
                  };
                }
                if (t.sub_tangents && t.sub_tangents.length > 0) {
                  return {
                    ...t,
                    sub_tangents: addMessageToTangent(t.sub_tangents)
                  };
                }
                return t;
              });
            };
            
            return {
              ...msg,
              tangents: addMessageToTangent(msg.tangents || [])
            };
          })
        };
      }));

      // Generate AI reply in the same conversation
      if (content.trim()) {
        const buildTangentContext = (tangents: Tangent[], targetId: string, path: Tangent[] = []): Tangent[] | null => {
          for (const t of tangents) {
            const currentPath = [...path, t];
            if (t.id === targetId) return currentPath;
            if (t.sub_tangents) {
              const found = buildTangentContext(t.sub_tangents, targetId, currentPath);
              if (found) return found;
            }
          }
          return null;
        };

        const tangentPath = buildTangentContext(message.tangents || [], parentTangentId);
        if (tangentPath) {
          const targetTangent = tangentPath[tangentPath.length - 1];
          const contextMessages = [
            { role: "assistant" as const, content: message.content },
            { role: "user" as const, content: `Context: "${targetTangent.highlighted_text}"` },
            ...targetTangent.conversation.map(m => ({ role: m.role, content: m.content }))
          ];

          let aiContent = "";
          const aiMessageId = `ai-${Date.now()}`;

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
                    
                    const updateTangentConversation = (tangents: Tangent[]): Tangent[] => {
                      return tangents.map(t => {
                        if (t.id === parentTangentId) {
                          const existingAi = t.conversation.find(m => m.id === aiMessageId);
                          if (existingAi) {
                            return {
                              ...t,
                              conversation: t.conversation.map(m =>
                                m.id === aiMessageId ? { ...m, content: aiContent } : m
                              )
                            };
                          } else {
                            return {
                              ...t,
                              conversation: [
                                ...t.conversation,
                                {
                                  id: aiMessageId,
                                  content: aiContent,
                                  role: "assistant" as const,
                                  created_at: new Date().toISOString()
                                }
                              ]
                            };
                          }
                        }
                        if (t.sub_tangents && t.sub_tangents.length > 0) {
                          return {
                            ...t,
                            sub_tangents: updateTangentConversation(t.sub_tangents)
                          };
                        }
                        return t;
                      });
                    };
                    
                    return {
                      ...msg,
                      tangents: updateTangentConversation(msg.tangents || [])
                    };
                  })
                };
              }));
            },
            () => console.log("AI reply completed")
          );
        }
      }
      return;
    }

    // This is a new tangent - create it with initial conversation
    const newTangent: Tangent = {
      id: Date.now().toString(),
      highlighted_text: highlightedText,
      conversation: [
        {
          id: Date.now().toString(),
          content,
          role: "user",
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      sub_tangents: []
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv;
      
      return {
        ...conv,
        messages: conv.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          
          return {
            ...msg,
            tangents: [...(msg.tangents || []), newTangent]
          };
        })
      };
    }));

    // Generate AI response for new tangent if content provided
    if (content.trim()) {
      const contextMessages = [
        { role: "assistant" as const, content: message.content },
        { role: "user" as const, content: `Regarding: "${highlightedText}"\n\n${content}` }
      ];

      let aiContent = "";
      const aiMessageId = `ai-${Date.now()}`;

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
                
                return {
                  ...msg,
                  tangents: msg.tangents?.map(t => {
                    if (t.id === newTangent.id) {
                      const existingAi = t.conversation.find(m => m.id === aiMessageId);
                      if (existingAi) {
                        return {
                          ...t,
                          conversation: t.conversation.map(m =>
                            m.id === aiMessageId ? { ...m, content: aiContent } : m
                          )
                        };
                      } else {
                        return {
                          ...t,
                          conversation: [
                            ...t.conversation,
                            {
                              id: aiMessageId,
                              content: aiContent,
                              role: "assistant" as const,
                              created_at: new Date().toISOString()
                            }
                          ]
                        };
                      }
                    }
                    return t;
                  })
                };
              })
            };
          }));
        },
        () => console.log("AI reply completed")
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
          onPresetClick={handlePresetClick}
        />
      
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 pb-64">
                <p className="text-muted-foreground text-4xl">Start a conversation</p>
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
