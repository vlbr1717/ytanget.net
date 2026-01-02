import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare } from 'lucide-react';
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
        "group flex items-center gap-2 py-1.5 mr-4 rounded-lg cursor-pointer transition-colors overflow-hidden",
        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50",
        isDragging && "opacity-50"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div style={{ width: `${depth * 12 + 8}px` }} className="flex-shrink-0" />
      <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm truncate min-w-0 pr-2">{conversation.title}</span>
    </div>
  );
}
