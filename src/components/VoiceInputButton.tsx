'use client';

import React from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
export interface VoiceInputButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'with-label';
  className?: string;
}
import { cn } from '@/lib/utils';

/**
 * Voice input button component with microphone icon and recording states
 * Provides visual feedback for different voice recognition states
 */
export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isRecording,
  onClick,
  disabled = false,
  variant = 'default',
  className,
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90',
    compact: 'h-8 w-8 bg-secondary text-secondary-foreground hover:bg-secondary/80',
    'with-label': 'h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80'
  };

  const Icon = isRecording ? MicOff : Mic;
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        isRecording && 'animate-pulse bg-red-500 hover:bg-red-600',
        className
      )}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      <Icon className={cn(
        variant === 'compact' ? 'h-4 w-4' : 'h-4 w-4 mr-2',
        variant === 'compact' && 'mr-0'
      )} />
      {variant === 'with-label' && (
        <span>{isRecording ? 'Stop' : 'Voice'}</span>
      )}
    </button>
  );
};

// Export default component
export default VoiceInputButton;