import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { NotesGenerationRequest, NotesGenerationResponse, FlashcardsGenerationRequest, FlashcardsGenerationResponse } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Notes generation utilities
async function generateNotesFromContent(
  content: string,
  notesType: 'outline' | 'detailed' | 'bullet_points' | 'mind_map' = 'detailed',
  language: string = 'en',
  subject?: string
): Promise<{ notes: string; structure: any }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const languageInstructions = {
      en: 'Respond in English.',
      es: 'Responde en español.',
      fr: 'Répondez en français.',
      de: 'Antworten Sie auf Deutsch.',
      it: 'Rispondi in italiano.',
      pt: 'Responda em português.',
      ru: 'Отвечайте на русском языке.',
      ja: '日本語で回答してください。',
      ko: '한국어로 답변해 주세요.',
      zh: '请用中文回答。'
    };

    const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;
    
    const notesPrompts = {
      outline: `${languageInstruction}\n\nCreate a structured outline from the following content. Use hierarchical formatting with main topics, subtopics, and key details. Format as:\n\nI. Main Topic\n   A. Subtopic\n      1. Detail\n      2. Detail\n   B. Subtopic\n\nII. Main Topic\n   A. Subtopic\n\nContent:\n${content}`,
      
      detailed: `${languageInstruction}\n\nCreate comprehensive detailed notes from the following content. Include:\n- Main concepts and definitions\n- Important details and explanations\n- Examples and illustrations\n- Key relationships and connections\n\nFormat the notes clearly with headings and subheadings.\n\nContent:\n${content}`,
      
      bullet_points: `${languageInstruction}\n\nCreate organized bullet point notes from the following content. Use:\n• Main points\n  ○ Supporting details\n    ▪ Specific examples or facts\n\nKeep points concise but informative.\n\nContent:\n${content}`,
      
      mind_map: `${languageInstruction}\n\nCreate a mind map structure from the following content. Identify:\n- Central theme/topic\n- Main branches (major concepts)\n- Sub-branches (supporting ideas)\n- Details and examples\n\nFormat as a hierarchical text structure that represents mind map connections.\n\nContent:\n${content}`
    };

    const prompt = notesPrompts[notesType] + (subject ? `\n\nSubject context: ${subject}` : '');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const notes = response.text();

    // Generate structure metadata based on notes type
    let structure: any = { type: notesType };
    
    if (notesType === 'outline') {
      // Extract outline structure
      const lines = notes.split('\n').filter(line => line.trim());
      const sections = lines.filter(line => /^[IVX]+\.|^\d+\./.test(line.trim()));
      structure.sections = sections.length;
      structure.levels = Math.max(...lines.map(line => {
        const match = line.match(/^(\s*)/);
        return match ? Math.floor(match[1].length / 2) + 1 : 1;
      }));
    } else if (notesType === 'bullet_points') {
      const bulletPoints = notes.split('\n').filter(line => /^\s*[•○▪]/.test(line));
      structure.totalPoints = bulletPoints.length;
      structure.mainPoints = bulletPoints.filter(line => line.startsWith('•')).length;
    } else if (notesType === 'mind_map') {
      structure.centralTopic = content.split('\n')[0].substring(0, 100) + '...';
      structure.branches = notes.split('\n').filter(line => line.includes('-')).length;
    }

    return { notes, structure };
  } catch (error) {
    console.error('Notes generation error:', error);
    throw new Error('Failed to generate notes');
  }
}

