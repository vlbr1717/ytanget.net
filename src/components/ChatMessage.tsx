import { useState, useRef } from "react";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { TangentThread } from "@/components/TangentThread";
import { TangentSelector } from "@/components/TangentSelector";

interface TangentMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

interface Tangent {
  id: string;
  highlighted_text: string;
  conversation: TangentMessage[];
  created_at: string;
  sub_tangents?: Tangent[];
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  tangents?: Tangent[];
  onCreateTangent?: (messageId: string, highlightedText: string, content: string, parentTangentId?: string, isSubTangent?: boolean) => void;
}

export const ChatMessage = ({ 
  role, 
  content, 
  messageId,
  tangents = [],
  onCreateTangent 
}: ChatMessageProps) => {
  const isUser = role === "user";
  const [showTangentSelector, setShowTangentSelector] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Shorten text for display
  const shortenText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Escape special regex characters
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Process content to replace highlighted text with unique markdown-safe markers
  // But only in plain text, not in LaTeX or code blocks
  const processedContent = (() => {
    let result = content;
    
    // Find all LaTeX regions (inline $...$ and block $$...$$) and code blocks
    const protectedRegions: Array<{start: number, end: number}> = [];
    
    // Find block math $$...$$
    const blockMathRegex = /\$\$[\s\S]*?\$\$/g;
    let match;
    while ((match = blockMathRegex.exec(content)) !== null) {
      protectedRegions.push({start: match.index, end: match.index + match[0].length});
    }
    
    // Find inline math $...$
    const inlineMathRegex = /\$[^\$\n]+?\$/g;
    while ((match = inlineMathRegex.exec(content)) !== null) {
      protectedRegions.push({start: match.index, end: match.index + match[0].length});
    }
    
    // Find fenced code blocks ```...```
    const fencedCodeRegex = /```[\s\S]*?```/g;
    while ((match = fencedCodeRegex.exec(content)) !== null) {
      protectedRegions.push({start: match.index, end: match.index + match[0].length});
    }
    
    // Find inline code `...`
    const inlineCodeRegex = /`[^`\n]+?`/g;
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      protectedRegions.push({start: match.index, end: match.index + match[0].length});
    }
    
    // Sort regions by start position
    protectedRegions.sort((a, b) => a.start - b.start);
    
    // Check if a position is within a protected region
    const isProtected = (pos: number) => {
      return protectedRegions.some(region => pos >= region.start && pos < region.end);
    };
    
    // Apply tangent markers only to unprotected text
    tangents.forEach((tangent, index) => {
      const shortenedText = shortenText(tangent.highlighted_text);
      const marker = `<TANGENT_LINK_${index}>${shortenedText}</TANGENT_LINK_${index}>`;
      const searchText = tangent.highlighted_text;
      
      let newResult = '';
      let lastIndex = 0;
      const regex = new RegExp(escapeRegex(searchText), 'g');
      
      while ((match = regex.exec(result)) !== null) {
        // Check if this match is in a protected region
        if (!isProtected(match.index)) {
          newResult += result.substring(lastIndex, match.index);
          newResult += marker;
          lastIndex = match.index + match[0].length;
        }
      }
      newResult += result.substring(lastIndex);
      result = newResult || result;
    });
    
    return result;
  })();

  // Function to convert tangent markers to clickable buttons
  const renderTextWithTangents = (text: string) => {
    const parts = text.split(/(<TANGENT_LINK_\d+>[\s\S]*?<\/TANGENT_LINK_\d+>)/g);
    return parts.map((part, i) => {
      const match = part.match(/<TANGENT_LINK_(\d+)>([\s\S]*?)<\/TANGENT_LINK_\d+>/);
      if (match) {
        const tangentIndex = parseInt(match[1]);
        const displayText = match[2];
        const tangent = tangents[tangentIndex];
        if (tangent) {
          return (
            <button
              key={`tangent-${i}`}
              onClick={() => handleTangentLinkClick(tangent.id)}
              className="inline text-primary hover:text-primary/80 underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
              title={tangent.highlighted_text}
            >
              {displayText}
            </button>
          );
        }
      }
      return part;
    });
  };

  const handleTangentLinkClick = (tangentId: string) => {
    const element = document.getElementById(`tangent-${tangentId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("animate-pulse");
      setTimeout(() => {
        element.classList.remove("animate-pulse");
      }, 1000);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0 && !isUser && messageId && onCreateTangent) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect) {
        setSelectedText(text);
        setSelectorPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 8
        });
        setShowTangentSelector(true);
      }
    }
  };

  const handleCreateTangent = (highlightedText: string, content: string) => {
    if (messageId && onCreateTangent) {
      onCreateTangent(messageId, highlightedText, content);
    }
  };

  const handleReplyToTangent = (tangentId: string, content: string) => {
    console.log('ChatMessage handleReplyToTangent called:', { tangentId, content });
    if (messageId && onCreateTangent) {
      // Find the tangent to get its highlighted text
      const findTangent = (tangents: Tangent[]): Tangent | undefined => {
        for (const t of tangents) {
          if (t.id === tangentId) return t;
          if (t.sub_tangents) {
            const found = findTangent(t.sub_tangents);
            if (found) return found;
          }
        }
      };
      
      const parentTangent = findTangent(tangents);
      console.log('Found parent tangent:', parentTangent);
      if (parentTangent) {
        console.log('Calling onCreateTangent with parentId:', tangentId);
        onCreateTangent(messageId, parentTangent.highlighted_text, content, tangentId);
      }
    }
  };

  const handleCreateSubTangent = (parentTangentId: string, highlightedText: string, content: string) => {
    console.log('ChatMessage handleCreateSubTangent called:', { parentTangentId, highlightedText, content });
    if (messageId && onCreateTangent) {
      // Pass true as 5th parameter to indicate this is a sub-tangent, not a reply
      onCreateTangent(messageId, highlightedText, content, parentTangentId, true);
    }
  };
  
  return (
    <div className={cn(
      "py-8 px-4 relative",
      isUser ? "bg-chat-user" : "bg-chat-assistant"
    )}>
      <div className="max-w-3xl mx-auto flex gap-4">
        <div className={cn(
          "w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary" : "bg-accent"
        )}>
          {isUser ? (
            <User className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Bot className="h-5 w-5 text-accent-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-4 overflow-hidden">
          <div 
            ref={contentRef}
            className="prose prose-invert max-w-none"
            onMouseUp={handleTextSelection}
          >
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
                      className="rounded-md my-2"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children, ...props }: any) {
                  const processNode = (node: any): any => {
                    if (typeof node === 'string') {
                      return renderTextWithTangents(node);
                    }
                    if (Array.isArray(node)) {
                      return node.map((n, i) => <span key={i}>{processNode(n)}</span>);
                    }
                    return node;
                  };
                  
                  return <p {...props}>{processNode(children)}</p>;
                },
                strong({ children, ...props }: any) {
                  const processNode = (node: any): any => {
                    if (typeof node === 'string') {
                      return renderTextWithTangents(node);
                    }
                    return node;
                  };
                  
                  return <strong {...props}>{processNode(children)}</strong>;
                },
                em({ children, ...props }: any) {
                  const processNode = (node: any): any => {
                    if (typeof node === 'string') {
                      return renderTextWithTangents(node);
                    }
                    return node;
                  };
                  
                  return <em {...props}>{processNode(children)}</em>;
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>

          {/* Tangent threads */}
          {tangents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-muted">
              <div className="text-sm font-medium text-muted-foreground">
                Tangents ({tangents.length})
              </div>
              {tangents.map((tangent) => (
                <TangentThread
                  key={tangent.id}
                  tangent={tangent}
                  onReply={handleReplyToTangent}
                  onCreateSubTangent={handleCreateSubTangent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showTangentSelector && (
        <TangentSelector
          selectedText={selectedText}
          position={selectorPosition}
          onCreateTangent={handleCreateTangent}
          onClose={() => setShowTangentSelector(false)}
        />
      )}
    </div>
  );
};
