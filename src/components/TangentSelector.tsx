import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus, Copy, Globe } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const { toast } = useToast();

  const handleCreate = () => {
    if (tangentContent.trim() && selectedText.trim()) {
      onCreateTangent(selectedText, tangentContent);
      setTangentContent("");
      setIsOpen(false);
      onClose();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      toast({
        description: "Copied to clipboard",
      });
    } catch (err) {
      toast({
        description: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleGetLiveInfo = async () => {
    setIsLoadingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query: selectedText }
      });

      if (error) throw error;

      if (data?.information) {
        const currentContent = tangentContent ? tangentContent + "\n\n" : "";
        setTangentContent(currentContent + "**Live Information:**\n" + data.information);
        toast({
          description: "Added current information to your tangent",
        });
      }
    } catch (err) {
      console.error('Error fetching live information:', err);
      toast({
        description: "Failed to fetch live information",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
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
          className="fixed z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Create Tangent
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="right" align="start" sideOffset={8}>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Selected text:</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 px-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground italic p-2 bg-muted rounded prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md my-1"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {selectedText}
              </ReactMarkdown>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Your tangent:</label>
            <Textarea
              placeholder="Write your tangent thoughts... (Enter to send, Shift+Enter for new line)"
              value={tangentContent}
              onChange={(e) => setTangentContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-1 min-h-[100px]"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}>
              Send
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGetLiveInfo}
              disabled={isLoadingInfo}
            >
              <Globe className="h-3 w-3 mr-1" />
              {isLoadingInfo ? "Loading..." : "Get Live Info"}
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