import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  title: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

export const ChatSidebar = ({ conversations, activeId, onNewChat, onSelectChat }: ChatSidebarProps) => {
  return (
    <div className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <Button
              key={conv.id}
              onClick={() => onSelectChat(conv.id)}
              variant={activeId === conv.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 text-left"
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{conv.title}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
