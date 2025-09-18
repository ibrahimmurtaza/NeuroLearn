import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HistoryRequest, HistoryResponse, HistoryItem } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// History utilities
function formatHistoryItem(summary: any, document?: any): HistoryItem {
  return {
    id: summary.id,
    title: summary.metadata?.title || document?.title || 'Untitled',
    type: summary.summary_type,
    content: summary.content,
    keyPoints: summary.key_points || [],
    language: summary.language,
    wordCount: summary.word_count,
    processingStatus: summary.processing_status,
    documentId: summary.document_id,
    documentTitle: document?.title,
    documentType: document?.file_type,
    createdAt: summary.created_at,
    updatedAt: summary.updated_at,
    metadata: {
      analysisType: summary.metadata?.analysis_type,
      documentIds: summary.metadata?.document_ids,
      documentTitles: summary.metadata?.document_titles,
      connections: summary.metadata?.connections,
      processingTime: summary.metadata?.processing_time,
      modelUsed: summary.metadata?.model_used
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // 'document', 'video', 'audio', 'multi_doc', etc.
    const language = searchParams.get('language');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('summaries')
      .select(`
        *,
        documents (
          id,
          title,
          file_type,
          file_size,
          created_at
        )
      `)
      .eq('user_id', userId)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      if (type === 'multi_doc') {
        query = query.like('summary_type', 'multi_doc_%');
      } else {
        query = query.eq('summary_type', type);
      }
    }

    if (language) {
      query = query.eq('language', language);
    }

    if (search) {
      query = query.or(`content.ilike.%${search}%,metadata->>title.ilike.%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'word_count', 'summary_type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    
    query = query.order(sortField, { ascending });

    const { data: summaries, error: summariesError } = await query;

    if (summariesError) {
      console.error('Error fetching history:', summariesError);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('summaries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (type) {
      if (type === 'multi_doc') {
        countQuery = countQuery.like('summary_type', 'multi_doc_%');
      } else {
        countQuery = countQuery.eq('summary_type', type);
      }
    }

    if (language) {
      countQuery = countQuery.eq('language', language);
    }

    if (search) {
      countQuery = countQuery.or(`content.ilike.%${search}%,metadata->>title.ilike.%${search}%`);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting count:', countError);
    }

    // Format history items
    const historyItems: HistoryItem[] = summaries?.map(summary => 
      formatHistoryItem(summary, summary.documents)
    ) || [];

    // Get statistics
    const { data: stats } = await supabase
      .from('summaries')
      .select('summary_type, language, created_at')
      .eq('user_id', userId);

    const statistics = {
      totalSummaries: count || 0,
      byType: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      byMonth: {} as Record<string, number>
    };

    if (stats) {
      stats.forEach(stat => {
        // Count by type
        statistics.byType[stat.summary_type] = (statistics.byType[stat.summary_type] || 0) + 1;
        
        // Count by language
        statistics.byLanguage[stat.language] = (statistics.byLanguage[stat.language] || 0) + 1;
        
        // Count by month
        const month = new Date(stat.created_at).toISOString().slice(0, 7); // YYYY-MM
        statistics.byMonth[month] = (statistics.byMonth[month] || 0) + 1;
      });
    }

    const response: HistoryResponse = {
      success: true,
      items: historyItems,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      },
      statistics,
      filters: {
        type,
        language,
        search,
        dateFrom,
        dateTo,
        sortBy: sortField,
        sortOrder
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body: { summaryIds: string[]; userId: string } = await request.json();
    const { summaryIds, userId } = body;

    if (!summaryIds?.length || !userId) {
      return NextResponse.json(
        { error: 'Summary IDs and user ID are required' },
        { status: 400 }
      );
    }

    // Verify ownership and delete summaries
    const { data: summaries, error: fetchError } = await supabase
      .from('summaries')
      .select('id')
      .in('id', summaryIds)
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching summaries for deletion:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify summaries' },
        { status: 500 }
      );
    }

    if (!summaries || summaries.length !== summaryIds.length) {
      return NextResponse.json(
        { error: 'Some summaries not found or access denied' },
        { status: 404 }
      );
    }

    // Delete summary sources first (foreign key constraint)
    const { error: sourcesError } = await supabase
      .from('summary_sources')
      .delete()
      .in('summary_id', summaryIds);

    if (sourcesError) {
      console.error('Error deleting summary sources:', sourcesError);
      return NextResponse.json(
        { error: 'Failed to delete summary sources' },
        { status: 500 }
      );
    }

    // Delete summaries
    const { error: deleteError } = await supabase
      .from('summaries')
      .delete()
      .in('id', summaryIds)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting summaries:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: summaryIds.length,
      message: `Successfully deleted ${summaryIds.length} summary(ies)`
    });

  } catch (error) {
    console.error('History deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: {
      summaryId: string;
      userId: string;
      updates: {
        title?: string;
        content?: string;
        keyPoints?: string[];
        metadata?: any;
      };
    } = await request.json();
    
    const { summaryId, userId, updates } = body;

    if (!summaryId || !userId || !updates) {
      return NextResponse.json(
        { error: 'Summary ID, user ID, and updates are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingSummary, error: fetchError } = await supabase
      .from('summaries')
      .select('id, metadata')
      .eq('id', summaryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingSummary) {
      return NextResponse.json(
        { error: 'Summary not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.word_count = updates.content.split(/\s+/).length;
    }

    if (updates.keyPoints !== undefined) {
      updateData.key_points = updates.keyPoints;
    }

    if (updates.title !== undefined || updates.metadata !== undefined) {
      const currentMetadata = existingSummary.metadata || {};
      updateData.metadata = {
        ...currentMetadata,
        ...(updates.metadata || {}),
        ...(updates.title && { title: updates.title })
      };
    }

    // Update summary
    const { data: updatedSummary, error: updateError } = await supabase
      .from('summaries')
      .update(updateData)
      .eq('id', summaryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to update summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: formatHistoryItem(updatedSummary),
      message: 'Summary updated successfully'
    });

  } catch (error) {
    console.error('History update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}