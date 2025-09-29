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
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch quiz documents with chunk count
    const { data: documents, error } = await supabase
      .from('quiz_documents')
      .select(`
        id,
        title,
        source_type,
        language,
        created_at,
        updated_at,
        quiz_chunks (
          id,
          text
        )
      `)
      .eq('uploader_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quiz documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quiz documents' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format for QuizCreation component
    const transformedDocuments = (documents || []).map(doc => {
      // Get first chunk content for preview (limit to 200 characters)
      const firstChunk = doc.quiz_chunks?.[0];
      const content_preview = firstChunk?.text 
        ? firstChunk.text.substring(0, 200) + (firstChunk.text.length > 200 ? '...' : '')
        : 'No content preview available';

      return {
        id: doc.id,
        title: doc.title,
        content_preview,
        created_at: doc.created_at,
        chunk_count: doc.quiz_chunks?.length || 0
      };
    });

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length
    });

  } catch (error) {
    console.error('Quiz documents API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}