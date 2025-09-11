import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Enhanced document processor functionality inline
async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const fileExtension = filename.toLowerCase().split('.').pop();
  
  try {
    switch (fileExtension) {
      case 'pdf':
        const pdfData = await pdf(buffer);
        return cleanAndFormatText(pdfData.text);
      
      case 'docx':
        // Enhanced DOCX extraction with multiple approaches
        let content = '';
        
        // First try: Raw text extraction
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
          const docResult = await mammoth.extractRawText({ buffer });
          return cleanAndFormatText(docResult.value);
        } catch {
          return cleanAndFormatText(new TextDecoder().decode(buffer));
        }
      
      case 'txt':
      case 'md':
      case 'csv':
        return cleanAndFormatText(new TextDecoder().decode(buffer));
      
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

export async function POST(request: NextRequest) {
  try {
    // Get all files with null content
    const { data: filesWithNullContent, error: fetchError } = await supabase
      .from('files')
      .select('id, filename, file_path')
      .is('content', null);

    if (fetchError) {
      console.error('Error fetching files:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    if (!filesWithNullContent || filesWithNullContent.length === 0) {
      return NextResponse.json({ 
        message: 'No files with null content found',
        processedCount: 0 
      });
    }

    console.log(`Found ${filesWithNullContent.length} files to reprocess`);
    let processedCount = 0;
    const errors: string[] = [];

    for (const file of filesWithNullContent) {
      try {
        // Download file from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(file.file_path);

        if (downloadError) {
          console.error(`Error downloading file ${file.filename}:`, downloadError);
          errors.push(`Failed to download ${file.filename}: ${downloadError.message}`);
          continue;
        }

        // Convert to buffer and extract text
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const textContent = await extractTextFromBuffer(buffer, file.filename);

        if (!textContent || textContent.trim().length === 0) {
          errors.push(`No text content extracted from ${file.filename}`);
          continue;
        }

        console.log(`Successfully extracted ${textContent.length} characters from ${file.filename}`);

        // Update file content in database
        const { error: updateError } = await supabase
          .from('files')
          .update({ content: textContent })
          .eq('id', file.id);

        if (updateError) {
          console.error(`Error updating file ${file.filename}:`, updateError);
          errors.push(`Failed to update ${file.filename}: ${updateError.message}`);
          continue;
        }

        processedCount++;
        console.log(`Successfully processed: ${file.filename}`);
      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
        errors.push(`Processing error for ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Reprocessing completed`,
      totalFiles: filesWithNullContent.length,
      processedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Reprocess files API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Reprocess files API is running' });
}