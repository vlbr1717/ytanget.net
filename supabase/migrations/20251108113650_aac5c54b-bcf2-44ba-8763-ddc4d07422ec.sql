-- Create tangents table for nested, thread-like conversations
CREATE TABLE public.tangents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  parent_tangent_id UUID REFERENCES public.tangents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  highlighted_text TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tangents ENABLE ROW LEVEL SECURITY;

-- Create policies for tangents
CREATE POLICY "Users can view tangents in their conversations"
ON public.tangents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = tangents.message_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tangents in their conversations"
ON public.tangents
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = tangents.message_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own tangents"
ON public.tangents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tangents"
ON public.tangents
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tangents_updated_at
BEFORE UPDATE ON public.tangents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_tangents_message_id ON public.tangents(message_id);
CREATE INDEX idx_tangents_parent_tangent_id ON public.tangents(parent_tangent_id);