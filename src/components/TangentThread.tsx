import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TangentSelector } from "@/components/TangentSelector";
import { cn } from "@/lib/utils";

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
}

export const TangentThread = ({ tangent, level = 0, onReply, onCreateSubTangent }: TangentThreadProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showTangentSelector, setShowTangentSelector] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const tangentRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

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
    
    if (text && text.length > 0 && onCreateSubTangent) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect && conversationRef.current?.contains(range?.commonAncestorContainer as Node)) {
        setSelectedText(text);
        setSelectorPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 8
        });
        setShowTangentSelector(true);
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

  return (
    <div 
      ref={tangentRef}
      id={`tangent-${tangent.id}`}
      className={cn(
        "border-l-2 border-muted pl-4 py-2 transition-all",
        level > 0 && "ml-4"
      )}
    >
      <div className="space-y-2">
        {/* Thread header */}
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
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
              <div className="text-sm bg-muted/30 p-2 rounded italic border-l-2 border-primary/50">
                "{tangent.highlighted_text}"
              </div>
            )}
            
            {!isCollapsed && (
              <>
                {/* Display conversation */}
                <div 
                  ref={conversationRef}
                  className="space-y-2"
                  onMouseUp={handleTextSelection}
                >
                  {tangent.conversation.map((msg) => (
                    <div 
                      key={msg.id}
                      className={cn(
                        "text-sm p-2 rounded",
                        msg.role === "user" ? "bg-muted/50" : "bg-muted/20"
                      )}
                    >
                      <div className="font-medium text-xs text-muted-foreground mb-1">
                        {msg.role === "user" ? "You" : "AI"}
                      </div>
                      {msg.content}
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
                      placeholder="Continue the conversation..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px]"
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