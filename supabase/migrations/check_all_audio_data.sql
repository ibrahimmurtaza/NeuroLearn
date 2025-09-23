-- Check all audio summaries in the database
SELECT 
    s.id as summary_id,
    s.title,
    s.user_id,
    s.created_at,
    af.filename,
    af.file_type,
    af.user_id as file_user_id
FROM audio_summaries s
LEFT JOIN audio_files af ON s.audio_file_id = af.id
ORDER BY s.created_at DESC;

-- Check all audio files
SELECT 
    id,
    filename,
    file_type,
    user_id,
    created_at,
    processing_status
FROM audio_files
ORDER BY created_at DESC;

-- Check user count
SELECT COUNT(*) as user_count FROM auth.users;