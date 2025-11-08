import { useState } from "react";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Tangent {
  id: string;
  highlighted_text: string;
  content: string;
  created_at: string;
  replies?: Tangent[];
}

interface TangentThreadProps {
  tangent: Tangent;
  level?: number;
  onReply: (tangentId: string, content: string) => void;
}

export const TangentThread = ({ tangent, level = 0, onReply }: TangentThreadProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = () => {
    console.log('TangentThread handleReply called:', { tangentId: tangent.id, content: replyContent });
    onReply(tangent.id, replyContent);
    setReplyContent("");
    setIsReplying(false);
  };

  return (
    <div 
      className={cn(
        "border-l-2 border-muted pl-4 py-2",
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
            <div className="text-sm text-muted-foreground italic">
              "{tangent.highlighted_text}"
            </div>
            
            {!isCollapsed && (
              <>
                <div className="text-sm">
                  {tangent.content}
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
                      placeholder="Write a tangent reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => {
                        console.log('Post Reply button clicked! tangent.id:', tangent.id, 'content:', replyContent);
                        handleReply();
                      }}>
                        Post Reply
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

        {/* Nested replies */}
        {!isCollapsed && tangent.replies && tangent.replies.length > 0 && (
          <div className="space-y-1">
            {tangent.replies.map((reply) => (
              <TangentThread
                key={reply.id}
                tangent={reply}
                level={level + 1}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};