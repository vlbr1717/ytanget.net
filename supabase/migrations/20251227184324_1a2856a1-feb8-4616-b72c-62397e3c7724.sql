-- Create folders table for hierarchical organization
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_expanded BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id to conversations table
ALTER TABLE public.conversations
ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Create indexes for efficient queries
CREATE INDEX idx_folders_parent ON public.folders(parent_folder_id);
CREATE INDEX idx_folders_user ON public.folders(user_id);
CREATE INDEX idx_conversations_folder ON public.conversations(folder_id);

-- Enable RLS on folders
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Users can view their own folders"
ON public.folders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
ON public.folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.folders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.folders
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on folders
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();