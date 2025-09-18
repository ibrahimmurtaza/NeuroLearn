import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service role client for file operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document details and verify ownership
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, filename, file_type, storage_path, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from('documents')
      .download(document.storage_path);

    if (storageError || !fileData) {
      console.error('Error downloading file from storage:', storageError);
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Set appropriate headers for viewing
    const headers = new Headers();
    headers.set('Content-Type', document.file_type);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Content-Disposition', `inline; filename="${document.filename}"`);
    
    // Add cache control headers
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('ETag', `"${documentId}"`);
    
    // Handle conditional requests
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === `"${documentId}"`) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Document view error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}