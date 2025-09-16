'use client';

import React from 'react';
import { Mic, Globe, Zap, Settings } from 'lucide-react';
import { TranscriptionMethod } from '@/types/voice';
import { cn } from '@/lib/utils';

export interface TranscriptionMethodSelectorProps {
  currentMethod: TranscriptionMethod;
  onMethodChange: (method: TranscriptionMethod) => void;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
}

const transcriptionMethods = [
  {
    value: 'web-speech' as TranscriptionMethod,
    label: 'Web Speech',
    description: 'Fast, real-time transcription',
    icon: Mic,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200'
  },
  {
    value: 'whisper' as TranscriptionMethod,
    label: 'Whisper AI',
    description: 'High accuracy, multilingual',
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200'
  },
  {
    value: 'hybrid' as TranscriptionMethod,
    label: 'Hybrid',
    description: 'Best of both worlds',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200'
  }
];

/**
 * Transcription method selector component
 * Allows users to choose between Web Speech API, Whisper, or Hybrid approach
 */
export const TranscriptionMethodSelector: React.FC<TranscriptionMethodSelectorProps> = ({
  currentMethod,
  onMethodChange,
  disabled = false,
  className,
  showLabels = true
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabels && (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Settings className="h-4 w-4" />
          <span>Mode:</span>
        </div>
      )}
      
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        {transcriptionMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = currentMethod === method.value;
          
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onMethodChange(method.value)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? cn(method.bgColor, method.color, 'border', method.borderColor, 'shadow-sm')
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white'
              )}
              title={method.description}
            >
              <Icon className="h-3.5 w-3.5" />
              {showLabels && (
                <span className="hidden sm:inline">{method.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Compact version for smaller spaces
 */
export const CompactTranscriptionMethodSelector: React.FC<TranscriptionMethodSelectorProps> = (props) => {
  return (
    <TranscriptionMethodSelector
      {...props}
      showLabels={false}
      className={cn('scale-90', props.className)}
    />
  );
};

export default TranscriptionMethodSelector;