async function generateFlashcardsFromContent(
  content: string,
  count: number = 10,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  language: string = 'en',
  subject?: string
): Promise<Array<{ question: string; answer: string; difficulty: string; category?: string }>> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const languageInstructions = {
      en: 'Create flashcards in English.',
      es: 'Crea tarjetas de estudio en español.',
      fr: 'Créez des cartes mémoire en français.',
      de: 'Erstellen Sie Lernkarten auf Deutsch.',
      it: 'Crea flashcard in italiano.',
      pt: 'Crie flashcards em português.',
      ru: 'Создайте флэш-карты на русском языке.',
      ja: '日本語でフラッシュカードを作成してください。',
      ko: '한국어로 플래시카드를 만들어 주세요.',
      zh: '请用中文创建闪卡。'
    };

    const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;
    
    const difficultyInstructions = {
      easy: 'Focus on basic concepts, definitions, and simple recall questions.',
      medium: 'Include both recall and application questions with moderate complexity.',
      hard: 'Create challenging questions requiring analysis, synthesis, and critical thinking.'
    };

    const prompt = `${languageInstruction}\n\nGenerate exactly ${count} flashcards from the following content.\n\nDifficulty level: ${difficulty} - ${difficultyInstructions[difficulty]}\n\nFormat each flashcard as:\nQ: [Question]\nA: [Answer]\n---\n\nMake questions clear, specific, and educational. Answers should be concise but complete.\n${subject ? `\nSubject: ${subject}` : ''}\n\nContent:\n${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const flashcardsText = response.text();

    // Parse flashcards from the response
    const flashcardBlocks = flashcardsText.split('---').filter(block => block.trim());
    const flashcards: Array<{ question: string; answer: string; difficulty: string; category?: string }> = [];

    for (const block of flashcardBlocks) {
      const lines = block.trim().split('\n').filter(line => line.trim());
      let question = '';
      let answer = '';
      let currentSection = '';

      for (const line of lines) {
        if (line.startsWith('Q:')) {
          question = line.substring(2).trim();
          currentSection = 'question';
        } else if (line.startsWith('A:')) {
          answer = line.substring(2).trim();
          currentSection = 'answer';
        } else if (currentSection === 'question') {
          question += ' ' + line.trim();
        } else if (currentSection === 'answer') {
          answer += ' ' + line.trim();
        }
      }

      if (question && answer) {
        flashcards.push({
          question: question.trim(),
          answer: answer.trim(),
          difficulty,
          category: subject || 'General'
        });
      }
    }

    // Ensure we have the requested number of flashcards
    return flashcards.slice(0, count);
  } catch (error) {
    console.error('Flashcards generation error:', error);
    throw new Error('Failed to generate flashcards');
  }
}

// POST endpoint for generating notes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'notes';

    if (action === 'notes') {
      const {
        documentIds,
        summaryIds,
        notesType = 'outline',
        language = 'en',
        subject,
        userId
      }: NotesGenerationRequest = body;

      if (!userId || (!documentIds?.length && !summaryIds?.length)) {
        return NextResponse.json(
          { error: 'User ID and at least one document or summary ID are required' },
          { status: 400 }
        );
      }

      // Fetch content from documents or summaries
      let content = '';
      let sourceIds: string[] = [];

      if (documentIds?.length) {
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('id, content, title')
          .in('id', documentIds)
          .eq('user_id', userId);

        if (docError) {
          return NextResponse.json(
            { error: 'Failed to fetch documents' },
            { status: 500 }
          );
        }

        content += documents?.map(doc => `# ${doc.title}\n\n${doc.content}`).join('\n\n') || '';
        sourceIds = documents?.map(doc => doc.id) || [];
      }

      if (summaryIds?.length) {
        const { data: summaries, error: summaryError } = await supabase
          .from('summaries')
          .select('id, content, document_id')
          .in('id', summaryIds)
          .eq('user_id', userId);

        if (summaryError) {
          return NextResponse.json(
            { error: 'Failed to fetch summaries' },
            { status: 500 }
          );
        }

        content += '\n\n' + summaries?.map(summary => summary.content).join('\n\n') || '';
        sourceIds.push(...(summaries?.map(summary => summary.document_id) || []));
      }

      if (!content.trim()) {
        return NextResponse.json(
          { error: 'No content found to generate notes from' },
          { status: 400 }
        );
      }

      // Generate notes
      const { notes, structure } = await generateNotesFromContent(
        content,
        notesType as any,
        language,
        subject
      );

      // Save notes to database
      const noteId = uuidv4();
      const { data: noteRecord, error: noteError } = await supabase
        .from('notes')
        .insert({
          id: noteId,
          title: subject || 'Generated Notes',
          content: notes,
          notes_type: notesType,
          language,
          user_id: userId,
          source_document_ids: sourceIds,
          metadata: structure
        })
        .select()
        .single();

      if (noteError) {
        console.error('Error saving notes:', noteError);
        return NextResponse.json(
          { error: 'Failed to save notes' },
          { status: 500 }
        );
      }

      const response: NotesGenerationResponse = {
        success: true,
        notes: {
          id: noteRecord.id,
          title: noteRecord.title,
          content: noteRecord.content,
          notesType: noteRecord.notes_type,
          language: noteRecord.language,
          sourceDocumentIds: noteRecord.source_document_ids || [],
          metadata: noteRecord.metadata,
          createdAt: noteRecord.created_at,
          updatedAt: noteRecord.updated_at
        }
      };

      return NextResponse.json(response);

    } else if (action === 'flashcards') {
      const {
        documentIds,
        summaryIds,
        count = 10,
        difficulty = 'medium',
        language = 'en',
        subject,
        userId
      }: FlashcardsGenerationRequest = body;

      if (!userId || (!documentIds?.length && !summaryIds?.length)) {
        return NextResponse.json(
          { error: 'User ID and at least one document or summary ID are required' },
          { status: 400 }
        );
      }

      // Fetch content (similar to notes generation)
      let content = '';
      let sourceIds: string[] = [];

      if (documentIds?.length) {
        const { data: documents } = await supabase
          .from('documents')
          .select('id, content, title')
          .in('id', documentIds)
          .eq('user_id', userId);

        content += documents?.map(doc => `# ${doc.title}\n\n${doc.content}`).join('\n\n') || '';
        sourceIds = documents?.map(doc => doc.id) || [];
      }

      if (summaryIds?.length) {
        const { data: summaries } = await supabase
          .from('summaries')
          .select('id, content, document_id')
          .in('id', summaryIds)
          .eq('user_id', userId);

        content += '\n\n' + summaries?.map(summary => summary.content).join('\n\n') || '';
        sourceIds.push(...(summaries?.map(summary => summary.document_id) || []));
      }

      if (!content.trim()) {
        return NextResponse.json(
          { error: 'No content found to generate flashcards from' },
          { status: 400 }
        );
      }

      // Generate flashcards
      const flashcardsData = await generateFlashcardsFromContent(
        content,
        count,
        difficulty as any,
        language,
        subject
      );

      // Save flashcards to database
      const flashcardPromises = flashcardsData.map(flashcard => {
        const flashcardId = uuidv4();
        return supabase
          .from('flashcards')
          .insert({
            id: flashcardId,
            question: flashcard.question,
            answer: flashcard.answer,
            difficulty: flashcard.difficulty,
            category: flashcard.category || subject || 'General',
            language,
            user_id: userId,
            source_document_ids: sourceIds
          })
          .select()
          .single();
      });

      const flashcardResults = await Promise.all(flashcardPromises);
      const savedFlashcards = flashcardResults
        .filter(result => !result.error)
        .map(result => result.data);

      const response: FlashcardsGenerationResponse = {
        success: true,
        flashcards: savedFlashcards.map(flashcard => ({
          id: flashcard.id,
          question: flashcard.question,
          answer: flashcard.answer,
          difficulty: flashcard.difficulty,
          category: flashcard.category,
          language: flashcard.language,
          sourceDocumentIds: flashcard.source_document_ids || [],
          createdAt: flashcard.created_at,
          updatedAt: flashcard.updated_at
        })),
        count: savedFlashcards.length
      };

      return NextResponse.json(response);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=notes or ?action=flashcards' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Notes/Flashcards generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving notes and flashcards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'notes'; // 'notes' or 'flashcards'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const language = searchParams.get('language');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (type === 'notes') {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (language) {
        query = query.eq('language', language);
      }

      const { data: notes, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch notes' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        notes: notes || [],
        total: notes?.length || 0
      });

    } else if (type === 'flashcards') {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) {
        query = query.eq('category', category);
      }

      if (language) {
        query = query.eq('language', language);
      }

      const { data: flashcards, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch flashcards' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        flashcards: flashcards || [],
        total: flashcards?.length || 0
      });
    }

    return NextResponse.json(
      { error: 'Invalid type. Use type=notes or type=flashcards' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Get notes/flashcards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}