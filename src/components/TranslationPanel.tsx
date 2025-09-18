'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Eye, EyeOff, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { TranslationPanelProps, DisplayMode } from '@/types/translation';

const TranslationPanel: React.FC<TranslationPanelProps> = ({
  originalText,
  translatedText,
  sourceLanguage,
  targetLanguage,
  displayMode = 'side-by-side',
  isLoading = false,
  error,
  confidence,
  onRetry,
  className = '',
}) => {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslated, setShowTranslated] = useState(true);

  // Reset copy states when text changes
  useEffect(() => {
    setCopiedOriginal(false);
    setCopiedTranslated(false);
  }, [originalText, translatedText]);

  // Auto-hide copy confirmation after 2 seconds
  useEffect(() => {
    if (copiedOriginal) {
      const timer = setTimeout(() => setCopiedOriginal(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedOriginal]);

  useEffect(() => {
    if (copiedTranslated) {
      const timer = setTimeout(() => setCopiedTranslated(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedTranslated]);

  const handleCopyOriginal = async () => {
    try {
      await navigator.clipboard.writeText(originalText);
      setCopiedOriginal(true);
    } catch (err) {
      console.error('Failed to copy original text:', err);
    }
  };

  const handleCopyTranslated = async () => {
    try {
      await navigator.clipboard.writeText(translatedText || '');
      setCopiedTranslated(true);
    } catch (err) {
      console.error('Failed to copy translated text:', err);
    }
  };

  const getLanguageName = (code: string): string => {
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      ar: 'Arabic',
      hi: 'Hindi',
      th: 'Thai',
      vi: 'Vietnamese',
      nl: 'Dutch',
      sv: 'Swedish',
      da: 'Danish',
      no: 'Norwegian',
      fi: 'Finnish',
      pl: 'Polish',
      cs: 'Czech',
      hu: 'Hungarian',
      ro: 'Romanian',
      bg: 'Bulgarian',
      hr: 'Croatian',
      sk: 'Slovak',
      sl: 'Slovenian',
      et: 'Estonian',
      lv: 'Latvian',
      lt: 'Lithuanian',
      tr: 'Turkish',
      he: 'Hebrew',
      fa: 'Persian',
      ur: 'Urdu',
      bn: 'Bengali',
      ta: 'Tamil',
      te: 'Telugu',
      ml: 'Malayalam',
      kn: 'Kannada',
      gu: 'Gujarati',
      pa: 'Punjabi',
      mr: 'Marathi',
      ne: 'Nepali',
      si: 'Sinhala',
      my: 'Myanmar',
      km: 'Khmer',
      lo: 'Lao',
      ka: 'Georgian',
      am: 'Amharic',
      sw: 'Swahili',
      zu: 'Zulu',
      af: 'Afrikaans',
    };
    return languageNames[code] || code.toUpperCase();
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence?: number): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const renderTextPanel = (
    title: string,
    text: string,
    language: string,
    onCopy: () => void,
    copied: boolean,
    isVisible: boolean,
    onToggleVisibility: () => void,
    isTranslation = false
  ) => (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {getLanguageName(language)}
          </span>
          {isTranslation && confidence && (
            <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(confidence)} bg-opacity-10`}>
              {getConfidenceText(confidence)} confidence
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleVisibility}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isVisible ? 'Hide text' : 'Show text'}
          >
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onCopy}
            disabled={!text}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isVisible && (
        <div className="relative">
          <div className="min-h-[100px] max-h-[400px] overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-md">
            {isLoading && isTranslation ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Translating...</span>
              </div>
            ) : error && isTranslation ? (
              <div className="flex items-center justify-center h-20 text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">{error?.message || 'Translation error occurred'}</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="ml-2 p-1 hover:bg-red-50 rounded transition-colors"
                    title="Retry translation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {text || (isTranslation ? 'No translation available' : 'No text provided')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (displayMode === 'translation-only') {
    return (
      <div className={`space-y-4 ${className}`}>
        {renderTextPanel(
          'Translation',
          translatedText || '',
          targetLanguage || 'unknown',
          handleCopyTranslated,
          copiedTranslated,
          showTranslated,
          () => setShowTranslated(!showTranslated),
          true
        )}
      </div>
    );
  }

  if (displayMode === 'stacked') {
    return (
      <div className={`space-y-4 ${className}`}>
        {renderTextPanel(
          'Original',
          originalText,
          sourceLanguage,
          handleCopyOriginal,
          copiedOriginal,
          showOriginal,
          () => setShowOriginal(!showOriginal)
        )}
        {renderTextPanel(
          'Translation',
          translatedText || '',
          targetLanguage || 'unknown',
          handleCopyTranslated,
          copiedTranslated,
          showTranslated,
          () => setShowTranslated(!showTranslated),
          true
        )}
      </div>
    );
  }

  // Default: side-by-side
  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      {renderTextPanel(
        'Original',
        originalText,
        sourceLanguage,
        handleCopyOriginal,
        copiedOriginal,
        showOriginal,
        () => setShowOriginal(!showOriginal)
      )}
      {renderTextPanel(
        'Translation',
        translatedText || '',
        targetLanguage || 'unknown',
        handleCopyTranslated,
        copiedTranslated,
        showTranslated,
        () => setShowTranslated(!showTranslated),
        true
      )}
    </div>
  );
};

export default TranslationPanel;