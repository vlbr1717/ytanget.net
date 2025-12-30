import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, MoreVertical, Trash2, FolderPlus } from "lucide-react";
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
import { FolderTree } from "@/components/FolderTree";
import { useFolders, FolderNode, ConversationItem } from "@/hooks/useFolders";
import { useDocuments } from "@/hooks/useDocuments";

interface Conversation {
  id: string;
  title: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  userId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onPresetClick: (presetId: string) => void;
  onToggleSidebar?: () => void;
  refreshFoldersRef?: React.MutableRefObject<(() => void) | null>;
}

export const ChatSidebar = ({ 
  conversations, 
  activeId, 
  userId,
  onNewChat, 
  onSelectChat, 
  onDeleteChat, 
  onPresetClick, 
  onToggleSidebar,
  refreshFoldersRef
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'conversation' | 'folder' } | null>(null);

  const {
    folders,
    unfiledConversations,
    expandedFolderIds,
    createFolder,
    renameFolder,
    updateFolderColor,
    deleteFolder,
    moveConversation,
    moveFolder,
    toggleFolderExpanded,
    refresh
  } = useFolders(userId);

  const { uploadDocument } = useDocuments(userId);

  const handleDocumentUpload = async (file: File, folderId: string) => {
    await uploadDocument(file, folderId);
  };

  // Expose refresh function to parent via ref
  if (refreshFoldersRef) {
    refreshFoldersRef.current = refresh;
  }

  // Merge local conversations with DB data for unfiled
  const mergedUnfiled: ConversationItem[] = userId 
    ? unfiledConversations 
    : conversations.map(c => ({ 
        id: c.id, 
        title: c.title, 
        folder_id: null, 
        updated_at: new Date().toISOString() 
      }));

  const handleDeleteClick = (id: string, type: 'conversation' | 'folder') => {
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'conversation') {
        onDeleteChat(itemToDelete.id);
      } else {
        await deleteFolder(itemToDelete.id);
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    await createFolder(name, parentId);
  };

  const handleMoveConversation = async (convId: string, folderId: string | null) => {
    await moveConversation(convId, folderId);
  };

  const presetItems = [
    { id: 'how-to-use', emoji: '📘', title: 'How to use', isLink: true }
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
          <h1 className="text-2xl font-semibold flex-1">Tangent</h1>
          {onToggleSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Hide sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m15 9-6 6" />
              </svg>
            </Button>
          )}
        </div>
        
        <div className="space-y-1 mb-1">
          {presetItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => item.isLink ? navigate('/how-to-use') : onPresetClick(item.id)}
              variant="outline-hover"
              className="w-full justify-start gap-2 text-foreground pl-4"
            >
              <span className="text-lg">{item.emoji}</span>
              <span>{item.title}</span>
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onNewChat}
            className="flex-1 justify-start gap-2"
            variant="outline-hover"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          {userId && (
            <Button
              onClick={() => createFolder('New Folder', null)}
              variant="outline-hover"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              title="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Folder Tree for logged-in users, simple list for guests */}
      {userId ? (
        <FolderTree
          folders={folders}
          unfiledConversations={mergedUnfiled}
          activeConversationId={activeId}
          expandedFolderIds={expandedFolderIds}
          onSelectConversation={onSelectChat}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={(id) => handleDeleteClick(id, 'folder')}
          onUpdateFolderColor={updateFolderColor}
          onToggleFolderExpanded={toggleFolderExpanded}
          onMoveConversation={handleMoveConversation}
          onMoveFolder={moveFolder}
          onDeleteConversation={(id) => handleDeleteClick(id, 'conversation')}
          userId={userId}
          onDocumentUpload={handleDocumentUpload}
        />
      ) : (
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
                  <DropdownMenuContent align="end" className="bg-popover z-50">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteClick(conv.id, 'conversation')}
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
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {itemToDelete?.type === 'folder' ? 'folder' : 'conversation'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete?.type === 'folder' 
                ? 'This will delete the folder. Conversations inside will be moved to Unfiled.'
                : 'This action cannot be undone. This will permanently delete this conversation.'}
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
