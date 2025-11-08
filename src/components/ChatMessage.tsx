import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  
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
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </div>
    </div>
  );
};
