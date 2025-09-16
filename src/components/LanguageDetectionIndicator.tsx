'use client';

import React from 'react';
import { Globe, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LanguageDetectionIndicatorProps {
  detectedLanguage?: string;
  confidence?: number;
  isDetecting?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'badge';
}

// Language code to display name mapping
const languageNames: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'pl': 'Polish',
  'tr': 'Turkish',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'uk': 'Ukrainian',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'mt': 'Maltese',
  'ga': 'Irish',
  'cy': 'Welsh',
  'is': 'Icelandic',
  'mk': 'Macedonian',
  'sq': 'Albanian',
  'eu': 'Basque',
  'ca': 'Catalan',
  'gl': 'Galician',
  'he': 'Hebrew',
  'fa': 'Persian',
  'ur': 'Urdu',
  'bn': 'Bengali',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
  'mr': 'Marathi',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'my': 'Myanmar',
  'km': 'Khmer',
  'lo': 'Lao',
  'ka': 'Georgian',
  'am': 'Amharic',
  'sw': 'Swahili',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'xh': 'Xhosa'
};

const getLanguageName = (code: string): string => {
  // Handle language codes with region (e.g., 'en-US' -> 'en')
  const baseCode = code.split('-')[0].toLowerCase();
  return languageNames[baseCode] || code.toUpperCase();
};

const getConfidenceColor = (confidence?: number): string => {
  if (!confidence) return 'text-gray-500';
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

const getConfidenceIcon = (confidence?: number) => {
  if (!confidence) return AlertCircle;
  if (confidence >= 0.7) return Check;
  return AlertCircle;
};

/**
 * Language detection indicator component
 * Shows detected language and confidence level
 */
export const LanguageDetectionIndicator: React.FC<LanguageDetectionIndicatorProps> = ({
  detectedLanguage,
  confidence,
  isDetecting = false,
  className,
  variant = 'default'
}) => {
  if (!detectedLanguage && !isDetecting) {
    return null;
  }

  const ConfidenceIcon = getConfidenceIcon(confidence);
  const confidenceColor = getConfidenceColor(confidence);
  const languageName = detectedLanguage ? getLanguageName(detectedLanguage) : '';

  if (variant === 'badge') {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        'bg-blue-50 text-blue-700 border border-blue-200',
        className
      )}>
        <Globe className="h-3 w-3" />
        {isDetecting ? (
          <span>Detecting...</span>
        ) : (
          <>
            <span>{languageName}</span>
            {confidence && (
              <span className={cn('text-xs', confidenceColor)}>
                ({Math.round(confidence * 100)}%)
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-gray-600', className)}>
        <Globe className="h-3 w-3" />
        {isDetecting ? (
          <span className="animate-pulse">Detecting...</span>
        ) : (
          <span>{languageName}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 bg-gray-50 rounded-lg border',
      className
    )}>
      <div className="flex items-center gap-1">
        <Globe className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Language:</span>
      </div>
      
      {isDetecting ? (
        <div className="flex items-center gap-1">
          <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600">Detecting...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{languageName}</span>
          {confidence && (
            <div className="flex items-center gap-1">
              <ConfidenceIcon className={cn('h-3 w-3', confidenceColor)} />
              <span className={cn('text-xs font-medium', confidenceColor)}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageDetectionIndicator;