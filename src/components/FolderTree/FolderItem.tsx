import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Folder,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  FileUp,
  MessageSquarePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FolderNode, ConversationItem } from '@/hooks/useFolders';
import { ConversationItemComponent } from './ConversationItem';
import { DocumentList } from './DocumentList';
import { cn } from '@/lib/utils';

const FOLDER_COLORS = [
  'hsl(243 94% 68%)',
  'hsl(258 90% 66%)',
  'hsl(330 81% 60%)',
  'hsl(0 84% 60%)',
  'hsl(20 90% 60%)',
  'hsl(48 95% 55%)',
  'hsl(142 71% 45%)',
  'hsl(190 95% 40%)',
];

interface FolderItemProps {
  folder: FolderNode;
  depth: number;
  isExpanded: boolean;
  activeConversationId: string | null;
  onToggleExpanded: (folderId: string) => void;
  onSelectConversation: (id: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onUpdateColor: (folderId: string, color: string) => void;
  onMoveConversation: (convId: string, folderId: string | null) => void;
  onDeleteConversation: (convId: string) => void;
  userId: string;
  onDocumentUpload: (file: File, folderId: string) => Promise<void>;
  onCreateChatInFolder?: (folderId: string) => void;
}

export function FolderItem({
  folder,
  depth,
  isExpanded,
  activeConversationId,
  onToggleExpanded,
  onSelectConversation,
  onRename,
  onDelete,
  onCreateSubfolder,
  onUpdateColor,
  onMoveConversation,
  onDeleteConversation,
  userId,
  onDocumentUpload,
  onCreateChatInFolder
}: FolderItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onDocumentUpload(file, folder.id);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      folder
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  const totalItems = folder.conversations.length + folder.children.length;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
          "hover:bg-sidebar-accent",
          isOver && "bg-primary/10 ring-2 ring-primary/30",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onToggleExpanded(folder.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onToggleExpanded(folder.id);
        }}
      >
        {/* Expand/Collapse */}
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform text-muted-foreground flex-shrink-0",
            isExpanded && "rotate-90"
          )}
        />

        {/* Folder Icon */}
        <Folder
          className="h-4 w-4 flex-shrink-0"
          style={{ color: folder.color }}
          fill={isExpanded ? folder.color : 'none'}
        />

        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="flex-1 bg-background border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{folder.name}</span>
        )}

        {/* Item count badge */}
        {!isExpanded && totalItems > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {totalItems}
          </span>
        )}

        {/* Plus button with popover menu */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
              aria-label="Folder actions"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2 bg-popover z-50" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1">
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-sidebar-accent w-full text-left"
                onClick={() => {
                  setIsEditing(true);
                  setPopoverOpen(false);
                }}
              >
                <Pencil className="h-4 w-4" />
                Rename
              </button>
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-sidebar-accent w-full text-left"
                onClick={() => {
                  onCreateSubfolder(folder.id);
                  setPopoverOpen(false);
                }}
              >
                <FolderPlus className="h-4 w-4" />
                New subfolder
              </button>
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-sidebar-accent w-full text-left"
                onClick={() => {
                  fileInputRef.current?.click();
                  setPopoverOpen(false);
                }}
              >
                <FileUp className="h-4 w-4" />
                Upload document
              </button>
              
              <div className="border-t my-1" />
              
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground mb-2">Color</p>
                <div className="flex gap-1 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                        folder.color === color ? "border-foreground" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        onUpdateColor(folder.id, color);
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="border-t my-1" />
              
              <button
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-destructive/10 w-full text-left text-destructive"
                onClick={() => {
                  onDelete(folder.id);
                  setPopoverOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete folder
              </button>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div>
          {/* Documents in this folder */}
          <DocumentList folderId={folder.id} userId={userId} depth={depth} />
          
          {/* Child folders */}
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              isExpanded={true}
              activeConversationId={activeConversationId}
              onToggleExpanded={onToggleExpanded}
              onSelectConversation={onSelectConversation}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              onUpdateColor={onUpdateColor}
              onMoveConversation={onMoveConversation}
              onDeleteConversation={onDeleteConversation}
              userId={userId}
              onDocumentUpload={onDocumentUpload}
              onCreateChatInFolder={onCreateChatInFolder}
            />
          ))}

          {/* Conversations in this folder */}
          {folder.conversations.map((conv) => (
            <ConversationItemComponent
              key={conv.id}
              conversation={conv}
              depth={depth + 1}
              isActive={conv.id === activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onMoveToUnfiled={() => onMoveConversation(conv.id, null)}
            />
          ))}

        </div>
      )}
    </div>
  );
}
