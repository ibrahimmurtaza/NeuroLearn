-- Check existing audio summaries and related data
SELECT 
    s.id,
    s.title,
    s.summary_text,
    s.user_id,
    s.created_at,
    af.filename,
    af.file_type,
    af.file_size
FROM audio_summaries s
LEFT JOIN audio_files af ON s.audio_file_id = af.id
ORDER BY s.created_at DESC
LIMIT 10;

-- Also check if there are any audio files without summaries
SELECT 
    af.id,
    af.filename,
    af.file_type,
    af.user_id,
    af.created_at
FROM audio_files af
LEFT JOIN audio_summaries s ON af.id = s.audio_file_id
WHERE s.id IS NULL
ORDER BY af.created_at DESC
LIMIT 5;