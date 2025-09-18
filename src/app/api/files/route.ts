import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        // PPT extraction using pptx2json
        try {
          const pptx2json = await import('pptx2json');
          const pptxParser = new pptx2json.default();
          const pptData = await pptxParser.buffer2json(buffer);
          
          // Extract text from XML structure returned by buffer2json
          function extractTextFromXML(obj: any): string {
            let extractedText = '';
            
            if (typeof obj === 'string' && obj.trim().length > 0) {
              // Skip XML attributes and metadata
              if (!obj.includes('xmlns') && !obj.includes('http://') && 
                  !obj.match(/^[0-9]+$/) && !obj.match(/^[a-f0-9-]+$/i)) {
                extractedText += obj + ' ';
              }
            } else if (typeof obj === 'object' && obj !== null) {
              Object.keys(obj).forEach(key => {
                // Focus on text content nodes
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
          
          // Look for slide files in the parsed data
          let pptText = '';
          const slideKeys = Object.keys(pptData).filter(key => key.includes('slide'));
          slideKeys.forEach(slideKey => {
            const slideData = pptData[slideKey];
            pptText += extractTextFromXML(slideData);
          });
          
          return cleanAndFormatText(pptText || `PowerPoint file: ${filename} - No text content found`);
        } catch (pptError) {
          console.error('PPT extraction error:', pptError);
          return cleanAndFormatText(`PowerPoint file: ${filename} - Content extraction failed: ${pptError.message}`);
        }
      
      case 'docx':
        // Enhanced DOCX extraction with multiple approaches
        let content = '';
        
        // First try: Raw text extraction
        const mammoth = await import('mammoth');
        const docxResult = await mammoth.extractRawText({ buffer });
        content = docxResult.value;
        
        // If content is too short, try HTML conversion approach
        if (content.length < 500) {
          console.log('Mammoth raw text extraction seems incomplete, trying HTML approach');
          const htmlResult = await mammoth.convertToHtml({ buffer });
          const htmlContent = htmlResult.value;
          
          // Strip HTML tags to get plain text
          const textContent = htmlContent.replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (textContent.length > content.length) {
            content = textContent;
          }
        }
        
        return cleanAndFormatText(content);
      
      case 'doc':
        // For .doc files, try mammoth (limited support)
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
        // Enhanced text file handling with encoding detection
        const chardet = await import('chardet');
        const detectedEncoding = chardet.detect(buffer);
        const encoding = detectedEncoding || 'utf-8';
        console.log(`Detected encoding for ${filename}: ${encoding}`);
        
        try {
          const decoder = new TextDecoder(encoding as BufferEncoding);
          return cleanAndFormatText(decoder.decode(buffer));
        } catch (encodingError) {
          console.warn(`Failed to decode with ${encoding}, falling back to utf-8`);
          return cleanAndFormatText(new TextDecoder().decode(buffer));
        }
      
      default:
        // Fallback for unsupported file types
        return cleanAndFormatText(new TextDecoder().decode(buffer));
    }
  } catch (extractionError) {
    console.error('Text extraction error:', extractionError);
    // Return empty string for failed extractions
    return '';
  }
}

// Clean and format extracted text for better readability
function cleanAndFormatText(text: string): string {
  if (!text || text.trim().length === 0) {
    return '';
  }

  // Normalize whitespace and line breaks
  let cleanText = text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')    // Handle old Mac line endings
    .replace(/\t/g, ' ')     // Replace tabs with spaces
    .replace(/\s+/g, ' ')    // Collapse multiple spaces
    .replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks

  // Remove common document artifacts
  cleanText = cleanText
    .replace(/PAGEREF[^\n]*/g, '')  // Remove page references
    .replace(/TOC[^\n]*/g, '')     // Remove table of contents artifacts
    .replace(/\\[ho]\s*\\[zu]\s*\\[u]/g, ''); // Remove formatting codes

  // Ensure proper sentence spacing
  cleanText = cleanText
    .replace(/([.!?])([A-Z])/g, '$1 $2')  // Add space after sentence endings
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase

  // Split into paragraphs and clean each one
  const paragraphs = cleanText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.join('\n\n');
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/files - Starting request');
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('notebookId');
    
    console.log('Notebook ID:', notebookId);
    
    if (!notebookId) {
      console.log('No notebook ID provided');
      return NextResponse.json({ error: 'Notebook ID is required' }, { status: 400 });
    }

    console.log('Querying files for notebook:', notebookId);
    const { data: files, error } = await supabase
      .from('notebook_files')
      .select(`
        files (
          id,
          filename,
          file_type,
          file_size,
          content,
          created_at
        )
      `)
      .eq('notebook_id', notebookId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    // Extract files from the junction table result
    const filesList = files?.map(item => item.files).filter(Boolean) || [];
    console.log('Files found:', filesList.length);
    return NextResponse.json({ files: filesList });

  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/files called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const notebookId = formData.get('notebookId') as string;

    console.log('File:', file?.name, 'Size:', file?.size, 'Type:', file?.type);
    console.log('Notebook ID:', notebookId);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!notebookId) {
      return NextResponse.json(
        { error: 'Notebook ID is required' },
        { status: 400 }
      );
    }

    // Extract text content using enhanced extraction functions
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let textContent = '';
    
    try {
      textContent = await extractTextFromBuffer(buffer, file.name);
      
      if (!textContent || textContent.trim().length === 0) {
        console.warn(`No text content extracted from ${file.name}`);
        textContent = `File: ${file.name} (${file.type}) - No extractable text content found`;
      } else {
        console.log(`Successfully extracted ${textContent.length} characters from ${file.name}`);
      }
    } catch (extractionError) {
      console.error(`Text extraction error for ${file.name}:`, extractionError);
      textContent = `File: ${file.name} - Error during content extraction: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`;
    }

    // Insert file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        filename: file.name,
        file_type: (file.type || 'application/octet-stream').substring(0, 50),
        file_size: file.size,
        content: textContent
      })
      .select()
      .single();

    if (fileError) {
      console.error('Database error:', fileError);
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }

    // Link file to notebook
    const { error: linkError } = await supabase
      .from('notebook_files')
      .insert({
        notebook_id: notebookId,
        file_id: fileRecord.id
      });

    if (linkError) {
      console.error('Link error:', linkError);
      return NextResponse.json({ error: 'Failed to link file to notebook' }, { status: 500 });
    }

    console.log(`File ${file.name} successfully processed and stored with ID: ${fileRecord.id}`);

    return NextResponse.json({
      message: 'File processed and stored successfully',
      file: {
        id: fileRecord.id,
        name: file.name,
        type: file.type,
        size: file.size,
        extractedLength: textContent.length,
        preview: textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''),
        notebookId: notebookId
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
       { error: 'Failed to process file' },
       { status: 500 }
     );
   }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Delete from notebook_files junction table first
    const { error: junctionError } = await supabase
      .from('notebook_files')
      .delete()
      .eq('file_id', fileId);

    if (junctionError) {
      console.error('Error deleting from notebook_files:', junctionError);
      return NextResponse.json({ error: 'Failed to delete file association' }, { status: 500 });
    }

    // Delete from files table
    const { error: fileError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (fileError) {
      console.error('Error deleting file:', fileError);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/files error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}