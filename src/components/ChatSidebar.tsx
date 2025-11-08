import { Plus, MessageSquare, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface Conversation {
  id: string;
  title: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export const ChatSidebar = ({ conversations, activeId, onNewChat, onSelectChat, onDeleteChat }: ChatSidebarProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);

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
            <div key={conv.id} className="flex gap-1 group">
              <Button
                onClick={() => onSelectChat(conv.id)}
                variant={activeId === conv.id ? "secondary" : "ghost"}
                className="flex-1 justify-start gap-2 text-left"
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => {
                      setConvToDelete(conv.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this conversation and all its messages. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (convToDelete) {
                      onDeleteChat(convToDelete);
                      setConvToDelete(null);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </ScrollArea>
    </div>
  );
};
