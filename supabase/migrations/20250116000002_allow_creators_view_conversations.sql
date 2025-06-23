-- Allow creators of a conversation to view it (needed for INSERT ... RETURNING)

-- Ensure we don't duplicate policy if re-run
DROP POLICY IF EXISTS "Creators can view conversations they created" ON conversations;

CREATE POLICY "Creators can view conversations they created" ON conversations
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
); 