-- Clear mock translations from cache that contain language prefixes like [ES], [FR], etc.
-- This will force the system to fetch fresh translations from Microsoft Translator API

DELETE FROM translation_cache 
WHERE translated_text ~ '^\[[A-Z]{2}\]';

-- Also clear any translations that look like mock data (same as original text with language prefix)
DELETE FROM translation_cache 
WHERE translated_text LIKE '[%] %' 
AND SUBSTRING(translated_text FROM 5) = original_text;

-- Clear any translations with very low confidence scores (likely mock data)
DELETE FROM translation_cache 
WHERE confidence_score < 0.1;

COMMIT;