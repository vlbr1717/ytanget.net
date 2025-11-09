-- Add UPDATE policy for messages so chat can persist across saves
-- Existing policies allow INSERT and SELECT but not UPDATE; upsert uses UPDATE when ids match
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;

CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
  )
);
