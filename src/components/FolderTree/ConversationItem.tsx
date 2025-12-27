import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, MoreVertical, Trash2, FolderMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationItem } from '@/hooks/useFolders';
import { cn } from '@/lib/utils';

interface ConversationItemComponentProps {
  conversation: ConversationItem;
  depth: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToUnfiled?: () => void;
}

export function ConversationItemComponent({
  conversation,
  depth,
  isActive,
  onSelect,
  onDelete,
  onMoveToUnfiled
}: ConversationItemComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `conv-${conversation.id}`,
    data: {
      type: 'conversation',
      conversation
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50",
        isDragging && "opacity-50"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div style={{ width: `${depth * 16 + 8}px` }} />
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm truncate">{conversation.title}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover z-50">
          {onMoveToUnfiled && conversation.folder_id && (
            <DropdownMenuItem onClick={onMoveToUnfiled}>
              <FolderMinus className="h-4 w-4 mr-2" />
              Move to Unfiled
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
