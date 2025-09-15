'use client';

import React, { useState } from 'react';
import { Languages, Settings, RotateCcw, Eye, EyeOff } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { TranslationMode } from '../types/translation';

interface TranslationControlsProps {
  // Language settings
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  
  // Auto-translate settings
  autoTranslate: boolean;
  onAutoTranslateChange: (enabled: boolean) => void;
  
  // Translation mode
  translationMode: TranslationMode;
  onTranslationModeChange: (mode: TranslationMode) => void;
  
  // Confidence display
  showConfidence: boolean;
  onShowConfidenceChange: (show: boolean) => void;
  
  // Actions
  onClearCache?: () => void;
  onRetranslateAll?: () => void;
  
  // State
  isTranslating?: boolean;
  className?: string;
}

export function TranslationControls({
  selectedLanguage,
  onLanguageChange,
  autoTranslate,
  onAutoTranslateChange,
  translationMode,
  onTranslationModeChange,
  showConfidence,
  onShowConfidenceChange,
  onClearCache,
  onRetranslateAll,
  isTranslating = false,
  className = ''
}: TranslationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const translationModes: { value: TranslationMode; label: string; description: string }[] = [
    {
      value: 'side-by-side',
      label: 'Side by Side',
      description: 'Show original and translation side by side'
    },
    {
      value: 'stacked',
      label: 'Stacked',
      description: 'Show translation below original'
    },
    {
      value: 'translation-only',
      label: 'Translation Only',
      description: 'Show only the translated text'
    }
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Translation Settings</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <Settings className={`w-4 h-4 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </button>
      </div>

      {/* Quick Controls */}
      <div className="p-4 space-y-3">
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Target Language
          </label>
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
            disabled={isTranslating}
          />
        </div>

        {/* Auto-translate Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Auto-translate
            </label>
            <p className="text-xs text-gray-500">
              Automatically translate new messages
            </p>
          </div>
          <button
            onClick={() => onAutoTranslateChange(!autoTranslate)}
            disabled={isTranslating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
              autoTranslate ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoTranslate ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Translation Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Display Mode
            </label>
            <div className="space-y-2">
              {translationModes.map((mode) => (
                <label key={mode.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="translationMode"
                    value={mode.value}
                    checked={translationMode === mode.value}
                    onChange={() => onTranslationModeChange(mode.value)}
                    disabled={isTranslating}
                    className="mt-1 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {mode.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {mode.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Confidence Display Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Show Confidence
              </label>
              <p className="text-xs text-gray-500">
                Display translation confidence scores
              </p>
            </div>
            <button
              onClick={() => onShowConfidenceChange(!showConfidence)}
              disabled={isTranslating}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                showConfidence
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {showConfidence ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {onRetranslateAll && (
              <button
                onClick={onRetranslateAll}
                disabled={isTranslating}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Retranslate All
              </button>
            )}
            
            {onClearCache && (
              <button
                onClick={onClearCache}
                disabled={isTranslating}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cache
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isTranslating && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Translating...
          </div>
        </div>
      )}
    </div>
  );
}