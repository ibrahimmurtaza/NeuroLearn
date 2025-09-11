-- Grant permissions for files and notebook_files tables

-- Grant SELECT permissions to anon role for files table
GRANT SELECT ON files TO anon;

-- Grant SELECT permissions to authenticated role for files table
GRANT ALL PRIVILEGES ON files TO authenticated;

-- Grant SELECT permissions to anon role for notebook_files table
GRANT SELECT ON notebook_files TO anon;

-- Grant ALL permissions to authenticated role for notebook_files table
GRANT ALL PRIVILEGES ON notebook_files TO authenticated;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon read access to files" ON files;
DROP POLICY IF EXISTS "Allow authenticated full access to files" ON files;
DROP POLICY IF EXISTS "Allow anon read access to notebook_files" ON notebook_files;
DROP POLICY IF EXISTS "Allow authenticated full access to notebook_files" ON notebook_files;

-- Create RLS policies to allow access
CREATE POLICY "Allow anon read access to files" ON files
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access to files" ON files
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon read access to notebook_files" ON notebook_files
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated full access to notebook_files" ON notebook_files
    FOR ALL TO authenticated USING (true);