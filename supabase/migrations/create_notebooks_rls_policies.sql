-- Check existing RLS policies for notebooks table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notebooks';

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can create their own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can update their own notebooks" ON notebooks;
DROP POLICY IF EXISTS "Users can delete their own notebooks" ON notebooks;

-- Create RLS policies for notebooks table
-- Allow users to view their own notebooks
CREATE POLICY "Users can view their own notebooks" ON notebooks
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to create notebooks
CREATE POLICY "Users can create their own notebooks" ON notebooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notebooks
CREATE POLICY "Users can update their own notebooks" ON notebooks
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own notebooks
CREATE POLICY "Users can delete their own notebooks" ON notebooks
  FOR DELETE USING (auth.uid() = user_id);

-- Check the policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notebooks';