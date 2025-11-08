import { useState } from "react";
import { ChevronDown, ChevronRight, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface TangentData {
  id: string;
  content: string;
  selectedText: string;
  startPos: number;
  endPos: number;
  replies: TangentData[];
  createdAt: number;
}

interface TangentProps {
  tangent: TangentData;
  depth: number;
  onReply: (tangentId: string, content: string) => void;
}

export const Tangent = ({ tangent, depth, onReply }: TangentProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(tangent.id, replyContent);
      setReplyContent("");
      setIsReplying(false);
    }
  };

  return (
    <div
      className={cn(
        "border-l-2 border-border/50 transition-colors hover:border-primary/30",
        depth > 0 && "ml-6"
      )}
    >
      <div className="pl-4 py-2">
        <div className="flex items-start gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 mt-1 hover:bg-muted/50 rounded p-0.5 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground/70 mb-1 italic">
              re: "{tangent.selectedText}"
            </div>
            
            {!isCollapsed && (
              <>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {tangent.content}
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsReplying(!isReplying)}
                  >
                    <MessageSquarePlus className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  
                  {tangent.replies.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {tangent.replies.length} {tangent.replies.length === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>

                {isReplying && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSubmitReply}>
                        Submit
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

                {tangent.replies.map((reply) => (
                  <Tangent
                    key={reply.id}
                    tangent={reply}
                    depth={depth + 1}
                    onReply={onReply}
                  />
                ))}
              </>
            )}
            
            {isCollapsed && tangent.replies.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({tangent.replies.length} hidden)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
