import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { documentIds, topic } = body;

    // Validate required fields
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get document contents from the database
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        metadata,
        processing_status,
        document_chunks (
          id,
          content,
          chunk_index,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .in('id', documentIds)
      .eq('processing_status', 'completed');

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No processed documents found with the provided IDs' },
        { status: 404 }
      );
    }

    // Process and combine document content
    const processedDocuments = documents.map(doc => {
      // Sort chunks by chunk_index
      const sortedChunks = (doc.document_chunks || []).sort(
        (a, b) => a.chunk_index - b.chunk_index
      );
      
      // Combine chunk content
      const fullContent = sortedChunks.map(chunk => chunk.content).join('\n\n');
      
      return {
        id: doc.id,
        filename: doc.filename,
        fileType: doc.file_type,
        content: fullContent,
        metadata: doc.metadata,
        chunkCount: sortedChunks.length
      };
    });

    // If topic is provided, we could implement topic-based filtering here
    // For now, we'll return all content from the requested documents
    let filteredContent = processedDocuments;
    
    if (topic && topic.trim()) {
      // Simple keyword-based filtering - in a production app, you might want
      // to use more sophisticated text matching or embedding-based search
      const topicLower = topic.toLowerCase();
      filteredContent = processedDocuments.map(doc => ({
        ...doc,
        content: doc.content
          .split('\n\n')
          .filter(paragraph => 
            paragraph.toLowerCase().includes(topicLower) ||
            paragraph.length > 100 // Keep longer paragraphs as they might contain context
          )
          .join('\n\n')
      })).filter(doc => doc.content.length > 0);
    }

    // Calculate total content length for response metadata
    const totalContentLength = filteredContent.reduce(
      (sum, doc) => sum + doc.content.length, 
      0
    );

    return NextResponse.json({
      success: true,
      documents: filteredContent,
      metadata: {
        totalDocuments: filteredContent.length,
        totalContentLength,
        topic: topic || null,
        requestedIds: documentIds
      }
    });

  } catch (error) {
    console.error('Document retrieve API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for retrieving single document content
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get single document content
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        metadata,
        processing_status,
        document_chunks (
          id,
          content,
          chunk_index,
          metadata
        )
      `)
      .eq('user_id', user.id)
      .eq('id', documentId)
      .eq('processing_status', 'completed')
      .single();

    if (documentError) {
      console.error('Error fetching document:', documentError);
      return NextResponse.json(
        { error: 'Document not found or not processed' },
        { status: 404 }
      );
    }

    // Sort chunks and combine content
    const sortedChunks = (document.document_chunks || []).sort(
      (a, b) => a.chunk_index - b.chunk_index
    );
    
    const fullContent = sortedChunks.map(chunk => chunk.content).join('\n\n');

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        fileType: document.file_type,
        content: fullContent,
        metadata: document.metadata,
        chunkCount: sortedChunks.length
      }
    });

  } catch (error) {
    console.error('Document retrieve API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}