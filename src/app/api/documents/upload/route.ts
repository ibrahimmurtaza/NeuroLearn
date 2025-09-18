import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Service role client for file operations
const supabaseAdmin = createClient(
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
      
      case 'docx':
        const mammoth = await import('mammoth');
        const docxResult = await mammoth.extractRawText({ buffer });
        return cleanAndFormatText(docxResult.value);
      
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
        return cleanAndFormatText(new TextDecoder().decode(buffer));
      
      default:
        return cleanAndFormatText(new TextDecoder().decode(buffer));
    }
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    return `Error processing file: ${filename}`;
  }
}

function cleanAndFormatText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // Set up authenticated Supabase client
    const cookieStore = cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];

    for (const file of files) {
      try {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown'
        ];

        if (!allowedTypes.includes(file.type)) {
          console.warn(`Skipping unsupported file type: ${file.type} for file: ${file.name}`);
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`Skipping file too large: ${file.name} (${file.size} bytes)`);
          continue;
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        const storagePath = `documents/${user.id}/${uniqueFilename}`;

        // Convert file to buffer for text extraction
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Extract text content
        const textContent = await extractTextFromBuffer(buffer, file.name);

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('documents')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          continue;
        }

        // Create document record in database
        const { data: document, error: dbError } = await supabaseAdmin
          .from('documents')
          .insert({
            user_id: user.id,
            filename: file.name,
            file_type: file.type,
            storage_path: storagePath,
            metadata: {
              size: file.size,
              originalName: file.name,
              textContent: textContent.substring(0, 10000), // Store first 10k chars
              extractedAt: new Date().toISOString()
            },
            processing_status: 'completed'
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          // Clean up uploaded file if database insert fails
          await supabaseAdmin.storage
            .from('documents')
            .remove([storagePath]);
          continue;
        }

        uploadedDocuments.push({
          id: document.id,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: document.created_at,
          status: 'completed',
          tags: []
        });

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
      documents: uploadedDocuments
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}