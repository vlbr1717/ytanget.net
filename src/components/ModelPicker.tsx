import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHAT_MODELS, ChatModelId } from '@/lib/chatModels';

interface ModelPickerProps {
  value: ChatModelId;
  onChange: (id: ChatModelId) => void;
  className?: string;
}

export const ModelPicker = ({ value, onChange, className }: ModelPickerProps) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChatModelId)}>
      <SelectTrigger
        className={`h-8 w-auto gap-1.5 border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground ${className ?? ''}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[220px]">
        {CHAT_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
