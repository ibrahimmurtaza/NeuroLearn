-- Create vector similarity search function for quiz chunks
-- This function enables semantic search using cosine similarity

-- Create the match_quiz_chunks function for vector similarity search
CREATE OR REPLACE FUNCTION match_quiz_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  text text,
  chunk_index integer,
  start_char integer,
  end_char integer,
  token_count integer,
  embedding vector(1536),
  embedding_id text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id,
    qc.doc_id,
    qc.text,
    qc.chunk_index,
    qc.start_char,
    qc.end_char,
    qc.token_count,
    qc.embedding,
    qc.embedding_id,
    qc.created_at,
    qc.updated_at,
    (qc.embedding <=> query_embedding) * -1 + 1 AS similarity
  FROM quiz_chunks qc
  WHERE qc.embedding IS NOT NULL
    AND (qc.embedding <=> query_embedding) * -1 + 1 >= match_threshold
  ORDER BY qc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_quiz_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_quiz_chunks TO anon;

-- Create an index on the embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS idx_quiz_chunks_embedding 
ON quiz_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_quiz_chunks_doc_id_embedding 
ON quiz_chunks (doc_id) 
WHERE embedding IS NOT NULL;

-- Create a function to get embedding statistics
CREATE OR REPLACE FUNCTION get_quiz_embedding_stats(doc_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  total_chunks bigint,
  embedded_chunks bigint,
  embedding_coverage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF doc_id_param IS NULL THEN
    -- Get stats for all documents
    RETURN QUERY
    SELECT 
      COUNT(*) AS total_chunks,
      COUNT(embedding) AS embedded_chunks,
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(embedding)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END AS embedding_coverage
    FROM quiz_chunks;
  ELSE
    -- Get stats for specific document
    RETURN QUERY
    SELECT 
      COUNT(*) AS total_chunks,
      COUNT(embedding) AS embedded_chunks,
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COUNT(embedding)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END AS embedding_coverage
    FROM quiz_chunks
    WHERE doc_id = doc_id_param;
  END IF;
END;
$$;

-- Grant execute permissions for the stats function
GRANT EXECUTE ON FUNCTION get_quiz_embedding_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiz_embedding_stats TO anon;

-- Create a function to find chunks by text similarity (hybrid search)
CREATE OR REPLACE FUNCTION search_quiz_chunks(
  search_query text,
  query_embedding vector(1536) DEFAULT NULL,
  doc_ids uuid[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  text text,
  chunk_index integer,
  start_char integer,
  end_char integer,
  token_count integer,
  embedding vector(1536),
  embedding_id text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float,
  text_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qc.id,
    qc.doc_id,
    qc.text,
    qc.chunk_index,
    qc.start_char,
    qc.end_char,
    qc.token_count,
    qc.embedding,
    qc.embedding_id,
    qc.created_at,
    qc.updated_at,
    CASE 
      WHEN query_embedding IS NOT NULL AND qc.embedding IS NOT NULL 
      THEN (qc.embedding <=> query_embedding) * -1 + 1
      ELSE 0
    END AS similarity,
    ts_rank(to_tsvector('english', qc.text), plainto_tsquery('english', search_query)) AS text_rank
  FROM quiz_chunks qc
  WHERE 
    (
      -- Vector similarity condition
      (query_embedding IS NOT NULL 
       AND qc.embedding IS NOT NULL 
       AND (qc.embedding <=> query_embedding) * -1 + 1 >= match_threshold)
      OR
      -- Text search condition
      (search_query IS NOT NULL 
       AND to_tsvector('english', qc.text) @@ plainto_tsquery('english', search_query))
    )
    AND (doc_ids IS NULL OR qc.doc_id = ANY(doc_ids))
  ORDER BY 
    CASE 
      WHEN query_embedding IS NOT NULL AND qc.embedding IS NOT NULL 
      THEN (qc.embedding <=> query_embedding)
      ELSE ts_rank(to_tsvector('english', qc.text), plainto_tsquery('english', search_query)) * -1
    END
  LIMIT match_count;
END;
$$;

-- Grant execute permissions for the search function
GRANT EXECUTE ON FUNCTION search_quiz_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION search_quiz_chunks TO anon;

-- Create text search index for hybrid search
CREATE INDEX IF NOT EXISTS idx_quiz_chunks_text_search 
ON quiz_chunks USING gin(to_tsvector('english', text));

-- Create a function to cleanup orphaned embeddings
CREATE OR REPLACE FUNCTION cleanup_quiz_embeddings()
RETURNS TABLE (
  cleaned_chunks bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count bigint;
BEGIN
  -- Clear embeddings for chunks whose documents no longer exist
  UPDATE quiz_chunks 
  SET embedding = NULL, embedding_id = NULL
  WHERE doc_id NOT IN (SELECT id FROM quiz_documents);
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN QUERY SELECT cleaned_count;
END;
$$;

-- Grant execute permissions for the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_quiz_embeddings TO authenticated;

-- Add a comment explaining the vector similarity calculation
COMMENT ON FUNCTION match_quiz_chunks IS 'Performs vector similarity search on quiz chunks using cosine distance. Returns chunks with similarity above threshold, ordered by similarity score.';
COMMENT ON FUNCTION get_quiz_embedding_stats IS 'Returns embedding coverage statistics for quiz chunks, either globally or for a specific document.';
COMMENT ON FUNCTION search_quiz_chunks IS 'Performs hybrid search combining vector similarity and full-text search on quiz chunks.';
COMMENT ON FUNCTION cleanup_quiz_embeddings IS 'Removes orphaned embeddings from chunks whose parent documents have been deleted.';