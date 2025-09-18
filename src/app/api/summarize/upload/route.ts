import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { UploadRequest, UploadResponse, ProcessingStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Enhanced document processor functionality with dynamic imports
async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const fileExtension = filename.toLowerCase().split('.').pop();
  
  try {
    switch (fileExtension) {
      case 'pdf':
        const pdf = await import('pdf-parse');
        const pdfData = await pdf.default(buffer);
        return cleanAndFormatText(pdfData.text);
      
      case 'ppt':
      case 'pptx':
        try {
          const pptx2json = await import('pptx2json');
          const pptxParser = new pptx2json.default();
          const pptData = await pptxParser.buffer2json(buffer);
          
          function extractTextFromXML(obj: any): string {
            let extractedText = '';
            
            if (typeof obj === 'string' && obj.trim().length > 0) {
              if (!obj.includes('xmlns') && !obj.includes('http://') && 
                  !obj.match(/^[0-9]+$/) && !obj.match(/^[a-f0-9-]+$/i)) {
                extractedText += obj + ' ';
              }
            } else if (typeof obj === 'object' && obj !== null) {
              Object.keys(obj).forEach(key => {
                if (key === 'a:t' || key.endsWith(':t')) {
                  extractedText += extractTextFromXML(obj[key]);
                } else if (key === 'a:p' || key.endsWith(':p') || 
                          key === 'a:r' || key.endsWith(':r') ||
                          key === 'p:txBody' || key.endsWith(':txBody')) {
                  extractedText += extractTextFromXML(obj[key]);
                } else if (Array.isArray(obj[key])) {
                  obj[key].forEach((item: any) => {
                    extractedText += extractTextFromXML(item);
                  });
                } else {
                  extractedText += extractTextFromXML(obj[key]);
                }
              });
            }
            
            return extractedText;
          }
          
          let pptText = '';
          const slideKeys = Object.keys(pptData).filter(key => key.includes('slide'));
          slideKeys.forEach(slideKey => {
            const slideData = pptData[slideKey];
            pptText += extractTextFromXML(slideData);
          });
          
          return cleanAndFormatText(pptText || `PowerPoint file: ${filename} - No text content found`);
        } catch (pptError) {
          console.error('PPT extraction error:', pptError);
          return cleanAndFormatText(`PowerPoint file: ${filename} - Content extraction failed`);
        }
      
      case 'docx':
        const mammoth = await import('mammoth');
        let content = '';
        
        const docxResult = await mammoth.extractRawText({ buffer });
        content = docxResult.value;
        
        if (content.length < 500) {
          const htmlResult = await mammoth.convertToHtml({ buffer });
          const htmlContent = htmlResult.value;
          const textContent = htmlContent.replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (textContent.length > content.length) {
            content = textContent;
          }
        }
        
        return cleanAndFormatText(content);
      
      case 'doc':
        try {
          const mammothDoc = await import('mammoth');
          const docResult = await mammothDoc.extractRawText({ buffer });
          return cleanAndFormatText(docResult.value);
        } catch {
          return cleanAndFormatText(new TextDecoder().decode(buffer));
        }
      
      case 'txt':
      case 'md':
      case 'csv':
        const chardet = await import('chardet');
        const detectedEncoding = chardet.detect(buffer);
        const encoding = detectedEncoding || 'utf-8';
        
        try {
          const decoder = new TextDecoder(encoding as BufferEncoding);
          return cleanAndFormatText(decoder.decode(buffer));
        } catch (encodingError) {
          return cleanAndFormatText(new TextDecoder().decode(buffer));
        }
      
      default:
        return cleanAndFormatText(new TextDecoder().decode(buffer));
    }
  } catch (extractionError) {
    console.error('Text extraction error:', extractionError);
    return '';
  }
}

function cleanAndFormatText(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }

  let cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n');

  cleanText = cleanText
    .replace(/PAGEREF[^\n]*/g, '')
    .replace(/TOC[^\n]*/g, '')
    .replace(/\\[ho]\s*\\[zu]\s*\\[u]/g, '');

  cleanText = cleanText
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  const paragraphs = cleanText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.join('\n\n');
}

// Chunk text into smaller pieces for processing
function chunkText(text: string, maxChunkSize: number = 4000): string[] {
  const sentences = text.split(/[.!?]+\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const userId = formData.get('userId') as string;
    const language = formData.get('language') as string || 'en';

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and user ID are required' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Extract text from file
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromBuffer(buffer, file.name);

    if (!extractedText || extractedText.length < 100) {
      return NextResponse.json(
        { error: 'Unable to extract sufficient text from file' },
        { status: 400 }
      );
    }

    // Create document record
    const documentId = uuidv4();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        content: extractedText,
        language,
        folder_id: folderId || null,
        user_id: userId,
        processing_status: 'processing' as ProcessingStatus,
        word_count: extractedText.split(/\s+/).length,
        character_count: extractedText.length
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      );
    }

    // Create document chunks for better processing
    const chunks = chunkText(extractedText);
    const chunkPromises = chunks.map((chunk, index) => 
      supabase
        .from('document_chunks')
        .insert({
          id: uuidv4(),
          document_id: documentId,
          chunk_index: index,
          content: chunk,
          word_count: chunk.split(/\s+/).length,
          character_count: chunk.length
        })
    );

    await Promise.all(chunkPromises);

    // Update document status to completed
    await supabase
      .from('documents')
      .update({ processing_status: 'completed' as ProcessingStatus })
      .eq('id', documentId);

    const response: UploadResponse = {
      success: true,
      document: {
        id: document.id,
        title: document.title,
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: document.file_size,
        language: document.language,
        processingStatus: 'completed' as ProcessingStatus,
        wordCount: document.word_count,
        characterCount: document.character_count,
        createdAt: document.created_at,
        updatedAt: document.updated_at
      },
      chunksCreated: chunks.length
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const folderId = searchParams.get('folderId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: documents || [],
      total: documents?.length || 0
    });

  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}