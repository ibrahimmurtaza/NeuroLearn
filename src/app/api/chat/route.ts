import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface ChatRequest {
  message: string;
  notebookId?: string;
  conversationHistory?: ChatMessage[];
  selectedSourceIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API called');
    const { message, notebookId, conversationHistory = [], selectedSourceIds = [] }: ChatRequest = await request.json();
    console.log('Request parsed:', { message, notebookId, selectedSourceIds });

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if GOOGLE_API_KEY exists
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is missing');
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }
    console.log('Google API key found');

    // Get relevant documents from the notebook if specified
    let contextDocuments: any[] = [];
    let sources: string[] = [];

    if (notebookId && selectedSourceIds.length > 0) {
      console.log('Querying database for selected sources:', selectedSourceIds);
      
      // Validate UUID format for notebookId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(notebookId)) {
        console.log('Invalid UUID format for notebookId:', notebookId);
        return NextResponse.json(
          { error: 'Invalid notebook ID format' },
          { status: 400 }
        );
      }

      // Validate selectedSourceIds are UUIDs
      const invalidSourceIds = selectedSourceIds.filter(id => !uuidRegex.test(id));
      if (invalidSourceIds.length > 0) {
        console.log('Invalid UUID format for selectedSourceIds:', invalidSourceIds);
        return NextResponse.json(
          { error: 'Invalid source ID format' },
          { status: 400 }
        );
      }

      try {
        // Directly get the selected files by their IDs
        // Also verify they belong to the specified notebook for security
        const { data: files, error: filesError } = await supabase
          .from('files')
          .select(`
            id, 
            filename, 
            content,
            notebook_files!inner(notebook_id)
          `)
          .in('id', selectedSourceIds)
          .eq('notebook_files.notebook_id', notebookId);

        console.log('Selected files query result:', { files, filesError });

        if (filesError) {
          console.error('Selected files query error:', filesError);
          throw new Error(`Selected files query failed: ${filesError.message}`);
        }

        if (files && files.length > 0) {
          contextDocuments = files;
          sources = files.map(doc => doc.filename);
        }
      } catch (dbError) {
        console.error('Database query exception:', dbError);
        throw dbError;
      }
    } else if (notebookId && selectedSourceIds.length === 0) {
      console.log('No sources selected - providing response without document context');
      // When no sources are selected, we don't retrieve any documents
      // This ensures the RAG system only uses selected documents
    }

    // Prepare context for RAG
    const contextText = contextDocuments
      .map(doc => `Document: ${doc.filename}\nContent: ${doc.content}`)
      .join('\n\n');

    // Build conversation history for context
    const conversationContext = conversationHistory
      .slice(-5) // Keep last 5 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create the prompt with RAG context
    const prompt = `You are an AI assistant helping with document analysis and learning. Use the provided documents to answer questions accurately and cite your sources.

${contextText ? `Available Documents:\n${contextText}\n\n` : ''}
${conversationContext ? `Previous Conversation:\n${conversationContext}\n\n` : ''}
User Question: ${message}

Please provide a helpful response based on the available documents. If you reference specific information from a document, mention which document it came from.`;

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Save the conversation to database if notebook is specified
    if (notebookId) {
      try {
        // Save user message
        await supabase
          .from('conversations')
          .insert({
            notebook_id: notebookId,
            message: message,
            role: 'user'
          });

        // Save assistant message
        await supabase
          .from('conversations')
          .insert({
            notebook_id: notebookId,
            message: text,
            role: 'assistant'
          });
      } catch (saveError) {
        console.error('Error saving conversation:', saveError);
        // Don't throw here, just log the error
      }
    }

    return NextResponse.json({
      message: text,
      sources: sources.length > 0 ? sources : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Chat API is running' },
    { status: 200 }
  );
}