import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TangentSelectorProps {
  selectedText: string;
  position: { x: number; y: number };
  onCreateTangent: (highlightedText: string, content: string) => void;
  onClose: () => void;
}

export const TangentSelector = ({
  selectedText,
  position,
  onCreateTangent,
  onClose,
}: TangentSelectorProps) => {
  const [tangentContent, setTangentContent] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleCreate = () => {
    if (tangentContent.trim() && selectedText.trim()) {
      onCreateTangent(selectedText, tangentContent);
      setTangentContent("");
      setIsOpen(false);
      onClose();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) onClose();
    }}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="absolute"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Create Tangent
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Selected text:</label>
            <div className="text-sm text-muted-foreground italic mt-1 p-2 bg-muted rounded">
              "{selectedText}"
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Your tangent:</label>
            <Textarea
              placeholder="Write your tangent thoughts..."
              value={tangentContent}
              onChange={(e) => setTangentContent(e.target.value)}
              className="mt-1 min-h-[100px]"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};