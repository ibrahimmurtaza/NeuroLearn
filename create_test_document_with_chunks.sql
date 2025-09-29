-- Create a test document with chunks for quiz generation testing

-- Insert a test document
INSERT INTO quiz_documents (
    id,
    title,
    source_type,
    uploader_id,
    language,
    content
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Test Document for Quiz Generation',
    'txt',
    '22222222-2222-2222-2222-222222222222', -- our test user
    'en',
    'Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. The core principle of machine learning is to create systems that can learn and adapt without being explicitly programmed for every scenario. There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled training data to learn a mapping function from input to output. Common examples include classification tasks like email spam detection and regression tasks like predicting house prices. Unsupervised learning finds hidden patterns in data without labeled examples, such as clustering customers based on purchasing behavior. Reinforcement learning involves an agent learning to make decisions by receiving rewards or penalties for actions taken in an environment.'
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content;

-- Insert test chunks for this document
INSERT INTO quiz_chunks (id, doc_id, text, start_offset, end_offset, page) VALUES
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience.', 0, 200, 1),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled training data to learn a mapping function from input to output.', 300, 500, 1),
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Unsupervised learning finds hidden patterns in data without labeled examples, such as clustering customers based on purchasing behavior. Reinforcement learning involves an agent learning to make decisions by receiving rewards or penalties.', 600, 800, 1)
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text;

-- Verify the data was inserted
SELECT 
    d.id as doc_id,
    d.title,
    COUNT(c.id) as chunk_count
FROM quiz_documents d
LEFT JOIN quiz_chunks c ON d.id = c.doc_id
WHERE d.id = '33333333-3333-3333-3333-333333333333'
GROUP BY d.id, d.title;