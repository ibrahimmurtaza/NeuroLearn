import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/flashcards - Get all flashcard sets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId');
    
    // Validate user authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('flashcard_sets')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,topic.ilike.%${search}%`);
    }
    
    const { data: flashcardSets, error, count } = await query;
    
    if (error) {
      console.error('Error fetching flashcard sets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch flashcard sets' },
        { status: 500 }
      );
    }
    
    // Get card counts for each set
    const setsWithCounts = await Promise.all(
      (flashcardSets || []).map(async (set) => {
        const { count: cardCount } = await supabase
          .from('flashcard_generator_cards')
          .select('*', { count: 'exact', head: true })
          .eq('set_id', set.id);
        
        return {
          ...set,
          card_count: cardCount || 0
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      flashcardSets: setsWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/flashcards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}