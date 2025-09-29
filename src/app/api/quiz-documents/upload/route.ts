import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime for this route
export const runtime = 'nodejs';
// Resource limits to prevent OOM
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TEXT_LENGTH = 750_000; // Cap text length to 750k characters
const CHUNK_LIMIT = 200; // Maximum number of chunks to process per document
const CHUNK_SIZE = 1000; // Target chunk size
const CHUNK_OVERLAP = 150; // Overlap between chunks
import { createClient } from '@supabase/supabase-js';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';
import { QuizDocument, QuizChunk } from '@/types/quiz';
import OpenAI from 'openai';
import pdf from 'pdf-parse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const errorHandler = ErrorHandlingService.getInstance();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('user_id') as string;
    const title = formData.get('title') as string;
    const language = formData.get('language') as string || 'en';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Guard: reject overly large files to avoid memory exhaustion
    if (file.size && file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Please upload files up to 10MB.' },
        { status: 413 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, TXT, MD, or DOCX files.' },
        { status: 400 }
      );
    }

    // Extract text from file
    let text = await extractTextFromFile(file);

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: 'File content is too short or could not be extracted' },
        { status: 400 }
      );
    }

    // Guard: cap text length to prevent excessive chunking
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
    }

    // Create document record (matching database schema)
    const documentData = {
      title: title || file.name,
      source_type: getSourceType(file.type),
      uploader_id: userId,
      language
    };

    // Save document to database
    const { data: insertedDoc, error: docError } = await supabase
      .from('quiz_documents')
      .insert(documentData)
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to save document: ${docError.message}`);
    }

    const document = insertedDoc;

    // Process text into chunks with an upper bound
    const chunks = await processTextIntoChunks(text, document.id, CHUNK_LIMIT);

    // Generate embeddings and save chunks sequentially to reduce memory pressure
    for (const chunk of chunks) {
      await saveChunkWithEmbedding(chunk);
    }

    return NextResponse.json({
      success: true,
      document_id: document.id,
      title: document.title,
      chunk_count: chunks.length,
      content_preview: text.substring(0, 500)
    });

  } catch (error) {
    await errorHandler.handleError(error as Error, {
      type: ErrorType.PROCESSING_ERROR,
      severity: ErrorSeverity.HIGH,
      context: { endpoint: '/api/quiz-documents/upload' }
    });

    console.error('Document upload error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function sanitizeText(input: string): string {
  try {
    // Remove NUL bytes and other control characters (keep \n, \r, \t)
    let sanitized = input.replace(/\u0000/g, '');
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
    // Normalize unicode to reduce odd sequences
    return sanitized.normalize('NFKC');
  } catch {
    // Fallback in case .normalize throws (rare)
    return input.replace(/\u0000/g, '');
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  
  try {
    // Handle different file types properly
    if (file.type === 'application/pdf') {
      // Use pdf-parse for proper PDF text extraction
      const data = await pdf(Buffer.from(buffer));
      return sanitizeText(data.text);
    } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
      // Handle text files directly
      const content = new TextDecoder().decode(buffer);
      return sanitizeText(content);
    } else {
      // For other supported file types, try text decoding as fallback
      const content = new TextDecoder().decode(buffer);
      return sanitizeText(content);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.type} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getSourceType(mimeType: string): 'pdf' | 'txt' | 'md' | 'docx' {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'text/markdown':
      return 'md';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    default:
      return 'txt';
  }
}

async function processTextIntoChunks(text: string, docId: string, maxChunks: number = CHUNK_LIMIT): Promise<QuizChunk[]> {
  const chunks: QuizChunk[] = [];
  const chunkSize = CHUNK_SIZE; // Target chunk size
  const overlap = CHUNK_OVERLAP; // Overlap between chunks

  let startOffset = 0;
  let chunkIndex = 0;

  while (startOffset < text.length && chunks.length < maxChunks) {
    const endOffset = Math.min(startOffset + chunkSize, text.length);
    const chunkText = text.substring(startOffset, endOffset);

    // Try to break at sentence boundaries
    let actualEndOffset = endOffset;
    if (endOffset < text.length) {
      const lastSentenceEnd = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const breakPoint = Math.max(lastSentenceEnd, lastNewline);

      if (breakPoint > chunkSize * 0.7) { // Don't make chunks too small
        actualEndOffset = startOffset + breakPoint + 1;
      }
    }

    const finalChunkText = sanitizeText(text.substring(startOffset, actualEndOffset).trim());

    if (finalChunkText.length > 50) { // Only include meaningful chunks
      const chunk: QuizChunk = {
        id: `chunk_${docId}_${chunkIndex}`,
        doc_id: docId,
        text: finalChunkText,
        start_offset: startOffset,
        end_offset: actualEndOffset
      };

      chunks.push(chunk);
      chunkIndex++;

      if (chunks.length >= maxChunks) {
        break;
      }
    }

    startOffset = actualEndOffset - overlap;
    if (startOffset >= actualEndOffset) {
      break; // Prevent infinite loop
    }
  }

  return chunks;
}

async function saveChunkWithEmbedding(chunk: QuizChunk): Promise<void> {
  try {
    const textForEmbedding = sanitizeText(chunk.text);
    if (!textForEmbedding.trim()) {
      console.warn('Skipping empty/invalid chunk text after sanitization:', { doc_id: chunk.doc_id });
      return;
    }

    // Generate embedding with a lightweight model
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textForEmbedding
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Save chunk to database (matching database schema)
    const { error: chunkError } = await supabase
      .from('quiz_chunks')
      .insert({
        doc_id: chunk.doc_id,
        text: textForEmbedding,
        start_offset: chunk.start_offset,
        end_offset: chunk.end_offset,
        embedding
      });

    if (chunkError) {
      console.error('Error saving chunk:', chunkError);
    }

  } catch (error) {
    console.error('Error processing chunk:', error);
    // Save chunk without embedding as fallback
    const textForInsert = sanitizeText(chunk.text);
    if (!textForInsert.trim()) {
      console.warn('Skipping empty/invalid chunk text after sanitization (fallback):', { doc_id: chunk.doc_id });
      return;
    }

    await supabase
      .from('quiz_chunks')
      .insert({
        doc_id: chunk.doc_id,
        text: textForInsert,
        start_offset: chunk.start_offset,
        end_offset: chunk.end_offset
      });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}