import { useState, useRef } from "react";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { TangentThread } from "@/components/TangentThread";
import { TangentSelector } from "@/components/TangentSelector";

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

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  tangents?: Tangent[];
  onCreateTangent?: (messageId: string, highlightedText: string, content: string, parentTangentId?: string) => void;
}

export const ChatMessage = ({ 
  role, 
  content, 
  messageId,
  tangents = [],
  onCreateTangent 
}: ChatMessageProps) => {
  const isUser = role === "user";
  const [showTangentSelector, setShowTangentSelector] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Shorten text for display
  const shortenText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Process content to replace highlighted text with tangent links
  const processedContent = tangents.reduce((text, tangent, index) => {
    const shortenedText = shortenText(tangent.highlighted_text);
    const marker = `[TANGENT_${index}_START]${shortenedText}[TANGENT_${index}_END]`;
    return text.replace(tangent.highlighted_text, marker);
  }, content);

  const handleTangentLinkClick = (tangentId: string) => {
    const element = document.getElementById(`tangent-${tangentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("animate-pulse");
      setTimeout(() => {
        element.classList.remove("animate-pulse");
      }, 1000);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0 && !isUser && messageId && onCreateTangent) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect) {
        setSelectedText(text);
        setSelectorPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 8
        });
        setShowTangentSelector(true);
      }
    }
  };

  const handleCreateTangent = (highlightedText: string, content: string) => {
    if (messageId && onCreateTangent) {
      onCreateTangent(messageId, highlightedText, content);
    }
  };

  const handleReplyToTangent = (tangentId: string, content: string) => {
    console.log('ChatMessage handleReplyToTangent called:', { tangentId, content });
    if (messageId && onCreateTangent) {
      // Find the tangent to get its highlighted text
      const findTangent = (tangents: Tangent[]): Tangent | undefined => {
        for (const t of tangents) {
          if (t.id === tangentId) return t;
          if (t.sub_tangents) {
            const found = findTangent(t.sub_tangents);
            if (found) return found;
          }
        }
      };
      
      const parentTangent = findTangent(tangents);
      console.log('Found parent tangent:', parentTangent);
      if (parentTangent) {
        console.log('Calling onCreateTangent with parentId:', tangentId);
        onCreateTangent(messageId, parentTangent.highlighted_text, content, tangentId);
      }
    }
  };
  
  return (
    <div className={cn(
      "py-8 px-4 relative",
      isUser ? "bg-chat-user" : "bg-chat-assistant"
    )}>
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className={cn(
          "w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary" : "bg-accent"
        )}>
          {isUser ? (
            <User className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Bot className="h-5 w-5 text-accent-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-4 overflow-hidden">
          <div 
            ref={contentRef}
            className="prose prose-invert max-w-none"
            onMouseUp={handleTextSelection}
          >
            <ReactMarkdown
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
                p({ children, ...props }: any) {
                  // Replace tangent markers with clickable links
                  const processChildren = (child: any): any => {
                    if (typeof child === 'string') {
                      const parts = child.split(/(\[TANGENT_\d+_START\].*?\[TANGENT_\d+_END\])/g);
                      return parts.map((part, i) => {
                        const match = part.match(/\[TANGENT_(\d+)_START\](.*?)\[TANGENT_\d+_END\]/);
                        if (match) {
                          const tangentIndex = parseInt(match[1]);
                          const displayText = match[2];
                          const tangent = tangents[tangentIndex];
                          if (tangent) {
                            return (
                              <button
                                key={i}
                                onClick={() => handleTangentLinkClick(tangent.id)}
                                className="inline text-primary hover:text-primary/80 underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
                              >
                                {displayText}
                              </button>
                            );
                          }
                        }
                        return part;
                      });
                    }
                    return child;
                  };
                  
                  return <p {...props}>{Array.isArray(children) ? children.map(processChildren) : processChildren(children)}</p>;
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>

          {/* Tangent threads */}
          {tangents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-muted">
              <div className="text-sm font-medium text-muted-foreground">
                Tangents ({tangents.length})
              </div>
              {tangents.map((tangent) => (
                <TangentThread
                  key={tangent.id}
                  tangent={tangent}
                  onReply={handleReplyToTangent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showTangentSelector && (
        <TangentSelector
          selectedText={selectedText}
          position={selectorPosition}
          onCreateTangent={handleCreateTangent}
          onClose={() => setShowTangentSelector(false)}
        />
      )}
    </div>
  );
};
