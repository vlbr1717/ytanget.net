import { useState } from "react";
import { Plus, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

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
  onPresetClick: (presetId: string) => void;
}

export const ChatSidebar = ({ conversations, activeId, onNewChat, onSelectChat, onDeleteChat, onPresetClick }: ChatSidebarProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);

  const handleDeleteClick = (convId: string) => {
    setConvToDelete(convId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (convToDelete) {
      onDeleteChat(convToDelete);
      setDeleteDialogOpen(false);
      setConvToDelete(null);
    }
  };

  const presetItems = [
    { id: 'why-built', emoji: '💡', title: 'Why we built tangent' },
    { id: 'how-to-use', emoji: '📘', title: 'How to use' }
  ];

  return (
    <div className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-6 ml-[10px]">
          <img 
            src="/favicon.svg" 
            alt="Tangent logo" 
            className="w-8 h-8"
          />
          <h1 className="text-2xl font-semibold">Tangent</h1>
        </div>
        
        <div className="space-y-1 mb-1">
          {presetItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => onPresetClick(item.id)}
              variant="outline-hover"
              className="w-full justify-start gap-2 text-foreground pl-4"
            >
              <span className="text-lg">{item.emoji}</span>
              <span>{item.title}</span>
            </Button>
          ))}
        </div>
        
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline-hover"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div key={conv.id} className="group relative flex items-center gap-1">
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
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteClick(conv.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
