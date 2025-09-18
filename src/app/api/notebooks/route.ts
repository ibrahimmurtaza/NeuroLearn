import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateNotebookRequest {
  title: string;
  description?: string;
  userId?: string;
}

interface UpdateNotebookRequest {
  title?: string;
  description?: string;
}

// Create a new notebook
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

    const { title, description, userId }: CreateNotebookRequest = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Notebook title is required' },
        { status: 400 }
      );
    }

    const { data: notebook, error } = await supabaseClient
      .from('notebooks')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create notebook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notebook: {
        id: notebook.id,
        title: notebook.title,
        description: notebook.description,
        userId: notebook.user_id,
        createdAt: notebook.created_at,
        updatedAt: notebook.updated_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create notebook error:', error);
    return NextResponse.json(
      { error: 'Failed to create notebook' },
      { status: 500 }
    );
  }
}

// Get all notebooks or notebooks for a specific user
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
    const userId = searchParams.get('userId');
    const notebookId = searchParams.get('id');

    // Get specific notebook with files and conversation count
    if (notebookId) {
      const { data: notebook, error: notebookError } = await supabaseClient
        .from('notebooks')
        .select(`
          *,
          notebook_files (
            files (
              id,
              filename,
              file_type,
              file_size,
              created_at
            )
          )
        `)
        .eq('id', notebookId)
        .eq('user_id', user.id)
        .single();

      if (notebookError) {
        console.error('Database error:', notebookError);
        return NextResponse.json(
          { error: 'Notebook not found' },
          { status: 404 }
        );
      }

      // Get conversation count
      const { count: conversationCount } = await supabaseClient
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('notebook_id', notebookId);

      const files = notebook.notebook_files?.map((nf: any) => nf.files).filter(Boolean) || [];

      return NextResponse.json({
        notebook: {
          id: notebook.id,
          title: notebook.title,
          description: notebook.description,
          userId: notebook.user_id,
          createdAt: notebook.created_at,
          updatedAt: notebook.updated_at,
          files: files,
          conversationCount: conversationCount || 0
        }
      });
    }

    // Get all notebooks for the current user only
    const { data: notebooks, error } = await supabaseClient
      .from('notebooks')
      .select(`
        *,
        notebook_files (
          files (
            id,
            filename
          )
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notebooks' },
        { status: 500 }
      );
    }

    // Get conversation counts for each notebook
    const notebooksWithCounts = await Promise.all(
      (notebooks || []).map(async (notebook) => {
        const { count: conversationCount } = await supabaseClient
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('notebook_id', notebook.id);

        const fileCount = notebook.notebook_files?.length || 0;
        const fileNames = notebook.notebook_files?.map((nf: any) => nf.files?.filename).filter(Boolean) || [];

        return {
          id: notebook.id,
          title: notebook.title,
          description: notebook.description,
          userId: notebook.user_id,
          createdAt: notebook.created_at,
          updatedAt: notebook.updated_at,
          fileCount,
          fileNames: fileNames.slice(0, 3), // Show first 3 file names
          conversationCount: conversationCount || 0
        };
      })
    );

    return NextResponse.json({
      notebooks: notebooksWithCounts
    });

  } catch (error) {
    console.error('Get notebooks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notebooks' },
      { status: 500 }
    );
  }
}

// Update a notebook
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

    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('id');
    const { title, description }: UpdateNotebookRequest = await request.json();

    if (!notebookId) {
      return NextResponse.json(
        { error: 'Notebook ID is required' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Notebook title is required' },
        { status: 400 }
      );
    }

    // First check if the notebook belongs to the current user
    const { data: existingNotebook, error: fetchError } = await supabaseClient
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single();

    if (fetchError || !existingNotebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    if (existingNotebook.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own notebooks' },
        { status: 403 }
      );
    }

    const { data: notebook, error } = await supabaseClient
      .from('notebooks')
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', notebookId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update notebook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notebook: {
        id: notebook.id,
        title: notebook.title,
        description: notebook.description,
        userId: notebook.user_id,
        createdAt: notebook.created_at,
        updatedAt: notebook.updated_at
      }
    });

  } catch (error) {
    console.error('Update notebook error:', error);
    return NextResponse.json(
      { error: 'Failed to update notebook' },
      { status: 500 }
    );
  }
}

// Delete a notebook
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
    const notebookId = searchParams.get('id');

    if (!notebookId) {
      return NextResponse.json(
        { error: 'Notebook ID is required' },
        { status: 400 }
      );
    }

    // First check if the notebook belongs to the current user
    const { data: existingNotebook, error: fetchError } = await supabaseClient
      .from('notebooks')
      .select('user_id')
      .eq('id', notebookId)
      .single();

    if (fetchError || !existingNotebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    if (existingNotebook.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own notebooks' },
        { status: 403 }
      );
    }

    // Delete in order: conversations, notebook_files, then notebook
    // This handles foreign key constraints properly
    
    // Delete conversations
    await supabaseClient
      .from('conversations')
      .delete()
      .eq('notebook_id', notebookId);

    // Get associated files to potentially clean up orphaned files
    const { data: notebookFiles } = await supabaseClient
      .from('notebook_files')
      .select('file_id')
      .eq('notebook_id', notebookId);

    // Delete notebook-file associations
    await supabaseClient
      .from('notebook_files')
      .delete()
      .eq('notebook_id', notebookId);

    // Delete orphaned files (files not associated with any notebook)
    if (notebookFiles && notebookFiles.length > 0) {
      const fileIds = notebookFiles.map(nf => nf.file_id);
      
      for (const fileId of fileIds) {
        const { count } = await supabaseClient
          .from('notebook_files')
          .select('*', { count: 'exact', head: true })
          .eq('file_id', fileId);

        // If file is not associated with any other notebook, delete it
        if (count === 0) {
          await supabaseClient
            .from('files')
            .delete()
            .eq('id', fileId);
        }
      }
    }

    // Finally, delete the notebook
    const { error } = await supabaseClient
      .from('notebooks')
      .delete()
      .eq('id', notebookId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete notebook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notebook deleted successfully'
    });

  } catch (error) {
    console.error('Delete notebook error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notebook' },
      { status: 500 }
    );
  }
}