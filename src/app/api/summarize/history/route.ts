// app/api/summarize/history/route.ts
// Updated to match your actual table schema

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  console.log('=== API Route Called ===');
  
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Query params:', { userId, limit, sortBy, sortOrder });

    // Get authenticated user (for security)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('Auth error:', authError.message);
    }
    
    // Use authenticated user ID if available, otherwise use the provided userId
    const queryUserId = user?.id || userId;
    console.log('Querying for user:', queryUserId);

    // Query your actual table structure
    let query = supabase
      .from('summaries')
      .select(`
        id,
        title,
        content,
        summary_type,
        language,
        source_documents,
        query,
        created_at,
        updated_at,
        user_id
      `);

    // Filter by user_id if we have one
    if (queryUserId) {
      query = query.eq('user_id', queryUserId);
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'updated_at', 'title', 'summary_type'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc';
    
    query = query.order(sortColumn, { ascending: sortDirection });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    console.log('Executing query...');
    const { data: summaries, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch summaries from database', details: fetchError.message },
        { status: 500 }
      );
    }

    console.log(`Found ${summaries?.length || 0} summaries`);
    
    // Try to extract document information from source_documents metadata
    // This is a fallback approach since document_id column may not exist yet
    
    // Transform data to match frontend expectations
    const transformedSummaries = summaries?.map(summary => {
      // Calculate word count from content
      const wordCount = summary.content ? summary.content.split(' ').length : 0;
      // Try to extract document title from source_documents metadata
      let documentTitle = null;
      if (summary.source_documents && typeof summary.source_documents === 'object') {
        // Check if source_documents contains document information
        if (Array.isArray(summary.source_documents) && summary.source_documents.length > 0) {
          documentTitle = summary.source_documents[0].filename || summary.source_documents[0].title || summary.source_documents[0].name || null;
        } else if (summary.source_documents.filename) {
          documentTitle = summary.source_documents.filename;
        } else if (summary.source_documents.title) {
          documentTitle = summary.source_documents.title;
        }
      }
      
      return {
        id: summary.id,
        title: summary.title || 'Untitled Summary',
        content: summary.content || '',
        documentType: summary.summary_type || 'document',
        createdAt: summary.created_at,
        updatedAt: summary.updated_at,
        wordCount: wordCount,
        processingStatus: 'completed',
        keyPoints: [], // Not in your schema
        tags: [], // Not in your schema
        metadata: summary.source_documents || {}, // Empty metadata
        documentTitle: documentTitle,
        documentId: null, // Not available in current schema
        language: summary.language,
        query: summary.query // Not in schema
      };
      }) || [];

    // Get total count for pagination
    let countQuery = supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true });
    
    if (queryUserId) {
      countQuery = countQuery.eq('user_id', queryUserId);
    }
    
    const { count } = await countQuery;

    console.log(`Total summaries: ${count}, Returning: ${transformedSummaries.length}`);

    return NextResponse.json({
      success: true,
      items: transformedSummaries,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('=== API Route FAILED ===');
    console.error('Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      title,
      content,
      summary_type = 'short',
      language = 'en',
      source_documents = [],
      query
    } = await request.json();

    // Validate required fields
    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate summary_type against valid values
    const validTypes = ['short', 'medium', 'detailed'];
    if (!validTypes.includes(summary_type)) {
      return NextResponse.json(
        { success: false, error: `Summary type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert new summary using your table structure
    const { data: summary, error: insertError } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        title: title || 'New Summary',
        content,
        summary_type,
        language,
        source_documents,
        query
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating summary:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create summary', details: insertError.message },
        { status: 500 }
      );
    }

    const wordCount = summary.content ? summary.content.split(' ').length : 0;

    return NextResponse.json({
      success: true,
      summary: {
        id: summary.id,
        title: summary.title,
        content: summary.content,
        documentType: summary.summary_type,
        createdAt: summary.created_at,
        updatedAt: summary.updated_at,
        wordCount: wordCount,
        processingStatus: 'completed'
      }
    });

  } catch (error) {
    console.error('Unexpected error in summary creation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}