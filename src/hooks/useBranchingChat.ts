import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Node {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  user_message: string;
  assistant_response: string | null;
  branch_name: string | null;
  is_collapsed: boolean;
  depth: number;
  created_at: string;
}

export interface BranchInfo {
  id: string;
  branch_name: string | null;
  preview: string;
  created_at: string;
}

export function useBranchingChat(conversationId: string | null) {
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get path from root to a specific node
  const getPathToNode = useCallback((nodeId: string): Node[] => {
    const path: Node[] = [];
    let currentId: string | null = nodeId;
    
    while (currentId && nodes[currentId]) {
      path.unshift(nodes[currentId]);
      currentId = nodes[currentId].parent_id;
    }
    
    return path;
  }, [nodes]);

  // Get current active path
  const activePath = activeNodeId ? getPathToNode(activeNodeId) : [];

  // Get siblings of a node (nodes with same parent)
  const getSiblings = useCallback((nodeId: string): BranchInfo[] => {
    const node = nodes[nodeId];
    if (!node) return [];
    
    return Object.values(nodes)
      .filter(n => n.parent_id === node.parent_id && n.conversation_id === node.conversation_id)
      .map(n => ({
        id: n.id,
        branch_name: n.branch_name,
        preview: n.user_message.slice(0, 50) + (n.user_message.length > 50 ? '...' : ''),
        created_at: n.created_at,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [nodes]);

  // Load all nodes for a conversation
  const loadNodes = useCallback(async () => {
    if (!conversationId) return;
    
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Failed to load nodes:', error);
      return;
    }
    
    const nodesMap: Record<string, Node> = {};
    data?.forEach(node => {
      nodesMap[node.id] = node as Node;
    });
    
    setNodes(nodesMap);
    
    // Set active node to the last created leaf node
    if (data && data.length > 0) {
      const leafNodes = data.filter(n => 
        !data.some(other => other.parent_id === n.id)
      );
      const latestLeaf = leafNodes[leafNodes.length - 1];
      setActiveNodeId(latestLeaf?.id || data[data.length - 1].id);
    }
  }, [conversationId]);

  // Create a new node (continue conversation or start new branch)
  const createNode = useCallback(async (
    userMessage: string, 
    parentId: string | null = null,
    branchName: string | null = null
  ): Promise<Node | null> => {
    if (!conversationId) return null;
    
    // Calculate depth
    let depth = 0;
    if (parentId && nodes[parentId]) {
      depth = nodes[parentId].depth + 1;
    }
    
    const { data, error } = await supabase
      .from('nodes')
      .insert({
        conversation_id: conversationId,
        parent_id: parentId,
        user_message: userMessage,
        branch_name: branchName,
        depth,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create node:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
    
    const newNode = data as Node;
    setNodes(prev => ({ ...prev, [newNode.id]: newNode }));
    setActiveNodeId(newNode.id);
    
    return newNode;
  }, [conversationId, nodes, toast]);

  // Fork: create a new branch from an existing node's parent (sibling)
  const forkFromNode = useCallback(async (
    nodeId: string, 
    userMessage: string,
    branchName?: string
  ): Promise<Node | null> => {
    const node = nodes[nodeId];
    if (!node) return null;
    
    // Create sibling by using same parent
    return createNode(
      userMessage, 
      node.parent_id, 
      branchName || `Branch from ${node.user_message.slice(0, 20)}...`
    );
  }, [nodes, createNode]);

  // Switch to a different branch
  const switchToBranch = useCallback((nodeId: string) => {
    if (nodes[nodeId]) {
      setActiveNodeId(nodeId);
    }
  }, [nodes]);

  // Update node with assistant response
  const updateNodeResponse = useCallback(async (nodeId: string, response: string) => {
    const { error } = await supabase
      .from('nodes')
      .update({ assistant_response: response })
      .eq('id', nodeId);
    
    if (error) {
      console.error('Failed to update node response:', error);
      return;
    }
    
    setNodes(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], assistant_response: response }
    }));
  }, []);

  // Stream chat using path-based context
  const streamChat = useCallback(async (
    nodeId: string,
    userMessage: string,
    onDelta: (chunk: string) => void,
    onDone: () => void
  ) => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            nodeId,
            userMessage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onDelta(content);
              }
            } catch (e) {
              // Ignore parse errors for partial data
            }
          }
        }
      }

      onDone();
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
      onDone();
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Send a message and stream the response
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!conversationId) return;
    
    // Create the new node
    const newNode = await createNode(userMessage, activeNodeId);
    if (!newNode) return;
    
    // Stream the response
    let fullResponse = '';
    await streamChat(
      newNode.id,
      userMessage,
      (chunk) => {
        fullResponse += chunk;
        // Update UI in real-time
        setNodes(prev => ({
          ...prev,
          [newNode.id]: { ...prev[newNode.id], assistant_response: fullResponse }
        }));
      },
      async () => {
        // Save final response to database
        await updateNodeResponse(newNode.id, fullResponse);
      }
    );
  }, [conversationId, activeNodeId, createNode, streamChat, updateNodeResponse]);

  return {
    nodes,
    activeNodeId,
    activePath,
    isLoading,
    loadNodes,
    sendMessage,
    createNode,
    forkFromNode,
    switchToBranch,
    getSiblings,
    getPathToNode,
  };
}
