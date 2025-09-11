import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Extract text content based on file type
    const bytes = await file.arrayBuffer();
    let textContent = '';
    
    try {
      if (file.type === 'text/plain') {
        // Extract text from plain text files
        textContent = new TextDecoder().decode(bytes);
        console.log(`Extracted ${textContent.length} characters from text file`);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        // Extract text from DOCX files using mammoth
        const buffer = Buffer.from(bytes);
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
        console.log(`Extracted ${textContent.length} characters from DOCX file`);
        if (result.messages.length > 0) {
          console.log('Mammoth messages:', result.messages);
        }
      } else {
        // For other file types, store basic info for now
        textContent = `File: ${file.name} (${file.type}) - Content extraction not yet implemented for this file type`;
        console.log(`Basic info stored for ${file.type} file`);
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
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