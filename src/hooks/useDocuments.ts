import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  folder_id: string;
}

export function useDocuments(userId: string | null) {
  const [uploading, setUploading] = useState(false);

  const uploadDocument = useCallback(async (
    file: File,
    folderId: string
  ): Promise<Document | null> => {
    if (!userId) {
      toast.error('Please sign in to upload documents');
      return null;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and Word documents are allowed');
      return null;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return null;
    }

    setUploading(true);

    try {
      // Upload to storage
      const filePath = `${userId}/${folderId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file');
        return null;
      }

      // Create document record
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          folder_id: folderId,
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to save document');
        return null;
      }

      toast.success('Document uploaded, processing...');

      // Trigger processing
      supabase.functions.invoke('process-document', {
        body: { documentId: doc.id }
      }).then(({ error }) => {
        if (error) {
          console.error('Processing error:', error);
          toast.error('Failed to process document');
        } else {
          toast.success('Document ready for use');
        }
      });

      return doc as Document;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
      return null;
    } finally {
      setUploading(false);
    }
  }, [userId]);

  const getDocuments = useCallback(async (folderId: string): Promise<Document[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch documents:', error);
      return [];
    }

    return data as Document[];
  }, [userId]);

  const deleteDocument = useCallback(async (documentId: string, filePath: string): Promise<boolean> => {
    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([filePath]);

      // Delete from database (cascades to chunks)
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete document');
        return false;
      }

      toast.success('Document deleted');
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
      return false;
    }
  }, []);

  return {
    uploading,
    uploadDocument,
    getDocuments,
    deleteDocument
  };
}
