import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Folder as FolderIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderNode, ConversationItem } from '@/hooks/useFolders';
import { FolderItem } from './FolderItem';
import { ConversationItemComponent } from './ConversationItem';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { groupConversationsByDate } from '@/lib/dateGroups';

interface FolderTreeProps {
  folders: FolderNode[];
  unfiledConversations: ConversationItem[];
  activeConversationId: string | null;
  expandedFolderIds: Set<string>;
  onSelectConversation: (id: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpdateFolderColor: (folderId: string, color: string) => void;
  onToggleFolderExpanded: (folderId: string) => void;
  onMoveConversation: (convId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  onDeleteConversation: (id: string) => void;
  userId: string;
  onDocumentUpload: (file: File, folderId: string) => Promise<void>;
  onCreateChatInFolder?: (folderId: string) => void;
}

export function FolderTree({
  folders,
  unfiledConversations,
  activeConversationId,
  expandedFolderIds,
  onSelectConversation,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUpdateFolderColor,
  onToggleFolderExpanded,
  onMoveConversation,
  onMoveFolder,
  onDeleteConversation,
  userId,
  onDocumentUpload,
  onCreateChatInFolder
}: FolderTreeProps) {
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{type: 'folder' | 'conversation', data: any} | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data) {
      setActiveItem({ type: data.type, data: data.folder || data.conversation });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData) return;

    // Handle dropping conversation into folder
    if (activeData.type === 'conversation') {
      if (overData?.type === 'folder') {
        onMoveConversation(activeData.conversation.id, overData.folder.id);
      } else if (over.id === 'unfiled-drop-zone') {
        onMoveConversation(activeData.conversation.id, null);
      }
    }

    // Handle dropping folder into another folder
    if (activeData.type === 'folder') {
      if (overData?.type === 'folder' && activeData.folder.id !== overData.folder.id) {
        onMoveFolder(activeData.folder.id, overData.folder.id);
      } else if (over.id === 'root-drop-zone') {
        onMoveFolder(activeData.folder.id, null);
      }
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderParentId);
      setNewFolderName('');
      setNewFolderParentId(null);
      setNewFolderDialogOpen(false);
    }
  };

  const openNewFolderDialog = (parentId: string | null = null) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setNewFolderDialogOpen(true);
  };

  // Collect all sortable ids
  const getAllIds = (): string[] => {
    const ids: string[] = [];
    const collectIds = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        ids.push(`folder-${node.id}`);
        node.conversations.forEach(c => ids.push(`conv-${c.id}`));
        collectIds(node.children);
      });
    };
    collectIds(folders);
    unfiledConversations.forEach(c => ids.push(`conv-${c.id}`));
    return ids;
  };

  // Group unfiled conversations by date
  const dateGroups = groupConversationsByDate(unfiledConversations);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">

        {/* Unified List: Folders first, then chronological conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2" id="unfiled-drop-zone">
            <SortableContext
              items={getAllIds()}
              strategy={verticalListSortingStrategy}
            >
              {/* Folders at top */}
              {folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  isExpanded={expandedFolderIds.has(folder.id)}
                  activeConversationId={activeConversationId}
                  onToggleExpanded={onToggleFolderExpanded}
                  onSelectConversation={onSelectConversation}
                  onRename={onRenameFolder}
                  onDelete={onDeleteFolder}
                  onCreateSubfolder={openNewFolderDialog}
                  onUpdateColor={onUpdateFolderColor}
                  onMoveConversation={onMoveConversation}
                  onDeleteConversation={onDeleteConversation}
                  userId={userId}
                  onDocumentUpload={onDocumentUpload}
                  onCreateChatInFolder={onCreateChatInFolder}
                />
              ))}

              {/* Date-grouped conversations */}
              {dateGroups.map((group) => (
                <div key={group.label} className="mt-3 first:mt-0">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {group.label}
                  </div>
                  {group.conversations.map((conv) => (
                    <ConversationItemComponent
                      key={conv.id}
                      conversation={conv}
                      depth={0}
                      isActive={conv.id === activeConversationId}
                      onSelect={onSelectConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              ))}
            </SortableContext>
          </div>
        </ScrollArea>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="bg-sidebar-accent rounded-lg px-3 py-2 shadow-lg opacity-90">
            {activeItem.type === 'folder' ? (
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4" style={{ color: activeItem.data.color }} />
                <span className="text-sm">{activeItem.data.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm">{activeItem.data.title}</span>
              </div>
            )}
          </div>
        )}
      </DragOverlay>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
