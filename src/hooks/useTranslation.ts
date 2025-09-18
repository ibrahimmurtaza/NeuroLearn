'use client';

import { useState, useCallback, useRef } from 'react';
import {
  TranslationResponse,
  TranslationApiResponse,
  TranslationError,
  UseTranslationReturn,
  UseTranslationOptions,
} from '@/types/translation';

const useTranslation = (options: UseTranslationOptions = {}): UseTranslationReturn => {
  const {
    autoTranslate = false,
    debounceMs = 500,
    maxRetries = 3,
    retryDelayMs = 1000,
    onTranslationStart,
    onTranslationComplete,
    onTranslationError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TranslationError | null>(null);
  const [lastTranslation, setLastTranslation] = useState<TranslationResponse | null>(null);
  const [translationHistory, setTranslationHistory] = useState<TranslationResponse[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Clear any pending operations
  const clearPendingOperations = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Perform the actual translation API call
  const performTranslation = useCallback(
    async (
      text: string,
      targetLanguage: string,
      sourceLanguage?: string,
      userId?: string
    ): Promise<TranslationResponse> => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            targetLanguage,
            sourceLanguage,
            userId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `HTTP error! status: ${response.status}`
          );
        }

        const data: TranslationApiResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || 'Translation failed');
        }

        return data.data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Translation request was cancelled');
        }
        throw error;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  // Retry logic with exponential backoff
  const translateWithRetry = useCallback(
    async (
      text: string,
      targetLanguage: string,
      sourceLanguage?: string,
      userId?: string
    ): Promise<TranslationResponse> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await performTranslation(text, targetLanguage, sourceLanguage, userId);
          retryCountRef.current = 0; // Reset retry count on success
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          // Don't retry on certain errors
          if (
            lastError.message.includes('cancelled') ||
            lastError.message.includes('INVALID_INPUT') ||
            lastError.message.includes('TEXT_TOO_LONG') ||
            lastError.message.includes('SERVICE_ERROR')
          ) {
            break;
          }

          if (attempt < maxRetries) {
            // Exponential backoff: wait longer between retries
            const delay = retryDelayMs * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError!;
    },
    [maxRetries, retryDelayMs, performTranslation]
  );

  // Main translate function
  const translate = useCallback(
    async (
      text: string,
      targetLanguage: string,
      sourceLanguage?: string,
      userId?: string
    ): Promise<TranslationResponse | null> => {
      // Validate input
      if (!text.trim()) {
        const error: TranslationError = {
          message: 'Text cannot be empty',
          code: 'INVALID_INPUT',
        };
        setError(error);
        onTranslationError?.(error);
        return null;
      }

      if (!targetLanguage) {
        const error: TranslationError = {
          message: 'Target language is required',
          code: 'INVALID_INPUT',
        };
        setError(error);
        onTranslationError?.(error);
        return null;
      }

      // Skip translation if source and target are the same
      if (sourceLanguage && sourceLanguage === targetLanguage) {
        const result: TranslationResponse = {
          translatedText: text,
          sourceLanguage,
          targetLanguage,
          confidence: 1.0,
          cached: false,
        };
        setLastTranslation(result);
        setTranslationHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10
        onTranslationComplete?.(result);
        return result;
      }

      // Only clear pending operations if we're starting a new translation
      // This prevents cancelling ongoing requests unnecessarily
      if (isLoading) {
        clearPendingOperations();
      }

      setIsLoading(true);
      setError(null);
      onTranslationStart?.();

      try {
        const result = await translateWithRetry(text, targetLanguage, sourceLanguage, userId);
        
        setLastTranslation(result);
        setTranslationHistory((prev) => [result, ...prev.slice(0, 9)]); // Keep last 10
        onTranslationComplete?.(result);
        
        return result;
      } catch (error) {
        let errorMessage = 'Translation failed';
        let errorCode = 'TRANSLATION_ERROR';
        
        if (error instanceof Error) {
          if (error.message.includes('cancelled')) {
            errorMessage = 'Translation was cancelled. Please try again.';
            errorCode = 'CANCELLED';
          } else if (error.message.includes('INVALID_INPUT')) {
            errorMessage = 'Invalid input provided';
            errorCode = 'INVALID_INPUT';
          } else if (error.message.includes('TEXT_TOO_LONG')) {
            errorMessage = 'Text is too long for translation';
            errorCode = 'TEXT_TOO_LONG';
          } else if (error.message.includes('SERVICE_ERROR')) {
            errorMessage = 'Translation service is temporarily unavailable';
            errorCode = 'SERVICE_ERROR';
          } else {
            errorMessage = error.message;
          }
        }
        
        const translationError: TranslationError = {
          message: errorMessage,
          code: errorCode,
        };
        
        setError(translationError);
        onTranslationError?.(translationError);
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, clearPendingOperations, translateWithRetry, onTranslationStart, onTranslationComplete, onTranslationError]
  );

  // Debounced translate function
  const translateDebounced = useCallback(
    (
      text: string,
      targetLanguage: string,
      sourceLanguage?: string,
      userId?: string
    ): Promise<TranslationResponse | null> => {
      return new Promise((resolve) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(async () => {
          const result = await translate(text, targetLanguage, sourceLanguage, userId);
          resolve(result);
        }, debounceMs);
      });
    },
    [translate, debounceMs]
  );

  // Cancel any ongoing translation
  const cancelTranslation = useCallback(() => {
    clearPendingOperations();
    setIsLoading(false);
    setError(null);
  }, [clearPendingOperations]);

  // Retry the last failed translation
  const retryTranslation = useCallback(async (): Promise<TranslationResponse | null> => {
    if (!lastTranslation && translationHistory.length === 0) {
      return null;
    }

    // Use the last translation parameters for retry
    const lastAttempt = lastTranslation || translationHistory[0];
    if (!lastAttempt) {
      return null;
    }

    // We need to store the original text to retry
    // For now, we'll just clear the error and let the user retry manually
    setError(null);
    return null;
  }, [lastTranslation, translationHistory]);

  // Clear translation history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
    setLastTranslation(null);
    setError(null);
  }, []);

  // Get translation statistics
  const getStats = useCallback(() => {
    const totalTranslations = translationHistory.length;
    const cachedTranslations = translationHistory.filter((t) => t.cached).length;
    const averageConfidence = translationHistory.length > 0
      ? translationHistory.reduce((sum, t) => sum + (t.confidence || 0), 0) / translationHistory.length
      : 0;

    return {
      totalTranslations,
      cachedTranslations,
      averageConfidence,
      cacheHitRate: totalTranslations > 0 ? cachedTranslations / totalTranslations : 0,
    };
  }, [translationHistory]);

  return {
    translatedText: lastTranslation?.translatedText || null,
    isTranslating: isLoading,
    error,
    confidence: lastTranslation?.confidence || null,
    translateText: async (text: string, targetLanguage: string) => {
      await translate(text, targetLanguage);
    },
    translate,
    clearTranslation: () => {
      setLastTranslation(null);
      setError(null);
    },
  };
};

export default useTranslation;