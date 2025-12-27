import { useEffect, useRef, useState } from "react";
import { GitFork, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/ChatInput";
import { BranchDropdown } from "@/components/BranchDropdown";
import { useBranchingChat, Node } from "@/hooks/useBranchingChat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BranchingChatViewProps {
  conversationId: string | null;
}

export function BranchingChatView({ conversationId }: BranchingChatViewProps) {
  const {
    activePath,
    isLoading,
    loadNodes,
    sendMessage,
    forkFromNode,
    switchToBranch,
    getSiblings,
  } = useBranchingChat(conversationId);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [forkDialog, setForkDialog] = useState<{ open: boolean; nodeId: string | null }>({
    open: false,
    nodeId: null,
  });
  const [forkMessage, setForkMessage] = useState("");
  const [forkName, setForkName] = useState("");

  // Load nodes when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadNodes();
    }
  }, [conversationId, loadNodes]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activePath]);

  const handleFork = async () => {
    if (!forkDialog.nodeId || !forkMessage.trim()) return;
    
    await forkFromNode(forkDialog.nodeId, forkMessage.trim(), forkName.trim() || undefined);
    setForkDialog({ open: false, nodeId: null });
    setForkMessage("");
    setForkName("");
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <GitFork className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a conversation or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      {activePath.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
          <span className="font-medium text-foreground">Root</span>
          {activePath.slice(0, -1).map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <button
                onClick={() => switchToBranch(node.id)}
                className="hover:text-foreground transition-colors truncate max-w-[100px]"
              >
                {node.branch_name || node.user_message.slice(0, 15) + '...'}
              </button>
            </div>
          ))}
          {activePath.length > 0 && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {activePath[activePath.length - 1]?.branch_name || 'Current'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activePath.map((node, index) => {
          const siblings = getSiblings(node.id);
          
          return (
            <div key={node.id} className="space-y-4">
              {/* Branch indicator */}
              {siblings.length > 1 && (
                <div className="flex justify-start">
                  <BranchDropdown
                    siblings={siblings}
                    currentBranchId={node.id}
                    onSwitch={switchToBranch}
                  />
                </div>
              )}
              
              {/* User message */}
              <div className="flex justify-end">
                <div className="relative group max-w-[80%]">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2">
                    <p className="whitespace-pre-wrap">{node.user_message}</p>
                  </div>
                  
                  {/* Fork button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute -left-10 top-1/2 -translate-y-1/2",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "h-8 w-8"
                    )}
                    onClick={() => setForkDialog({ open: true, nodeId: node.id })}
                    title="Create a new branch from here"
                  >
                    <GitFork className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Assistant response */}
              {node.assistant_response && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-muted rounded-2xl rounded-tl-sm px-4 py-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match;
                          return !isInline && match ? (
                            <SyntaxHighlighter
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-md my-2"
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {node.assistant_response}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />

      {/* Fork Dialog */}
      <Dialog open={forkDialog.open} onOpenChange={(open) => setForkDialog({ open, nodeId: open ? forkDialog.nodeId : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitFork className="h-5 w-5" />
              Create New Branch
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name (optional)</Label>
              <Input
                id="branch-name"
                placeholder="e.g., 'API Design tangent'"
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fork-message">New Direction</Label>
              <Input
                id="fork-message"
                placeholder="What would you like to explore?"
                value={forkMessage}
                onChange={(e) => setForkMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setForkDialog({ open: false, nodeId: null })}>
              Cancel
            </Button>
            <Button onClick={handleFork} disabled={!forkMessage.trim()}>
              <GitFork className="h-4 w-4 mr-2" />
              Fork Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
