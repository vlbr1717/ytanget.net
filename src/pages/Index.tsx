import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { streamChat, isLoading } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const messages = activeConversation?.messages || [];

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load conversations from database for logged-in users
  useEffect(() => {
    if (user) {
      loadConversationsFromDB();
    }
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversationsFromDB = async () => {
    if (!user) return;

    try {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      if (convData && convData.length > 0) {
        const conversationsWithMessages = await Promise.all(
          convData.map(async (conv) => {
            const { data: msgData, error: msgError } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: true });

            if (msgError) throw msgError;

            return {
              id: conv.id,
              title: conv.title,
              messages: msgData?.map(msg => ({
                id: msg.id,
                role: msg.role as "user" | "assistant",
                content: msg.content,
                tangents: []
              })) || []
            };
          })
        );

        setConversations(conversationsWithMessages);
        setActiveConvId(conversationsWithMessages[0]?.id || "1");
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const saveConversationToDB = async (conversation: Conversation) => {
    if (!user) return;

    try {
      const { error: convError } = await supabase
        .from("conversations")
        .upsert({
          id: conversation.id,
          user_id: user.id,
          title: conversation.title,
          updated_at: new Date().toISOString()
        });

      if (convError) throw convError;

      for (const msg of conversation.messages) {
        if (msg.id) {
          const { error: msgError } = await supabase
            .from("messages")
            .upsert({
              id: msg.id,
              conversation_id: conversation.id,
              role: msg.role,
              content: msg.content
            });

          if (msgError) throw msgError;
        }
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setConversations([{ id: "1", title: "New Chat", messages: [] }]);
    setActiveConvId("1");
    toast({
      title: "Logged out",
      description: "You're now in guest mode. Chats won't be saved.",
    });
  };

  const handleNewChat = async () => {
    // Check if there's already an empty conversation
    const emptyConv = conversations.find(c => c.messages.length === 0);
    
    if (emptyConv) {
      // Just switch to the existing empty conversation
      setActiveConvId(emptyConv.id);
    } else {
      // Create a new conversation only if none are empty
      const newId = user ? crypto.randomUUID() : Date.now().toString();
      const newConv = { id: newId, title: "New Chat", messages: [] };
      
      setConversations(prev => [...prev, newConv]);
      setActiveConvId(newId);
      
      // Save to database if user is logged in
      if (user) {
        await saveConversationToDB(newConv);
      }
    }
  };

  const handleDeleteChat = async (id: string) => {
    // Delete from database if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from("conversations")
          .delete()
          .eq("id", id);

        if (error) throw error;
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }

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
            ...targetTangent.conversation.map(m => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: userMessage.content }
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
        // Save to database if user is logged in
        if (user) {
          const updatedConv = conversations.find(c => c.id === activeConvId);
          if (updatedConv) {
            setTimeout(() => saveConversationToDB(updatedConv), 500);
          }
        }
      }
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {sidebarVisible && (
        <ChatSidebar
          conversations={conversations}
          activeId={activeConvId}
          onNewChat={handleNewChat}
          onSelectChat={setActiveConvId}
          onDeleteChat={handleDeleteChat}
          onPresetClick={handlePresetClick}
          onToggleSidebar={() => setSidebarVisible(false)}
        />
      )}
      
      {!sidebarVisible && (
        <button
          onClick={() => setSidebarVisible(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-sidebar-background border border-sidebar-border rounded-md hover:bg-sidebar-accent transition-colors"
          aria-label="Show sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
          </svg>
        </button>
      )}
      
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-end p-4 border-b border-border">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Guest Mode</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                Sign In to Save Chats
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4" style={{ marginTop: '400px', marginLeft: '-50px' }}>
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
