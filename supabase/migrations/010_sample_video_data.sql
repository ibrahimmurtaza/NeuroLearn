-- Sample data for testing video summarization feature
-- This migration adds test data to verify the schema works correctly

-- Insert sample video summary
INSERT INTO video_summaries (
  id,
  user_id,
  title,
  description,
  video_url,
  duration,
  summary,
  key_points,
  summary_options,
  processing_status
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440000', -- Use test user ID
  'Introduction to Machine Learning',
  'A comprehensive overview of machine learning fundamentals and applications',
  'https://www.youtube.com/watch?v=example123',
  1800, -- 30 minutes
  'This video provides a comprehensive introduction to machine learning, covering fundamental concepts, algorithms, and real-world applications. The presenter explains supervised and unsupervised learning, discusses popular algorithms like linear regression and decision trees, and demonstrates practical examples.',
  '[
    {"point": "Machine learning is a subset of artificial intelligence", "importance": "high", "timestamp": 120},
    {"point": "Supervised learning uses labeled training data", "importance": "high", "timestamp": 300},
    {"point": "Popular algorithms include linear regression and decision trees", "importance": "medium", "timestamp": 600},
    {"point": "Real-world applications span multiple industries", "importance": "medium", "timestamp": 1200}
  ]'::jsonb,
  '{
    "length": "medium",
    "focus": "educational",
    "language": "en",
    "include_timestamps": true,
    "extract_key_points": true
  }'::jsonb,
  'completed'
);

-- Insert sample transcript segments
INSERT INTO video_transcripts (
  video_summary_id,
  start_time,
  end_time,
  text,
  confidence,
  speaker
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440000',
  0.0,
  15.5,
  'Welcome to this introduction to machine learning. Today we will explore the fundamental concepts.',
  0.95,
  'Instructor'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  15.5,
  45.2,
  'Machine learning is a powerful subset of artificial intelligence that enables computers to learn and make decisions from data.',
  0.92,
  'Instructor'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  45.2,
  78.8,
  'There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.',
  0.94,
  'Instructor'
);

-- Insert sample timestamps for key moments
INSERT INTO video_timestamps (
  video_summary_id,
  timestamp,
  title,
  description,
  importance,
  category
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440000',
  120.0,
  'Definition of Machine Learning',
  'Clear explanation of what machine learning is and its relationship to AI',
  'high',
  'concept'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  300.0,
  'Supervised Learning Introduction',
  'Introduction to supervised learning with examples',
  'high',
  'algorithm'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  600.0,
  'Popular Algorithms Overview',
  'Discussion of common machine learning algorithms',
  'medium',
  'algorithm'
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  1200.0,
  'Real-world Applications',
  'Examples of machine learning in various industries',
  'medium',
  'application'
);

-- Insert sample video frames
INSERT INTO video_frames (
  video_summary_id,
  timestamp,
  frame_path,
  description,
  frame_type,
  analysis_data
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440000',
  120.0,
  '/frames/ml_intro_120s.jpg',
  'Slide showing the definition of machine learning with key bullet points',
  'slide',
  '{
    "objects_detected": ["text", "diagram", "bullet_points"],
    "text_content": "Machine Learning Definition",
    "visual_elements": ["title", "bullet_list", "background"]
  }'::jsonb
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  300.0,
  '/frames/ml_intro_300s.jpg',
  'Diagram illustrating supervised learning process with training data',
  'diagram',
  '{
    "objects_detected": ["flowchart", "arrows", "data_boxes"],
    "diagram_type": "process_flow",
    "key_concepts": ["training_data", "algorithm", "model"]
  }'::jsonb
),
(
  '550e8400-e29b-41d4-a716-446655440000',
  600.0,
  '/frames/ml_intro_600s.jpg',
  'Comparison chart of different machine learning algorithms',
  'chart',
  '{
    "chart_type": "comparison_table",
    "algorithms_shown": ["linear_regression", "decision_trees", "neural_networks"],
    "visual_elements": ["table", "headers", "data_rows"]
  }'::jsonb
);

-- Verify the data was inserted correctly
SELECT 'Sample data inserted successfully' as status;

-- Show summary of inserted data
SELECT 
  'video_summaries' as table_name,
  COUNT(*) as record_count
FROM video_summaries
WHERE id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
  'video_transcripts' as table_name,
  COUNT(*) as record_count
FROM video_transcripts
WHERE video_summary_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
  'video_timestamps' as table_name,
  COUNT(*) as record_count
FROM video_timestamps
WHERE video_summary_id = '550e8400-e29b-41d4-a716-446655440000'

UNION ALL

SELECT 
  'video_frames' as table_name,
  COUNT(*) as record_count
FROM video_frames
WHERE video_summary_id = '550e8400-e29b-41d4-a716-446655440000';