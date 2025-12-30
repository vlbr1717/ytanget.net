import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Folder {
  id: string;
  name: string;
  color: string;
  parent_folder_id: string | null;
  sort_order: number;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
  conversations: ConversationItem[];
}

export interface ConversationItem {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
}

// Generate a simple UUID for guest mode
const generateId = () => crypto.randomUUID();

export function useFolders(userId: string | null) {
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [flatFolders, setFlatFolders] = useState<Folder[]>([]);
  const [unfiledConversations, setUnfiledConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // Build tree from flat folder list
  const buildFolderTree = useCallback((
    flatFoldersList: Folder[],
    conversations: ConversationItem[]
  ): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    // Create nodes
    flatFoldersList.forEach(f => {
      folderMap.set(f.id, {
        ...f,
        children: [],
        conversations: conversations.filter(c => c.folder_id === f.id)
      });
    });

    // Build hierarchy
    flatFoldersList.forEach(f => {
      const node = folderMap.get(f.id)!;
      if (f.parent_folder_id && folderMap.has(f.parent_folder_id)) {
        folderMap.get(f.parent_folder_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort by sort_order
    const sortNodes = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => a.sort_order - b.sort_order);
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, []);

  const rebuildTree = useCallback((newFlatFolders: Folder[], conversations: ConversationItem[]) => {
    const tree = buildFolderTree(newFlatFolders, conversations);
    setFolders(tree);
    setFlatFolders(newFlatFolders);
    const unfiled = conversations.filter(c => !c.folder_id);
    setUnfiledConversations(unfiled);
  }, [buildFolderTree]);

  const fetchFoldersAndConversations = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (foldersError) throw foldersError;

      // Fetch conversations
      const { data: convsData, error: convsError } = await supabase
        .from('conversations')
        .select('id, title, folder_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (convsError) throw convsError;

      const allConversations: ConversationItem[] = convsData || [];
      const unfiled = allConversations.filter(c => !c.folder_id);
      const tree = buildFolderTree(foldersData || [], allConversations);

      setFolders(tree);
      setFlatFolders(foldersData || []);
      setUnfiledConversations(unfiled);

      // Initialize expanded state from stored preferences
      const expanded = new Set<string>();
      (foldersData || []).forEach(f => {
        if (f.is_expanded) expanded.add(f.id);
      });
      setExpandedFolderIds(expanded);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, buildFolderTree]);

  useEffect(() => {
    fetchFoldersAndConversations();
  }, [fetchFoldersAndConversations]);

  const createFolder = async (name: string, parentFolderId: string | null = null, color = '#6366f1') => {
    // Guest mode: create folder locally only
    if (!userId) {
      const now = new Date().toISOString();
      const newFolder: Folder = {
        id: generateId(),
        name,
        color,
        parent_folder_id: parentFolderId,
        sort_order: flatFolders.length,
        is_expanded: false,
        created_at: now,
        updated_at: now
      };
      
      const newFlatFolders = [...flatFolders, newFolder];
      rebuildTree(newFlatFolders, unfiledConversations);
      
      // Auto-expand the new folder
      setExpandedFolderIds(prev => new Set([...prev, newFolder.id]));
      
      return newFolder;
    }

    // Logged-in mode: persist to database
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          user_id: userId,
          name,
          parent_folder_id: parentFolderId,
          color,
          sort_order: folders.length
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchFoldersAndConversations();
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      return null;
    }
  };

  const renameFolder = async (folderId: string, newName: string) => {
    // Guest mode
    if (!userId) {
      const newFlatFolders = flatFolders.map(f => 
        f.id === folderId ? { ...f, name: newName } : f
      );
      rebuildTree(newFlatFolders, unfiledConversations);
      return;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;
      await fetchFoldersAndConversations();
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const updateFolderColor = async (folderId: string, color: string) => {
    // Guest mode
    if (!userId) {
      const newFlatFolders = flatFolders.map(f => 
        f.id === folderId ? { ...f, color } : f
      );
      rebuildTree(newFlatFolders, unfiledConversations);
      return;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({ color })
        .eq('id', folderId);

      if (error) throw error;
      await fetchFoldersAndConversations();
    } catch (error) {
      console.error('Error updating folder color:', error);
    }
  };

  const deleteFolder = async (folderId: string, moveContentsToUnfiled = true) => {
    // Guest mode
    if (!userId) {
      // Move conversations to unfiled if needed
      const newUnfiled = moveContentsToUnfiled 
        ? [...unfiledConversations, ...getAllConversationsInFolder(folderId)]
        : unfiledConversations;
      
      // Remove folder and its children
      const idsToRemove = getFolderAndDescendantIds(folderId);
      const newFlatFolders = flatFolders.filter(f => !idsToRemove.has(f.id));
      
      rebuildTree(newFlatFolders, newUnfiled);
      return;
    }

    try {
      if (moveContentsToUnfiled) {
        // Move conversations to unfiled
        await supabase
          .from('conversations')
          .update({ folder_id: null })
          .eq('folder_id', folderId);
      }

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      await fetchFoldersAndConversations();
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  // Helper to get all conversations in a folder tree
  const getAllConversationsInFolder = (folderId: string): ConversationItem[] => {
    const findNode = (nodes: FolderNode[]): FolderNode | null => {
      for (const node of nodes) {
        if (node.id === folderId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };
    
    const node = findNode(folders);
    if (!node) return [];
    
    const collectConversations = (n: FolderNode): ConversationItem[] => {
      return [...n.conversations, ...n.children.flatMap(collectConversations)];
    };
    
    return collectConversations(node);
  };

  // Helper to get folder and all descendant IDs
  const getFolderAndDescendantIds = (folderId: string): Set<string> => {
    const ids = new Set<string>([folderId]);
    const findAndCollect = (nodes: FolderNode[]) => {
      for (const node of nodes) {
        if (ids.has(node.id) || (node.parent_folder_id && ids.has(node.parent_folder_id))) {
          ids.add(node.id);
        }
        findAndCollect(node.children);
      }
    };
    
    // Multiple passes to catch all descendants
    for (let i = 0; i < flatFolders.length; i++) {
      flatFolders.forEach(f => {
        if (f.parent_folder_id && ids.has(f.parent_folder_id)) {
          ids.add(f.id);
        }
      });
    }
    
    return ids;
  };

  const moveConversation = async (conversationId: string, folderId: string | null) => {
    // Guest mode: update local state
    if (!userId) {
      // Find the conversation in current state
      let conversation: ConversationItem | null = null;
      
      // Check unfiled first
      const unfiledIndex = unfiledConversations.findIndex(c => c.id === conversationId);
      if (unfiledIndex >= 0) {
        conversation = unfiledConversations[unfiledIndex];
      }
      
      // Check folders
      if (!conversation) {
        const findInFolders = (nodes: FolderNode[]): ConversationItem | null => {
          for (const node of nodes) {
            const found = node.conversations.find(c => c.id === conversationId);
            if (found) return found;
            const inChildren = findInFolders(node.children);
            if (inChildren) return inChildren;
          }
          return null;
        };
        conversation = findInFolders(folders);
      }
      
      if (conversation) {
        // Update folder_id
        const updatedConv = { ...conversation, folder_id: folderId };
        
        // Rebuild all conversations list
        const allConvs = [...unfiledConversations.filter(c => c.id !== conversationId)];
        const collectFromFolders = (nodes: FolderNode[]) => {
          nodes.forEach(n => {
            allConvs.push(...n.conversations.filter(c => c.id !== conversationId));
            collectFromFolders(n.children);
          });
        };
        collectFromFolders(folders);
        allConvs.push(updatedConv);
        
        rebuildTree(flatFolders, allConvs);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ folder_id: folderId })
        .eq('id', conversationId);

      if (error) throw error;
      await fetchFoldersAndConversations();
    } catch (error) {
      console.error('Error moving conversation:', error);
    }
  };

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    // Prevent moving folder into itself or its descendants
    const isDescendant = (parentId: string, checkId: string): boolean => {
      const findNode = (nodes: FolderNode[]): FolderNode | null => {
        for (const node of nodes) {
          if (node.id === parentId) return node;
          const found = findNode(node.children);
          if (found) return found;
        }
        return null;
      };
      
      const parent = findNode(folders);
      if (!parent) return false;
      
      const checkDescendants = (node: FolderNode): boolean => {
        if (node.id === checkId) return true;
        return node.children.some(checkDescendants);
      };
      
      return checkDescendants(parent);
    };

    if (newParentId && (folderId === newParentId || isDescendant(folderId, newParentId))) {
      console.warn('Cannot move folder into itself or its descendants');
      return;
    }

    // Guest mode
    if (!userId) {
      const newFlatFolders = flatFolders.map(f => 
        f.id === folderId ? { ...f, parent_folder_id: newParentId } : f
      );
      rebuildTree(newFlatFolders, unfiledConversations);
      return;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({ parent_folder_id: newParentId })
        .eq('id', folderId);

      if (error) throw error;
      await fetchFoldersAndConversations();
    } catch (error) {
      console.error('Error moving folder:', error);
    }
  };

  const toggleFolderExpanded = async (folderId: string) => {
    const newExpanded = new Set(expandedFolderIds);
    const isExpanded = newExpanded.has(folderId);
    
    if (isExpanded) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    
    setExpandedFolderIds(newExpanded);

    // Guest mode: don't persist
    if (!userId) return;

    // Persist to database
    try {
      await supabase
        .from('folders')
        .update({ is_expanded: !isExpanded })
        .eq('id', folderId);
    } catch (error) {
      console.error('Error updating folder expanded state:', error);
    }
  };

  return {
    folders,
    unfiledConversations,
    isLoading,
    expandedFolderIds,
    createFolder,
    renameFolder,
    updateFolderColor,
    deleteFolder,
    moveConversation,
    moveFolder,
    toggleFolderExpanded,
    refresh: fetchFoldersAndConversations
  };
}
