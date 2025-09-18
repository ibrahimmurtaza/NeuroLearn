'use client';

import React from 'react';
import { AudioVisualizationProps } from '@/types/voice';
import { cn } from '@/lib/utils';

/**
 * Audio visualization component that displays real-time audio levels
 * Shows animated bars that respond to microphone input during recording
 */
export const AudioVisualization: React.FC<AudioVisualizationProps> = ({
  audioLevel,
  isRecording,
  className
}) => {
  // Generate bar heights based on audio level
  const generateBarHeights = () => {
    const baseHeight = 4;
    const maxHeight = 20;
    const bars = 5;
    
    return Array.from({ length: bars }, (_, index) => {
      if (!isRecording) return baseHeight;
      
      // Create a wave effect across bars
      const waveOffset = Math.sin((Date.now() / 200) + (index * 0.5)) * 0.3;
      const levelWithWave = Math.max(0, Math.min(1, audioLevel + waveOffset));
      
      return baseHeight + (levelWithWave * (maxHeight - baseHeight));
    });
  };

  const barHeights = generateBarHeights();

  if (!isRecording) {
    return null;
  }

  return (
    <div className={cn('flex items-end justify-center gap-1 h-6', className)}>
      {barHeights.map((height, index) => (
        <div
          key={index}
          className={cn(
            'bg-red-400 rounded-full transition-all duration-100 ease-out',
            {
              'animate-pulse': isRecording,
            }
          )}
          style={{
            width: '3px',
            height: `${height}px`,
            animationDelay: `${index * 50}ms`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Circular audio visualization component
 * Shows a pulsing circle that grows with audio level
 */
export const CircularAudioVisualization: React.FC<AudioVisualizationProps> = ({
  audioLevel,
  isRecording,
  className
}) => {
  if (!isRecording) {
    return null;
  }

  const scale = 1 + (audioLevel * 0.5); // Scale from 1 to 1.5 based on audio level

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer pulsing ring */}
      <div 
        className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.1s ease-out'
        }}
      />
      
      {/* Inner circle */}
      <div 
        className="relative w-4 h-4 bg-red-500 rounded-full"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.1s ease-out'
        }}
      />
    </div>
  );
};

/**
 * Waveform audio visualization component
 * Shows a more detailed waveform representation
 */
export const WaveformAudioVisualization: React.FC<AudioVisualizationProps> = ({
  audioLevel,
  isRecording,
  className
}) => {
  // Generate waveform data
  const generateWaveform = () => {
    const bars = 12;
    const baseHeight = 2;
    const maxHeight = 16;
    
    return Array.from({ length: bars }, (_, index) => {
      if (!isRecording) return baseHeight;
      
      // Create a more complex waveform pattern
      const time = Date.now() / 150;
      const frequency1 = Math.sin(time + (index * 0.3)) * 0.4;
      const frequency2 = Math.sin((time * 1.5) + (index * 0.2)) * 0.3;
      const frequency3 = Math.sin((time * 0.8) + (index * 0.4)) * 0.2;
      
      const combinedWave = (frequency1 + frequency2 + frequency3) / 3;
      const levelWithWave = Math.max(0, Math.min(1, audioLevel + combinedWave));
      
      return baseHeight + (levelWithWave * (maxHeight - baseHeight));
    });
  };

  const waveformHeights = generateWaveform();

  if (!isRecording) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-center gap-0.5 h-5', className)}>
      {waveformHeights.map((height, index) => (
        <div
          key={index}
          className="bg-gradient-to-t from-red-500 to-red-300 rounded-full transition-all duration-75 ease-out"
          style={{
            width: '2px',
            height: `${height}px`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Recording status indicator with text and animation
 */
export const RecordingStatusIndicator: React.FC<{
  isRecording: boolean;
  className?: string;
}> = ({ isRecording, className }) => {
  if (!isRecording) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm text-red-600', className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="font-medium">Recording...</span>
      </div>
      <AudioVisualization audioLevel={0.5} isRecording={isRecording} />
    </div>
  );
};

/**
 * Combined voice input indicator with multiple visual elements
 */
export const VoiceInputIndicator: React.FC<{
  isRecording: boolean;
  audioLevel: number;
  transcript?: string;
  transcriptionMethod?: 'web-speech' | 'whisper' | 'hybrid';
  detectedLanguage?: string;
  confidence?: number;
  isProcessing?: boolean;
  className?: string;
}> = ({ 
  isRecording, 
  audioLevel, 
  transcript, 
  transcriptionMethod = 'web-speech',
  detectedLanguage,
  confidence,
  isProcessing = false,
  className 
}) => {
  if (!isRecording && !transcript && !isProcessing) {
    return null;
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'web-speech': return 'Web Speech';
      case 'whisper': return 'Whisper AI';
      case 'hybrid': return 'Hybrid Mode';
      default: return 'Voice Input';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'web-speech': return 'text-blue-600';
      case 'whisper': return 'text-green-600';
      case 'hybrid': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Recording status with method indicator */}
      {(isRecording || isProcessing) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CircularAudioVisualization 
                audioLevel={audioLevel} 
                isRecording={isRecording} 
              />
              <div className="flex flex-col">
                <span className={cn('font-medium', isRecording ? 'text-red-600' : 'text-orange-600')}>
                  {isRecording ? 'Listening...' : isProcessing ? 'Processing...' : 'Ready'}
                </span>
                <span className={cn('text-xs', getMethodColor(transcriptionMethod))}>
                  {getMethodLabel(transcriptionMethod)}
                </span>
              </div>
            </div>
            
            {/* Language detection indicator */}
            {detectedLanguage && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full text-xs">
                <span className="text-blue-700 font-medium">
                  {detectedLanguage.split('-')[0].toUpperCase()}
                </span>
                {confidence && (
                  <span className="text-blue-600">
                    ({Math.round(confidence * 100)}%)
                  </span>
                )}
              </div>
            )}
          </div>
          
          <WaveformAudioVisualization 
            audioLevel={audioLevel} 
            isRecording={isRecording} 
          />
        </div>
      )}
      
      {/* Transcript preview */}
      {transcript && (
        <div className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-2 border-l-4 border-blue-200">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-medium text-xs uppercase tracking-wide">
              Transcript:
            </span>
            <span>"{transcript}"</span>
          </div>
        </div>
      )}
    </div>
  );
};