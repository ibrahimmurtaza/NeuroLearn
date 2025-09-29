import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const fileType = searchParams.get('fileType');

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        storage_path,
        metadata,
        processing_status,
        created_at,
        updated_at,
        folder_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    if (fileType) {
      query = query.eq('file_type', fileType);
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
      success: true,
      documents: documents || [],
      count: documents?.length || 0
    });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { 
      filename, 
      fileType, 
      storagePath, 
      folderId, 
      metadata = {} 
    } = body;

    // Validate required fields
    if (!filename || !fileType || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, fileType, storagePath' },
        { status: 400 }
      );
    }

    // Insert document record
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        filename,
        file_type: fileType,
        storage_path: storagePath,
        folder_id: folderId || null,
        metadata,
        processing_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
      message: 'Document created successfully'
    });

  } catch (error) {
    console.error('Document creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { 
      documentId, 
      filename, 
      folderId, 
      metadata, 
      processingStatus 
    } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (filename) updateData.filename = filename;
    if (folderId !== undefined) updateData.folder_id = folderId;
    if (metadata) updateData.metadata = metadata;
    if (processingStatus) updateData.processing_status = processingStatus;

    // Update document (only if user owns it)
    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
      message: 'Document updated successfully'
    });

  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Delete document (only if user owns it)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}