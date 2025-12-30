import { useState, useEffect } from 'react';
import { FileText, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Document, useDocuments } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';

interface DocumentListProps {
  folderId: string;
  userId: string;
  depth: number;
}

export function DocumentList({ folderId, userId, depth }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { getDocuments, deleteDocument } = useDocuments(userId);

  useEffect(() => {
    loadDocuments();
  }, [folderId]);

  const loadDocuments = async () => {
    setLoading(true);
    const docs = await getDocuments(folderId);
    setDocuments(docs);
    setLoading(false);
  };

  // Subscribe to document status changes
  useEffect(() => {
    const channel = supabase
      .channel(`documents-${folderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `folder_id=eq.${folderId}`
        },
        (payload) => {
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === payload.new.id 
                ? { ...doc, status: payload.new.status as Document['status'] }
                : doc
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [folderId]);

  const handleDelete = async (doc: Document) => {
    const success = await deleteDocument(doc.id, doc.name);
    if (success) {
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div 
        className="flex items-center gap-2 py-1 text-muted-foreground text-xs"
        style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (documents.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={cn(
            "group flex items-center gap-2 px-2 py-1 rounded-md",
            "hover:bg-sidebar-accent text-sm"
          )}
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          {doc.status === 'processing' ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
          ) : doc.status === 'error' ? (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
          )}
          
          <span className="flex-1 truncate text-muted-foreground">
            {doc.name}
          </span>
          
          <span className="text-xs text-muted-foreground/60">
            {formatSize(doc.file_size)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={() => handleDelete(doc)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
