'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UseVoiceRecognitionOptions,
  UseVoiceRecognitionReturn,
  VoiceError,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  ExtendedSpeechRecognition,
  TranscriptionMethod,
  TranscriptionResult
} from '@/types/voice';
import {
  createOptimalMediaRecorder,
  processAudioForWhisper,
  validateAudioBlob,
  blobToFile,
  getAudioConstraints
} from '@/utils/audioUtils';
import { AudioConverter } from '@/utils/audioConverter';
import { WebAudioRecorder } from '@/utils/webAudioRecorder';

/**
 * Enhanced voice recognition hook with Whisper support
 * Supports Web Speech API, Whisper API, and hybrid approaches
 */
export const useVoiceRecognitionEnhanced = ({
  continuous = true,
  interimResults = true,
  language = 'en-US',
  transcriptionMethod = 'hybrid',
  useWhisper = true,
  autoDetectLanguage = true,
  translateToEnglish = false,
  fallbackToWebSpeech = true,
  onTranscript,
  onTranscriptionResult,
  onError,
  onStart,
  onEnd
}: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscriptionMethod, setCurrentTranscriptionMethod] = useState<TranscriptionMethod>(transcriptionMethod);
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for audio and recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioRecorderRef = useRef<WebAudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const usingWebAudioFallback = useRef<boolean>(false);

  // Check browser support
  const checkSpeechRecognitionSupport = useCallback((): boolean => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  // Create SpeechRecognition instance
  const createSpeechRecognition = (): ExtendedSpeechRecognition | null => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    return new SpeechRecognition() as ExtendedSpeechRecognition;
  };

  // Handle errors
  const handleError = useCallback((errorType: string, customMessage?: string): VoiceError => {
    let error: VoiceError;
    
    switch (errorType) {
      case 'not-allowed':
        error = {
          type: 'not-allowed',
          message: customMessage || 'Microphone access denied. Please enable microphone permissions.'
        };
        break;
      case 'no-speech':
        error = {
          type: 'no-speech',
          message: customMessage || 'No speech detected. Please try again.'
        };
        break;
      case 'audio-capture':
        error = {
          type: 'audio-capture',
          message: customMessage || 'Microphone not available. Please check your audio settings.'
        };
        break;
      case 'network':
        error = {
          type: 'network',
          message: customMessage || 'Network error. Please check your internet connection.'
        };
        break;
      case 'not-supported':
        error = {
          type: 'not-supported',
          message: customMessage || 'Speech recognition not supported in this browser.'
        };
        break;
      default:
        error = {
          type: 'unknown',
          message: customMessage || 'Speech recognition error. Please try again.'
        };
    }
    
    return error;
  }, []);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }, []);

  // Setup audio visualization
  const setupAudioVisualization = useCallback(async () => {
    try {
      const constraints = getAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      return stream;
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      throw error;
    }
  }, [isRecording]);

  // Cleanup audio resources
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    analyserRef.current = null;
    audioChunksRef.current = [];
    setAudioLevel(0);
  }, []);

  // Transcribe with Whisper API
  const transcribeWithWhisper = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    setIsProcessing(true);
    
    try {
      // Validate audio
      const validation = validateAudioBlob(audioBlob);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Use the actual recorded format without changing it
      const rawMimeType = audioBlob.type || 'audio/webm';
      console.log(`Original audio format: ${rawMimeType}, size: ${audioBlob.size}`);
      
      // Sanitize MIME type (strip codec parameters) for Whisper compatibility
      const mimeType = rawMimeType.split(';')[0].trim();
      console.log(`Sanitized audio MIME type: ${mimeType}`);
      
      // Keep original blob; set filename by base MIME
      const fileType = mimeType;
      let fileName = 'audio.webm';
      if (mimeType.includes('wav')) {
        fileName = 'audio.wav';
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        fileName = 'audio.mp3';
      } else if (mimeType.includes('mp4')) {
        fileName = 'audio.mp4';
      } else if (mimeType.includes('m4a')) {
        fileName = 'audio.m4a';
      } else if (mimeType.includes('ogg')) {
        fileName = 'audio.ogg';
      } else if (mimeType.includes('webm')) {
        fileName = 'audio.webm';
      } else {
        // Fallback - use webm for unknown formats
        fileName = 'audio.webm';
      }
      
      const audioFile = new File([audioBlob], fileName, { type: fileType });
      console.log(`Sending to API: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

      // Create form data with enhanced parameters
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('model', 'whisper-1'); // Specify model
      formData.append('autoDetect', autoDetectLanguage.toString());
      formData.append('translate', translateToEnglish.toString());
      
      // Debug logging
      console.log('Hook sending parameters:', {
        autoDetect: autoDetectLanguage,
        translate: translateToEnglish,
        language: language
      });
      
      if (!autoDetectLanguage && language) {
        formData.append('language', language);
      }
      formData.append('response_format', 'verbose_json'); // Get detailed response
      formData.append('temperature', '0'); // More deterministic results

      // Enhanced timeout and abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Call transcription API with retry logic
      let lastError: Error | null = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: {
              // Don't set Content-Type, let browser set it with boundary for FormData
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Transcription failed (${response.status})`;
            
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
            } catch {
              errorMessage += `: ${errorText}`;
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          
          // Handle different response formats
          let result: TranscriptionResult;
          if (data.transcription) {
            // API returns { success: true, transcription: { text: "...", ... } }
            result = data.transcription;
          } else if (data.text) {
            // Fallback for direct text response
            result = {
              text: data.text,
              method: 'whisper',
              confidence: data.confidence || 0.9,
              language: data.language || language,
              duration: data.duration
            };
          } else {
            throw new Error('Invalid response format from transcription API');
          }

          // Validate result
          if (!result.text || !result.text.trim()) {
            throw new Error('No speech detected in the recording');
          }

          // Update detected language
          if (result.language) {
            setDetectedLanguage(result.language);
          }

          return result;
        } catch (error) {
          lastError = error as Error;
          
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Transcription timed out - please try a shorter recording');
          }
          
          if (attempt < maxRetries) {
            console.warn(`Transcription attempt ${attempt + 1} failed, retrying...`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          }
        }
      }
      
      throw lastError || new Error('Transcription failed after multiple attempts');
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [autoDetectLanguage, language]);

  // Setup Web Speech API
  const setupWebSpeechRecognition = useCallback(() => {
    const recognition = createSpeechRecognition();
    if (!recognition) return null;
    
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy
    
    let finalTranscriptAccumulator = '';
    let restartAttempts = 0;
    const maxRestartAttempts = 3;
    
    recognition.onstart = () => {
      console.log('Web Speech API started');
      restartAttempts = 0;
    };
    
    recognition.onend = () => {
      console.log('Web Speech API ended');
      if (continuous && isRecording && restartAttempts < maxRestartAttempts) {
        try {
          recognition.start();
          restartAttempts = 0;
        } catch (restartError) {
          console.warn('Failed to restart recognition:', restartError);
          restartAttempts++;
          if (restartAttempts < maxRestartAttempts) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.error('Final restart attempt failed:', e);
              }
            }, 1000);
          }
        }
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Web Speech API error:', event.error);
      
      // Enhanced error handling with specific error types
      let errorMessage = 'Speech recognition error';
      switch (event.error) {
        case 'network':
          errorMessage = 'Network error - check your internet connection';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected - please try speaking louder';
          break;
        case 'audio-capture':
          errorMessage = 'Audio capture failed - check your microphone';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      if (currentTranscriptionMethod === 'hybrid' && useWhisper && event.error !== 'not-allowed') {
        console.log('Falling back to Whisper transcription due to:', event.error);
        // Don't set error for hybrid mode, let Whisper handle it
      } else {
        const voiceError = handleError(event.error, errorMessage);
        setError(voiceError);
        onError?.(voiceError);
      }
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.8;
        
        if (result.isFinal) {
          finalTranscript += transcript;
          finalTranscriptAccumulator += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }
      
      // Update transcript with accumulated final + current interim
      const fullTranscript = finalTranscriptAccumulator + interimText;
      setTranscript(fullTranscript.trim());
      setInterimTranscript(interimText);
      
      if (finalTranscript) {
        onTranscript?.(finalTranscript);
        
        const transcriptionResult: TranscriptionResult = {
          text: finalTranscript,
          method: 'web-speech',
          confidence: 0.8, // Web Speech API doesn't always provide confidence
          language: language
        };
        
        onTranscriptionResult?.(transcriptionResult);
      }
    };
    
    return recognition;
  }, [continuous, interimResults, language, isRecording, currentTranscriptionMethod, useWhisper, onTranscript, onTranscriptionResult, handleError, onError]);

  // Helper function to get supported MIME type (moved outside of useCallback)
  const getSupportedMimeType = useCallback((): string => {
    if (!MediaRecorder.isTypeSupported) {
      console.warn('MediaRecorder.isTypeSupported not available, using fallback');
      return 'audio/webm;codecs=opus'; // Most browsers support this
    }

    // Prioritize formats that work best with OpenAI Whisper
    // Start with WAV if supported, then WebM, then fallbacks
    const supportedTypes = [
      'audio/wav', // WAV is ideal for OpenAI - no conversion needed
      'audio/webm;codecs=opus', // WebM with Opus - good conversion support
      'audio/webm', // WebM fallback
      'audio/ogg;codecs=opus', // OGG with Opus
      'audio/ogg', // OGG fallback
      'audio/mp4' // MP4 as last resort - conversion often problematic
    ];

    console.log('Checking MIME type support:');
    let selectedMimeType = '';
    for (const type of supportedTypes) {
      const isSupported = MediaRecorder.isTypeSupported(type);
      console.log(`  ${type}: ${isSupported ? 'SUPPORTED' : 'not supported'}`);
      if (isSupported && !selectedMimeType) {
        selectedMimeType = type;
      }
    }

    if (selectedMimeType) {
      const formatType = selectedMimeType.includes('wav') ? 'WAV (no conversion needed)' : 
                        selectedMimeType.includes('webm') ? 'WebM (requires conversion)' :
                        selectedMimeType.includes('ogg') ? 'OGG (requires conversion)' :
                        'MP4 (requires conversion)';
      console.log(`Selected MIME type: ${selectedMimeType} (${formatType})`);
      return selectedMimeType;
    }

    console.warn('No supported MIME types found, falling back to WebM with Opus');
    return 'audio/webm;codecs=opus'; // Default fallback
  }, []);

  // Setup audio recording for Whisper
  const setupAudioRecording = useCallback((stream: MediaStream) => {
    audioChunksRef.current = [];
    usingWebAudioFallback.current = false;
    
    const mimeType = getSupportedMimeType();
    console.log('Using MIME type for recording:', mimeType);

    // Check if we should use Web Audio API fallback for WAV recording
    const shouldUseWebAudioFallback = mimeType?.includes('webm') && mimeType.includes('opus');
    
    if (shouldUseWebAudioFallback) {
      console.log('WebM detected - trying Web Audio API fallback for direct WAV recording');
      try {
        const webAudioRecorder = new WebAudioRecorder();
        webAudioRecorderRef.current = webAudioRecorder;
        usingWebAudioFallback.current = true;
        
        webAudioRecorder.startRecording(stream);
        console.log('Web Audio API recording started successfully');
        return;
      } catch (webAudioError) {
        console.warn('Web Audio API fallback failed, using MediaRecorder:', webAudioError);
        usingWebAudioFallback.current = false;
      }
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 256000 // Optimize for quality vs size
      });
      
      let recordingStartTime = Date.now();
      
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          console.log(`Audio chunk received: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        } else {
          console.warn('Received empty audio chunk');
        }
      };
      
      mediaRecorder.onstop = async () => {
        const recordingDuration = Date.now() - recordingStartTime;
        
        // Process any recorded audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log(`Processing audio: ${recordingDuration}ms duration, ${audioBlob.size} bytes`);
          console.log(`Audio chunks collected: ${audioChunksRef.current.length} chunks`);
          console.log(`Individual chunk sizes:`, audioChunksRef.current.map(chunk => chunk.size));
          
          // Enhanced validation for better transcription quality
          const validation = validateAudioBlob(audioBlob);
          if (!validation.valid) {
            console.error('Audio validation failed:', validation.error);
            const voiceError = handleError('audio-capture', validation.error || 'Invalid audio recording');
            setError(voiceError);
            onError?.(voiceError);
            return;
          }
          
          // Check for minimum recording duration (avoid very short clips that result in "You")
          if (recordingDuration < 1000) { // Less than 1 second
            console.warn('Recording too short (< 1s), may result in poor transcription like "You"');
            const shortError = handleError('no-speech', 'Recording too short - please speak for at least 1 second');
            setError(shortError);
            onError?.(shortError);
            return;
          }
          
          // Check for minimum file size (very small files are likely silence)
          // TEMPORARILY DISABLED FOR DEBUGGING
          // Re-enable file size validation now that conversion issues are fixed
          if (audioBlob.size < 3000) { // Less than 3KB is likely silence
            console.warn('Audio file too small, likely contains mostly silence');
            const silenceError = handleError('no-speech', 'No clear speech detected - please speak louder and longer');
            setError(silenceError);
            onError?.(silenceError);
            return;
          }
          
          // Log validation warnings if any
          if (validation.warnings && validation.warnings.length > 0) {
            console.warn('Audio quality warnings:', validation.warnings);
          }
          
          try {
            // Always convert WebM to WAV for OpenAI compatibility
            // WebM is our preferred recording format but needs conversion
            const audioType = (audioBlob.type || mimeType).toLowerCase();
            console.log(`Audio type check: "${audioType}"`);
            
            let processedAudioBlob = audioBlob;
            
            if (audioType.includes('webm') || audioType.includes('opus')) {
              console.log('WebM format detected - converting to WAV for OpenAI compatibility');
              console.log(`Original WebM: type: ${audioBlob.type}, size: ${audioBlob.size}`);
              
              try {
                const audioConverter = new AudioConverter();
                const wavBlob = await audioConverter.convertToWav(audioBlob);
                
                console.log(`Converted to WAV: type: ${wavBlob.type}, size: ${wavBlob.size}`);
                processedAudioBlob = wavBlob;
              } catch (conversionError) {
                console.error('WebM to WAV conversion failed:', conversionError);
                
                // Try recording with a different format
                const conversionFailedError = handleError('audio-capture', 'Audio conversion failed. Please try recording again or use a different browser.');
                setError(conversionFailedError);
                onError?.(conversionFailedError);
                return;
              }
            } else {
              console.log(`Audio format ${audioType} - sending directly without conversion`);
            }
            
            // Transcribe with processed audio
            const result = await transcribeWithWhisper(processedAudioBlob);
            
            // Additional check for common Whisper fallback responses
            if (result.text.trim().toLowerCase() === 'you' || 
                result.text.trim().toLowerCase() === 'thank you' ||
                result.text.trim().length < 3) {
              console.warn('Whisper returned likely fallback text:', result.text);
              const fallbackError = handleError('no-speech', 'No clear speech detected - please speak more clearly and for longer');
              setError(fallbackError);
              onError?.(fallbackError);
              return;
            }
            
            setTranscript(prev => prev + result.text);
            onTranscript?.(result.text);
            onTranscriptionResult?.(result);
          } catch (error) {
            console.error('Whisper transcription failed:', error);
            
            let errorMessage = 'Transcription failed';
            if (error instanceof Error) {
              if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error - please check your connection';
              } else if (error.message.includes('timeout')) {
                errorMessage = 'Transcription timed out - please try a shorter recording';
              } else {
                errorMessage = `Transcription error: ${error.message}`;
              }
            }
            
            // Fallback to Web Speech API if enabled
            if (fallbackToWebSpeech && currentTranscriptionMethod === 'hybrid') {
              console.log('Falling back to Web Speech API');
              // Note: We can't re-process the same audio with Web Speech API
              // This would require re-recording
            }
            
            const transcriptionError = handleError('unknown', errorMessage);
            setError(transcriptionError);
            onError?.(transcriptionError);
          }
        } else {
          const noAudioError = handleError('no-speech', 'No audio recorded - please try again');
          setError(noAudioError);
          onError?.(noAudioError);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const recordingError = handleError('audio-capture', 'Recording failed - please try again');
        setError(recordingError);
        onError?.(recordingError);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      return mediaRecorder;
    } catch (mediaRecorderError) {
      console.error('Failed to create MediaRecorder:', mediaRecorderError);
      const creationError = handleError('not-supported', 'Recording not supported in this browser');
      setError(creationError);
      onError?.(creationError);
      throw creationError;
    }
  }, [transcribeWithWhisper, onTranscript, onTranscriptionResult, fallbackToWebSpeech, currentTranscriptionMethod, handleError, onError, getSupportedMimeType]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      const permissionError = handleError('not-allowed');
      setError(permissionError);
      onError?.(permissionError);
      return;
    }
    
    try {
      setError(null);
      setIsRecording(true);
      onStart?.();
      
      // Enhanced audio constraints for better quality
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 16000, min: 8000, max: 48000 },
        channelCount: { ideal: 1 },
        latency: { ideal: 0.01 },
        volume: { ideal: 1.0 }
      };

      // Get microphone stream with enhanced constraints
      let stream: MediaStream;
      if (streamRef.current) {
        stream = streamRef.current;
      } else {
        // Use improved audio constraints for better quality
        const constraints = getAudioConstraints({
          sampleRate: 48000, // Higher sample rate for better quality
          echoCancellation: true,
          noiseSuppression: false, // Preserve speech nuances
          autoGainControl: false // Prevent audio distortion
        });
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      
      // Initialize audio context and analyzer with error handling
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Handle audio context state
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // Enhanced audio level monitoring with quality metrics
        const updateAudioLevel = () => {
          if (!analyser || !isRecording) return;
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate RMS for better audio level representation
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);
          const normalizedLevel = Math.min(rms / 128, 1);
          
          setAudioLevel(normalizedLevel);
          
          if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
      } catch (audioContextError) {
        console.warn('Audio context initialization failed:', audioContextError);
        // Continue without audio visualization
      }
      
      if (currentTranscriptionMethod === 'web-speech') {
        // Use only Web Speech API
        const recognition = setupWebSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }
      } else if (currentTranscriptionMethod === 'whisper') {
        // Use only Whisper with enhanced recording
        setupAudioRecording(stream);
        // Start recording if using Web Audio API fallback
        if (usingWebAudioFallback.current && webAudioRecorderRef.current) {
          // Web Audio API recording already started in setupAudioRecording
          console.log('Web Audio API recording active');
        } else if (mediaRecorderRef.current) {
          mediaRecorderRef.current.start(1000); // Collect data every second
        }
      } else if (currentTranscriptionMethod === 'hybrid') {
        // Use both: Web Speech for real-time, Whisper for final accuracy
        const recognition = setupWebSpeechRecognition();
        setupAudioRecording(stream);
        
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }
        // Start recording if using Web Audio API fallback
        if (usingWebAudioFallback.current && webAudioRecorderRef.current) {
          // Web Audio API recording already started in setupAudioRecording
          console.log('Web Audio API recording active for hybrid mode');
        } else if (mediaRecorderRef.current) {
          mediaRecorderRef.current.start(1000); // Collect data every second
        }
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Failed to start recording';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied - please allow microphone permissions';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found - please connect a microphone';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Audio recording not supported in this browser';
        } else {
          errorMessage = `Failed to start recording: ${error.message}`;
        }
      }
      
      const startError = handleError('unknown', errorMessage);
      setError(startError);
      onError?.(startError);
      setIsRecording(false);
      cleanupAudio();
    }
  }, [
    isRecording,
    requestMicrophonePermission,
    handleError,
    onError,
    onStart,
    currentTranscriptionMethod,
    setupWebSpeechRecognition,
    setupAudioRecording,
    cleanupAudio
  ]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    setIsRecording(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Handle Web Audio API fallback
    if (usingWebAudioFallback.current && webAudioRecorderRef.current) {
      console.log('Stopping Web Audio API recording');
      try {
        const wavBlob = webAudioRecorderRef.current.stopRecording();
        if (wavBlob && wavBlob.size > 0) {
           console.log('Web Audio API produced WAV blob:', wavBlob.size, 'bytes');
           // Process the WAV blob directly without conversion
           transcribeWithWhisper(wavBlob).then(result => {
             if (result.text) {
               setTranscript(prev => prev + ' ' + result.text);
               onTranscript?.(result.text);
               onTranscriptionResult?.(result);
             }
           }).catch(error => {
             console.error('Web Audio API transcription failed:', error);
             setError('Transcription failed');
             onError?.('Transcription failed');
           });
         } else {
          console.error('Web Audio API produced empty or invalid blob');
          setError('Recording failed - no audio data captured');
          onError?.('Recording failed - no audio data captured');
        }
      } catch (webAudioError) {
        console.error('Web Audio API stop failed:', webAudioError);
        setError('Recording failed during audio processing');
        onError?.('Recording failed during audio processing');
      }
      webAudioRecorderRef.current = null;
      usingWebAudioFallback.current = false;
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    cleanupAudio();
    onEnd?.();
  }, [isRecording, cleanupAudio, onEnd]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setDetectedLanguage(undefined);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set transcription method
  const setTranscriptionMethod = useCallback((method: TranscriptionMethod) => {
    if (!isRecording) {
      setCurrentTranscriptionMethod(method);
    }
  }, [isRecording]);

  // Initialize support check
  useEffect(() => {
    const webSpeechSupported = checkSpeechRecognitionSupport();
    const whisperSupported = true; // Whisper is always supported via API
    setIsSupported(webSpeechSupported || whisperSupported);
  }, [checkSpeechRecognitionSupport]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isRecording,
    isSupported,
    transcript,
    interimTranscript,
    error,
    audioLevel,
    transcriptionMethod: currentTranscriptionMethod,
    detectedLanguage,
    isProcessing,
    startRecording,
    stopRecording,
    resetTranscript,
    clearError,
    setTranscriptionMethod
  };
};