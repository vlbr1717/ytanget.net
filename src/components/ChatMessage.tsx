import { useState, useRef } from "react";
import { User, Bot, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Tangent, TangentData } from "@/components/Tangent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  tangents?: TangentData[];
  messageIndex: number;
  onAddTangent: (messageIndex: number, selectedText: string, startPos: number, endPos: number, content: string, parentTangentId?: string) => void;
}

export const ChatMessage = ({ role, content, tangents = [], messageIndex, onAddTangent }: ChatMessageProps) => {
  const isUser = role === "user";
  const [selectedText, setSelectedText] = useState("");
  const [selectionPos, setSelectionPos] = useState<{ start: number; end: number } | null>(null);
  const [showTangentInput, setShowTangentInput] = useState(false);
  const [tangentContent, setTangentContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && contentRef.current) {
      const selectedStr = selection.toString();
      const range = selection.getRangeAt(0);
      
      // Get position in the content
      const preRange = range.cloneRange();
      preRange.selectNodeContents(contentRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const startPos = preRange.toString().length;
      const endPos = startPos + selectedStr.length;
      
      setSelectedText(selectedStr);
      setSelectionPos({ start: startPos, end: endPos });
      setShowTangentInput(true);
    }
  };

  const handleSubmitTangent = () => {
    if (tangentContent.trim() && selectedText && selectionPos) {
      onAddTangent(messageIndex, selectedText, selectionPos.start, selectionPos.end, tangentContent);
      setTangentContent("");
      setShowTangentInput(false);
      setSelectedText("");
      setSelectionPos(null);
    }
  };

  const handleReplyToTangent = (tangentId: string, content: string) => {
    if (selectionPos) {
      onAddTangent(messageIndex, selectedText, selectionPos.start, selectionPos.end, content, tangentId);
    }
  };
  
  return (
    <div className={cn(
      "py-8 px-4",
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
        <div className="flex-1 space-y-2 overflow-hidden">
          <div
            ref={contentRef}
            onMouseUp={handleTextSelection}
            className="prose prose-invert max-w-none select-text"
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
            }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {showTangentInput && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border space-y-2">
              <div className="flex items-start gap-2">
                <MessageSquarePlus className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text-xs text-muted-foreground italic">
                    re: "{selectedText}"
                  </div>
                  <Textarea
                    value={tangentContent}
                    onChange={(e) => setTangentContent(e.target.value)}
                    placeholder="Start a tangent about this..."
                    className="min-h-[80px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSubmitTangent}>
                      Create Tangent
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowTangentInput(false);
                        setTangentContent("");
                        setSelectedText("");
                        setSelectionPos(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tangents.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tangents
              </div>
              {tangents.map((tangent) => (
                <Tangent
                  key={tangent.id}
                  tangent={tangent}
                  depth={0}
                  onReply={handleReplyToTangent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
