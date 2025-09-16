-- Add DELETE policy and permissions for conversations table
-- This allows users to delete conversations from their own notebooks

-- Create RLS policy for deleting conversations
CREATE POLICY "Users can delete conversations in their notebooks" ON conversations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = conversations.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

-- Grant DELETE permission on conversations table
GRANT DELETE ON conversations TO anon, authenticated;