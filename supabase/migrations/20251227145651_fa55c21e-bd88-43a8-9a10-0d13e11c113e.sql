-- Create nodes table for tree-structured branching conversations
CREATE TABLE public.nodes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.nodes(id) ON DELETE CASCADE,
    
    -- Content
    user_message TEXT NOT NULL,
    assistant_response TEXT,
    
    -- Metadata
    branch_name TEXT,
    is_collapsed BOOLEAN DEFAULT FALSE,
    depth INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient tree traversal
CREATE INDEX idx_nodes_parent ON public.nodes(parent_id);
CREATE INDEX idx_nodes_conversation ON public.nodes(conversation_id);
CREATE INDEX idx_nodes_depth ON public.nodes(conversation_id, depth);

-- Enable RLS
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view nodes in their conversations"
ON public.nodes FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = nodes.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can create nodes in their conversations"
ON public.nodes FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = nodes.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can update nodes in their conversations"
ON public.nodes FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = nodes.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete nodes in their conversations"
ON public.nodes FOR DELETE
USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = nodes.conversation_id AND c.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_nodes_updated_at
BEFORE UPDATE ON public.nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add backlog_summary to conversations for project tracking
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS backlog_summary JSONB DEFAULT '[]'::jsonb;