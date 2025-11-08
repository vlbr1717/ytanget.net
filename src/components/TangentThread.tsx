import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TangentSelector } from "@/components/TangentSelector";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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
  sub_tangents?: Tangent[];
}

interface TangentThreadProps {
  tangent: Tangent;
  level?: number;
  onReply: (tangentId: string, content: string) => void;
  onCreateSubTangent?: (parentTangentId: string, highlightedText: string, content: string) => void;
  initialCollapsed?: boolean;
}

export const TangentThread = ({ tangent, level = 0, onReply, onCreateSubTangent, initialCollapsed = false }: TangentThreadProps) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showTangentSelector, setShowTangentSelector] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [childrenCollapsedState, setChildrenCollapsedState] = useState<Record<string, boolean>>({});
  const tangentRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Update collapsed state when initialCollapsed prop changes
  useEffect(() => {
    setIsCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // When collapsing, also collapse all children
    if (newCollapsedState && tangent.sub_tangents) {
      const allChildrenCollapsed: Record<string, boolean> = {};
      const collapseRecursive = (tangents: Tangent[]) => {
        tangents.forEach(t => {
          allChildrenCollapsed[t.id] = true;
          if (t.sub_tangents) {
            collapseRecursive(t.sub_tangents);
          }
        });
      };
      collapseRecursive(tangent.sub_tangents);
      setChildrenCollapsedState(allChildrenCollapsed);
    }
  };

  const shortenText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleJumpToTangent = () => {
    if (tangentRef.current) {
      tangentRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Flash highlight effect
      tangentRef.current.classList.add("animate-pulse");
      setTimeout(() => {
        tangentRef.current?.classList.remove("animate-pulse");
      }, 1000);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    console.log('TangentThread text selection:', { text, hasCallback: !!onCreateSubTangent });
    
    if (text && text.length > 0 && onCreateSubTangent) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect && conversationRef.current?.contains(range?.commonAncestorContainer as Node)) {
        console.log('TangentThread showing selector:', { tangentId: tangent.id, text });
        setSelectedText(text);
        setSelectorPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 8
        });
        setShowTangentSelector(true);
      } else {
        console.log('TangentThread selection not in conversation');
      }
    }
  };

  const handleCreateSubTangent = (highlightedText: string, content: string) => {
    if (onCreateSubTangent) {
      onCreateSubTangent(tangent.id, highlightedText, content);
      setShowTangentSelector(false);
    }
  };

  const handleReply = () => {
    console.log('TangentThread handleReply called:', { tangentId: tangent.id, content: replyContent });
    onReply(tangent.id, replyContent);
    setReplyContent("");
    setIsReplying(false);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyContent.trim()) {
        handleReply();
      }
    }
  };

  // Get border color based on nesting level
  const getBorderColor = (level: number) => {
    const colors = [
      'border-primary',
      'border-accent', 
      'border-secondary',
      'border-primary/70',
      'border-accent/70',
    ];
    return colors[level % colors.length];
  };

  return (
    <div 
      ref={tangentRef}
      id={`tangent-${tangent.id}`}
      className={cn(
        "border-l-2 pl-4 py-2 transition-all",
        getBorderColor(level),
        level > 0 && "ml-6" // Increased indent for better visual hierarchy
      )}
    >
      <div className="space-y-2">
        {/* Thread header */}
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1 space-y-1">
            {isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="text-sm text-muted-foreground hover:text-foreground italic transition-colors cursor-pointer text-left"
              >
                "{shortenText(tangent.highlighted_text)}"
              </button>
            ) : (
              <div className="text-sm bg-muted/30 p-2 rounded border-l-2 border-primary/50 prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-md my-1"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {tangent.highlighted_text}
                </ReactMarkdown>
              </div>
            )}
            
            {!isCollapsed && (
              <>
                {/* Display conversation */}
                <div 
                  ref={conversationRef}
                  className="space-y-2 relative"
                  onMouseUp={handleTextSelection}
                >
                  {tangent.conversation.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "text-sm p-2 rounded select-text",
                        msg.role === "user" ? "bg-muted/50" : "bg-muted/20"
                      )}
                    >
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        {msg.role === "user" ? "You" : "AI"}
                      </div>
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || "");
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-md my-2"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsReplying(!isReplying)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {new Date(tangent.created_at).toLocaleString()}
                  </span>
                </div>

                {isReplying && (
                  <div className="pt-2 space-y-2">
                    <Textarea
                      placeholder="Continue the conversation... (Enter to send, Shift+Enter for new line)"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleReply}>
                        Send
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setIsReplying(false);
                          setReplyContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Nested sub-tangents */}
        {!isCollapsed && tangent.sub_tangents && tangent.sub_tangents.length > 0 && (
          <div className="space-y-1">
            {tangent.sub_tangents.map((subTangent) => (
              <TangentThread
                key={subTangent.id}
                tangent={subTangent}
                level={level + 1}
                onReply={onReply}
                onCreateSubTangent={onCreateSubTangent}
                initialCollapsed={childrenCollapsedState[subTangent.id] ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {showTangentSelector && (
        <TangentSelector
          selectedText={selectedText}
          position={selectorPosition}
          onCreateTangent={handleCreateSubTangent}
          onClose={() => setShowTangentSelector(false)}
        />
      )}
    </div>
  );
};