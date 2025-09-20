import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/flashcards/[id] - Get flashcard set with cards
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Flashcard set ID is required' },
        { status: 400 }
      );
    }
    
    // Validate user authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Get flashcard set with user_id filtering for security
    const { data: flashcardSet, error: setError } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (setError) {
      console.error('Error fetching flashcard set:', setError);
      return NextResponse.json(
        { error: 'Flashcard set not found' },
        { status: 404 }
      );
    }
    
    // Get flashcards for this set
    const { data: flashcards, error: cardsError } = await supabase
      .from('flashcard_generator_cards')
      .select('*')
      .eq('set_id', id)
      .order('order_index', { ascending: true });
    
    if (cardsError) {
      console.error('Error fetching flashcards:', cardsError);
      return NextResponse.json(
        { error: 'Failed to fetch flashcards' },
        { status: 500 }
      );
    }
    
    // Get linked documents
    const { data: documentLinks, error: linksError } = await supabase
      .from('flashcard_documents')
      .select(`
        document_id,
        documents (
          id,
          filename,
          file_type,
          created_at
        )
      `)
      .eq('set_id', id);
    
    if (linksError) {
      console.error('Error fetching document links:', linksError);
      // Don't fail the request for this
    }
    
    const linkedDocuments = documentLinks?.map(link => link.documents).filter(Boolean) || [];
    
    // Map database columns to frontend expected format
    const mappedCards = flashcards?.map(card => ({
      ...card,
      front: card.question,
      back: card.answer
    })) || [];

    return NextResponse.json({
      success: true,
      flashcardSet: {
        ...flashcardSet,
        cards: mappedCards,
        linkedDocuments
      }
    });
    
  } catch (error: any) {
    console.error('Error in GET /api/flashcards/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/flashcards/[id] - Update flashcard set
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, topic, cards, userId } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Flashcard set ID is required' },
        { status: 400 }
      );
    }
    
    // Validate user authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // Update flashcard set with user_id filtering for security
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (title) updateData.title = title;
    if (topic) updateData.topic = topic;
    if (cards && Array.isArray(cards)) {
      updateData.total_cards = cards.length;
    }
    
    const { error: setError } = await supabase
      .from('flashcard_sets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (setError) {
      console.error('Error updating flashcard set:', setError);
      return NextResponse.json(
        { error: 'Failed to update flashcard set' },
        { status: 500 }
      );
    }
    
    // Update cards if provided
    if (cards && Array.isArray(cards)) {
      // Delete existing cards
      const { error: deleteError } = await supabase
        .from('flashcard_generator_cards')
        .delete()
        .eq('set_id', id);
      
      if (deleteError) {
        console.error('Error deleting old cards:', deleteError);
        return NextResponse.json(
          { error: 'Failed to update cards' },
          { status: 500 }
        );
      }
      
      // Insert new cards
      if (cards.length > 0) {
        const cardData = cards.map((card: any, index: number) => ({
          id: card.id || crypto.randomUUID(),
          set_id: id,
          question: card.front,
          answer: card.back,
          difficulty: card.difficulty || 'medium',
          order_index: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { error: insertError } = await supabase
          .from('flashcard_generator_cards')
          .insert(cardData);
        
        if (insertError) {
          console.error('Error inserting new cards:', insertError);
          return NextResponse.json(
            { error: 'Failed to update cards' },
            { status: 500 }
          );
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Flashcard set updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error in PUT /api/flashcards/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/flashcards/[id] - Delete flashcard set
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Flashcard set ID is required' },
        { status: 400 }
      );
    }
    
    // Validate user authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      );
    }
    
    // First verify the flashcard set belongs to the user
    const { data: flashcardSet, error: verifyError } = await supabase
      .from('flashcard_sets')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (verifyError || !flashcardSet) {
      return NextResponse.json(
        { error: 'Flashcard set not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete flashcards first (due to foreign key constraint)
    const { error: cardsError } = await supabase
      .from('flashcard_generator_cards')
      .delete()
      .eq('set_id', id);
    
    if (cardsError) {
      console.error('Error deleting flashcards:', cardsError);
      return NextResponse.json(
        { error: 'Failed to delete flashcards' },
        { status: 500 }
      );
    }
    
    // Delete document links
    const { error: linksError } = await supabase
      .from('flashcard_documents')
      .delete()
      .eq('set_id', id);
    
    if (linksError) {
      console.error('Error deleting document links:', linksError);
      // Don't fail the request for this
    }
    
    // Delete flashcard set with user_id filtering for security
    const { error: setError } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (setError) {
      console.error('Error deleting flashcard set:', setError);
      return NextResponse.json(
        { error: 'Failed to delete flashcard set' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Flashcard set deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in DELETE /api/flashcards/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}