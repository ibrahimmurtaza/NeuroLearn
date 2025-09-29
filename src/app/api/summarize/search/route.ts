import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple text similarity function for relevance scoring
function calculateTextSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const queryWord of queryWords) {
    if (textWords.some(textWord => textWord.includes(queryWord) || queryWord.includes(textWord))) {
      matches++;
    }
  }
  
  return matches / queryWords.length;
}

// Extract relevant passages from document content
function extractRelevantPassages(query: string, content: string, maxPassages = 3): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const queryLower = query.toLowerCase();
  
  const scoredSentences = sentences.map(sentence => ({
    sentence: sentence.trim(),
    score: calculateTextSimilarity(queryLower, sentence.toLowerCase())
  })).filter(item => item.score > 0.1);
  
  scoredSentences.sort((a, b) => b.score - a.score);
  
  return scoredSentences.slice(0, maxPassages).map(item => item.sentence);
}

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
    const query = searchParams.get('q') || searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const tags = searchParams.get('tags');
    const language = searchParams.get('language');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Build the documents query
    let documentsQuery = supabaseAdmin
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        content,
        metadata,
        processing_status,
        created_at,
        updated_at,
        folder_id
      `)
      .eq('user_id', user.id)
      .eq('processing_status', 'completed')
      .not('content', 'is', null);

    // Apply filters
    if (type) {
      documentsQuery = documentsQuery.eq('file_type', type);
    }

    if (status) {
      documentsQuery = documentsQuery.eq('processing_status', status);
    }

    if (language) {
      documentsQuery = documentsQuery.eq('metadata->>language', language);
    }

    const { data: documents, error: docError } = await documentsQuery;

    if (docError) {
      console.error('Database error:', docError);
      return NextResponse.json(
        { error: 'Failed to retrieve documents' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        documents: [],
        totalResults: 0
      });
    }

    // Perform content-based search and scoring
    const searchResults = [];
    
    for (const document of documents) {
      const content = document.content || '';
      const filename = document.filename || '';
      const metadata = document.metadata || {};
      
      // Calculate relevance score based on content, filename, and metadata
      let relevanceScore = 0;
      
      // Score based on content
      if (content) {
        relevanceScore += calculateTextSimilarity(query, content) * 0.7;
      }
      
      // Score based on filename
      relevanceScore += calculateTextSimilarity(query, filename) * 0.2;
      
      // Score based on metadata (title, description, etc.)
      const metadataText = Object.values(metadata).join(' ');
      relevanceScore += calculateTextSimilarity(query, metadataText) * 0.1;
      
      // Only include documents with some relevance
      if (relevanceScore > 0.1) {
        const relevantPassages = extractRelevantPassages(query, content);
        
        searchResults.push({
          id: document.id,
          filename: document.filename,
          file_type: document.file_type,
          content: document.content,
          metadata: document.metadata,
          processing_status: document.processing_status,
          created_at: document.created_at,
          updated_at: document.updated_at,
          folder_id: document.folder_id,
          relevanceScore,
          relevantPassages
        });
      }
    }

    // Sort by relevance score (highest first)
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit
    const limitedResults = searchResults.slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      documents: limitedResults,
      totalResults: searchResults.length,
      returnedResults: limitedResults.length
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}