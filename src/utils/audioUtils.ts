/**
 * Audio utilities for optimal Whisper processing
 */


export interface AudioRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioProcessingResult {
  blob: Blob;
  duration: number;
  size: number;
  format: string;
}

/**
 * Get optimal recording options for Whisper
 */
export function getOptimalRecordingOptions(): AudioRecordingOptions {
  return {
    mimeType: 'audio/webm;codecs=opus', // Optimal for Whisper
    audioBitsPerSecond: 256000, // Increased from 128000 for better quality
    sampleRate: 48000, // Higher sample rate, will be downsampled to 16kHz by Whisper
    channelCount: 1, // Mono is sufficient for speech
    echoCancellation: true,
    noiseSuppression: false, // Disable to preserve speech nuances
    autoGainControl: false, // Disable to prevent audio distortion
  };
}

/**
 * Get supported MIME types for recording, prioritized for Whisper
 */
export function getSupportedMimeTypes(): string[] {
  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];

  return preferredTypes.filter(type => MediaRecorder.isTypeSupported(type));
}

/**
 * Create MediaRecorder with optimal settings for Whisper
 */
export function createOptimalMediaRecorder(
  stream: MediaStream,
  onDataAvailable: (event: BlobEvent) => void,
  onStop?: () => void,
  customOptions?: Partial<AudioRecordingOptions>
): MediaRecorder {
  const options = { ...getOptimalRecordingOptions(), ...customOptions };
  const supportedTypes = getSupportedMimeTypes();
  
  // Use the first supported type, fallback to browser default
  const mimeType = supportedTypes.find(type => 
    options.mimeType ? type.includes(options.mimeType.split(';')[0]) : true
  ) || supportedTypes[0];

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    audioBitsPerSecond: options.audioBitsPerSecond,
  });

  mediaRecorder.addEventListener('dataavailable', onDataAvailable);
  if (onStop) {
    mediaRecorder.addEventListener('stop', onStop);
  }

  return mediaRecorder;
}

/**
 * Process audio for optimal Whisper transcription
 */
export async function processAudioForWhisper(
  audioBlob: Blob,
  options: {
    maxSize?: number; // in bytes
    targetFormat?: string;
    compress?: boolean;
  } = {}
): Promise<AudioProcessingResult> {
  const startTime = Date.now();
  
  // Default options
  const maxSize = options.maxSize || 25 * 1024 * 1024; // 25MB default
  const targetFormat = options.targetFormat || (audioBlob.type.split(';')[0] || 'audio/webm');
  const compress = options.compress !== undefined ? options.compress : true;
  
  // Validate input
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Invalid audio blob');
  }
  
  // Check if conversion is needed
  let processedBlob = audioBlob;
  let format = audioBlob.type || 'audio/webm';
  
  // Do not convert on client; keep original format for Whisper
  
  // Compress if needed and enabled
  if (compress && processedBlob.size > maxSize) {
    try {
      processedBlob = await compressAudio(processedBlob, maxSize);
    } catch (error) {
      console.warn('Audio compression failed:', error);
    }
  }
  
  const duration = estimateAudioDuration(processedBlob);
  
  return {
    blob: processedBlob,
    duration,
    size: processedBlob.size,
    format
  };
}

/**
 * Compress audio to target size
 */
async function compressAudio(audioBlob: Blob, targetSize: number): Promise<Blob> {
  // Simple compression by reducing quality
  // In a real implementation, you would use more sophisticated methods
  
  // For now, just return the original blob
  console.warn('Audio compression not implemented, using original audio');
  return audioBlob;
}

/**
 * Estimate audio duration based on file size and format
 */
function estimateAudioDuration(audioBlob: Blob): number {
  // Rough estimation based on typical bitrates
  const sizeInKB = audioBlob.size / 1024;
  const mimeType = audioBlob.type.toLowerCase();
  
  // Rough bitrate estimates in KB/s
  let bitrate = 128; // Default for most formats
  
  if (mimeType.includes('wav')) {
    bitrate = 1411; // CD quality WAV
  } else if (mimeType.includes('mp3')) {
    bitrate = 128; // Typical MP3
  } else if (mimeType.includes('ogg')) {
    bitrate = 96; // Typical Ogg Vorbis
  } else if (mimeType.includes('webm')) {
    bitrate = 64; // Typical WebM Opus
  }
  
  // Duration in seconds = size in KB / (bitrate in KB/s)
  const durationSeconds = sizeInKB / bitrate;
  
  return durationSeconds;
}

/**
 * Validate audio blob for transcription
 */
export function validateAudioBlob(audioBlob: Blob): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  if (!audioBlob || audioBlob.size === 0) {
    return { valid: false, error: 'Audio blob is empty or invalid' };
  }

  const maxSize = 25 * 1024 * 1024; // 25MB
  if (audioBlob.size > maxSize) {
    return { 
      valid: false, 
      error: `Audio file too large: ${(audioBlob.size / (1024 * 1024)).toFixed(1)}MB (max: 25MB)` 
    };
  }

  // Check if it's too small (likely not useful audio)
  const minSize = 1024; // 1KB
  if (audioBlob.size < minSize) {
    warnings.push('Audio file is very small, transcription quality may be poor');
  }

  // Check MIME type
  const supportedTypes = [
    'audio/webm',
    'audio/wav',
    'audio/mp3',
    'audio/m4a',
    'audio/ogg',
    'audio/flac',
  ];

  if (audioBlob.type && !supportedTypes.some(type => audioBlob.type.includes(type))) {
    warnings.push(`Audio format ${audioBlob.type} may not be optimal for transcription`);
  }

  return { valid: true, warnings };
}

/**
 * Convert audio blob to File with proper naming
 */
export function blobToFile(
  audioBlob: Blob, 
  filename?: string,
  timestamp?: Date
): File {
  const now = timestamp || new Date();
  const formattedDate = now.toISOString().replace(/[:.]/g, '-');
  const name = filename || `audio-${formattedDate}.${getExtensionFromMimeType(audioBlob.type)}`;
  
  return new File([audioBlob], name, { type: audioBlob.type });
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  if (!mimeType) return 'webm';
  
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('flac')) return 'flac';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mp4')) return 'mp4';
  
  return 'webm'; // Default
}

/**
 * Get optimal audio constraints for recording
 */
export function getAudioConstraints(options?: Partial<AudioRecordingOptions>): MediaStreamConstraints {
  const defaultOptions = getOptimalRecordingOptions();
  const mergedOptions = { ...defaultOptions, ...options };
  
  return {
    audio: {
      channelCount: mergedOptions.channelCount,
      sampleRate: mergedOptions.sampleRate,
      echoCancellation: mergedOptions.echoCancellation,
      noiseSuppression: mergedOptions.noiseSuppression,
      autoGainControl: mergedOptions.autoGainControl,
    },
    video: false
  };
}