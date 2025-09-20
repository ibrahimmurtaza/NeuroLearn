import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 15,
  delayBetweenRequests: 4000, // 4 seconds
  maxRetries: 3,
  baseDelay: 2000 // 2 seconds
};

// Simple rate limiter
class RateLimiter {
  private requests: number[] = [];
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // Check if we need to wait
    if (this.requests.length >= RATE_LIMIT.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request
    this.requests.push(now);
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenRequests));
  }
}

const rateLimiter = new RateLimiter();

// Summary length configurations
const SUMMARY_CONFIGS = {
  short: {
    maxWords: 100,
    prompt: 'Provide a brief summary in 2-3 sentences focusing on the main points:'
  },
  medium: {
    maxWords: 250,
    prompt: 'Provide a comprehensive summary covering key points and important details:'
  },
  detailed: {
    maxWords: 500,
    prompt: 'Provide a detailed summary with thorough analysis, key points, and supporting details:'
  }
};

// Language-specific instructions
const LANGUAGE_INSTRUCTIONS = {
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

async function generateTextSummary(
  text: string,
  length: 'short' | 'medium' | 'detailed',
  language: string = 'en'
): Promise<string> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
    try {
      // Apply rate limiting
      await rateLimiter.waitIfNeeded();
      
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Truncate content if too long (max ~30k chars to stay within token limits)
      const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '...' : text;
      
      const config = SUMMARY_CONFIGS[length];
      const languageInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;
      
      const prompt = `${languageInstruction}\n\n${config.prompt}\n\nTarget length: approximately ${config.maxWords} words.\n\nText to summarize:\n\n${truncatedText}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      lastError = error;
      console.error(`AI generation error (attempt ${attempt}):`, error);
      
      // Check if it's a quota/rate limit error
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
        if (attempt < RATE_LIMIT.maxRetries) {
          const delay = RATE_LIMIT.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit, waiting ${delay}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error('Google Gemini API quota exceeded. Please try again later.');
        }
      }
      
      // For other errors, don't retry
      throw new Error('Failed to generate summary with AI');
    }
  }
  
  throw lastError || new Error('Failed to generate summary after all retries');
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    console.log('Text summarization request:', { 
      textLength: body.text?.length, 
      length: body.length, 
      language: body.language 
    });
    
    const { text, length = 'medium', language = 'en' } = body;

    // Input validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text content cannot be empty' },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: 'Text content is too long. Maximum 50,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Validate length parameter
    const validLengths = ['short', 'medium', 'detailed'];
    if (!validLengths.includes(length)) {
      return NextResponse.json(
        { error: 'Invalid length parameter. Must be one of: short, medium, detailed' },
        { status: 400 }
      );
    }

    // Validate language parameter
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    if (language && !validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      );
    }

    // Generate summary
    const summary = await generateTextSummary(text, length, language);
    const wordCount = countWords(summary);
    const processingTime = Date.now() - startTime;

    // Save to database (optional - for history tracking)
    // Temporarily disabled to focus on API functionality
    // try {
    //   const summaryId = uuidv4();
    //   await supabase
    //     .from('summaries')
    //     .insert({
    //       id: summaryId,
    //       original_text: text.substring(0, 1000),
    //       summary_text: summary,
    //       summary_length: length,
    //       language: language,
    //       word_count: wordCount,
    //       processing_time: processingTime,
    //       created_at: new Date().toISOString()
    //     });
    // } catch (dbError) {
    //   console.error('Database save error (non-critical):', dbError);
    // }

    return NextResponse.json({
      success: true,
      summary,
      wordCount,
      processingTime,
      metadata: {
        originalLength: text.length,
        summaryLength: length,
        language
      }
    });

  } catch (error) {
    console.error('Text summarization error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('quota exceeded') || error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'Google Gemini API quota exceeded',
            message: 'The AI service has reached its usage limit. Please try again later.',
            retryAfter: '60 seconds'
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: 'An unexpected error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Text summarization endpoint',
      supportedLengths: ['short', 'medium', 'detailed'],
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
    },
    { status: 200 }
  );
}