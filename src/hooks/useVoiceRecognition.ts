'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UseVoiceRecognitionOptions,
  UseVoiceRecognitionReturn,
  VoiceError,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  ExtendedSpeechRecognition
} from '@/types/voice';

/**
 * Custom hook for Web Speech API integration
 * Provides speech-to-text functionality with error handling and browser compatibility
 */
export const useVoiceRecognition = ({
  continuous = true,
  interimResults = true,
  language = 'en-US',
  onTranscript,
  onError,
  onStart,
  onEnd
}: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check browser support for Web Speech API
  const checkSpeechRecognitionSupport = useCallback((): boolean => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  // Get SpeechRecognition constructor
  const createSpeechRecognition = (): ExtendedSpeechRecognition | null => {
    if (typeof window === 'undefined') return null;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    
    return new SpeechRecognition() as ExtendedSpeechRecognition;
  };

  // Handle speech recognition errors
  const handleSpeechError = useCallback((errorType: string): VoiceError => {
    let error: VoiceError;
    
    switch (errorType) {
      case 'not-allowed':
        error = {
          type: 'not-allowed',
          message: 'Microphone access denied. Please enable microphone permissions.'
        };
        break;
      case 'no-speech':
        error = {
          type: 'no-speech',
          message: 'No speech detected. Please try again.'
        };
        break;
      case 'audio-capture':
        error = {
          type: 'audio-capture',
          message: 'Microphone not available. Please check your audio settings.'
        };
        break;
      case 'network':
        error = {
          type: 'network',
          message: 'Network error. Please check your internet connection.'
        };
        break;
      case 'not-supported':
        error = {
          type: 'not-supported',
          message: 'Speech recognition not supported in this browser.'
        };
        break;
      default:
        error = {
          type: 'unknown',
          message: 'Speech recognition error. Please try again.'
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
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
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
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
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    microphoneRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Setup speech recognition
  const setupSpeechRecognition = useCallback(() => {
    const recognition = createSpeechRecognition();
    if (!recognition) return null;
    
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      onStart?.();
    };
    
    recognition.onend = () => {
      setIsRecording(false);
      cleanupAudio();
      onEnd?.();
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const voiceError = handleSpeechError(event.error);
      setError(voiceError);
      onError?.(voiceError);
      setIsRecording(false);
      cleanupAudio();
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onTranscript?.(finalTranscript);
      }
      
      setInterimTranscript(interimTranscript);
    };
    
    return recognition;
  }, [continuous, interimResults, language, onTranscript, onError, onStart, onEnd, handleSpeechError, cleanupAudio]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported || isRecording) return;
    
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      const permissionError = handleSpeechError('not-allowed');
      setError(permissionError);
      onError?.(permissionError);
      return;
    }
    
    const recognition = setupSpeechRecognition();
    if (!recognition) {
      const supportError = handleSpeechError('not-supported');
      setError(supportError);
      onError?.(supportError);
      return;
    }
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      await setupAudioVisualization();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      const startError = handleSpeechError('unknown');
      setError(startError);
      onError?.(startError);
    }
  }, [isSupported, isRecording, requestMicrophonePermission, setupSpeechRecognition, setupAudioVisualization, handleSpeechError, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize support check
  useEffect(() => {
    setIsSupported(checkSpeechRecognitionSupport());
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
    startRecording,
    stopRecording,
    resetTranscript,
    clearError
  };
};