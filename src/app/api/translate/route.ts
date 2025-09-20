import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { TranslateApiRequest, TranslationResponse, TranslationApiResponse } from '@/types/translation';

// Microsoft Translator configuration
const MICROSOFT_TRANSLATOR_KEY = process.env.MICROSOFT_TRANSLATOR_KEY;
const MICROSOFT_TRANSLATOR_ENDPOINT = process.env.MICROSOFT_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com/';
const MICROSOFT_TRANSLATOR_REGION = process.env.MICROSOFT_TRANSLATOR_REGION;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate hash for caching
function generateTextHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Check cache for existing translation
async function getCachedTranslation(
  textHash: string,
  sourceLanguage: string,
  targetLanguage: string,
  userId?: string
): Promise<TranslationResponse | null> {
  try {
    let query = supabase
      .from('translation_cache')
      .select('*')
      .eq('text_hash', textHash)
      .eq('source_language', sourceLanguage)
      .eq('target_language', targetLanguage)
      .gt('expires_at', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return {
      translatedText: data.translated_text,
      sourceLanguage: data.source_language,
      targetLanguage: data.target_language,
      confidence: data.confidence_score,
      cached: true,
    };
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

// Store translation in cache
async function cacheTranslation(
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  confidence: number,
  userId?: string
): Promise<void> {
  try {
    const textHash = generateTextHash(originalText);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    const cacheData = {
      user_id: userId || null,
      original_text: originalText,
      translated_text: translatedText,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      confidence_score: confidence,
      text_hash: textHash,
      expires_at: expiresAt.toISOString(),
    };

    await supabase.from('translation_cache').insert(cacheData);
  } catch (error) {
    console.error('Error caching translation:', error);
    // Don't throw error, caching failure shouldn't break translation
  }
}

// Perform translation using Microsoft Translator API
async function performTranslation(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<{ translatedText: string; detectedSourceLanguage: string; confidence: number }> {
  if (!MICROSOFT_TRANSLATOR_KEY) {
    throw new Error('Microsoft Translator API key is not configured');
  }

  try {
    const url = `${MICROSOFT_TRANSLATOR_ENDPOINT}translate?api-version=3.0&to=${targetLanguage}`;
    const fromParam = sourceLanguage && sourceLanguage !== 'auto' ? `&from=${sourceLanguage}` : '';
    const fullUrl = url + fromParam;

    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': MICROSOFT_TRANSLATOR_KEY,
      'Content-Type': 'application/json',
    };

    // Add region header if specified
    if (MICROSOFT_TRANSLATOR_REGION) {
      headers['Ocp-Apim-Subscription-Region'] = MICROSOFT_TRANSLATOR_REGION;
    }

    const response = await axios.post(
      fullUrl,
      [{ text }],
      { headers }
    );

    if (!response.data || !response.data[0] || !response.data[0].translations || !response.data[0].translations[0]) {
      throw new Error('Invalid response from Microsoft Translator API');
    }

    const translation = response.data[0];
    const translatedText = translation.translations[0].text;
    const detectedSourceLanguage = translation.detectedLanguage?.language || sourceLanguage || 'en';
    const confidence = translation.detectedLanguage?.score || 0.9;

    return {
      translatedText,
      detectedSourceLanguage,
      confidence,
    };
  } catch (error) {
    console.error('Microsoft Translator API error:', error);
    
    // Provide more specific error messages
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Microsoft Translator API key');
      } else if (error.response?.status === 403) {
        throw new Error('Microsoft Translator API access denied. Check your subscription and region.');
      } else if (error.response?.status === 429) {
        throw new Error('Microsoft Translator API rate limit exceeded');
      }
    }
    
    throw new Error('Microsoft Translator service temporarily unavailable');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage, userId } = await request.json();

    // Validate input
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Text is required and cannot be empty',
            code: 'INVALID_INPUT',
          },
        },
        { status: 400 }
      );
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Target language is required',
            code: 'INVALID_INPUT',
          },
        },
        { status: 400 }
      );
    }

    // Check text length limit
    if (text.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Text too long. Maximum 5000 characters allowed.',
            code: 'TEXT_TOO_LONG',
          },
        },
        { status: 400 }
      );
    }

    // Get user session for caching
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = userId || session?.user?.id;

    // Check cache first
    const textHash = generateTextHash(text);
    const cachedResult = await getCachedTranslation(
      textHash,
      sourceLanguage || 'auto',
      targetLanguage,
      currentUserId
    );

    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
      });
    }

    // Perform translation
    const result = await performTranslation(text, targetLanguage, sourceLanguage);

    // Cache the result
    await cacheTranslation(
      text,
      result.translatedText,
      result.detectedSourceLanguage,
      targetLanguage,
      result.confidence,
      currentUserId
    );

    return NextResponse.json({
      success: true,
      data: {
        translatedText: result.translatedText,
        sourceLanguage: result.detectedSourceLanguage,
        targetLanguage,
        confidence: result.confidence,
        cached: false,
      },
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Translation service temporarily unavailable',
          code: 'SERVICE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}