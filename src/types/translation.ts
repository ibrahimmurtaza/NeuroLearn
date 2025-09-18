// Translation Feature TypeScript Interfaces

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  isActive?: boolean;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  userId?: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  cached: boolean;
}

export interface TranslationError {
  message: string;
  code?: string;
  details?: any;
}

export interface UserTranslationPreferences {
  id?: string;
  userId: string;
  defaultLanguage: string;
  autoTranslate: boolean;
  displayMode: DisplayMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranslationCache {
  id?: string;
  userId?: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidenceScore: number;
  textHash: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface TranslationState {
  isTranslating: boolean;
  error: TranslationError | null;
  translations: Map<string, TranslationResponse>;
  supportedLanguages: Language[];
  userPreferences: UserTranslationPreferences | null;
}

export interface TranslationHookReturn {
  translatedText: string | null;
  isTranslating: boolean;
  error: string | null;
  confidence: number | null;
  translateText: (text: string, targetLanguage: string) => Promise<void>;
  clearTranslation: () => void;
}

export interface UseTranslationReturn {
  translatedText: string | null;
  isTranslating: boolean;
  error: TranslationError | null;
  confidence: number | null;
  translateText: (text: string, targetLanguage: string) => Promise<void>;
  translate: (text: string, targetLanguage: string, sourceLanguage?: string) => Promise<TranslationResponse | null>;
  clearTranslation: () => void;
}

export interface UseTranslationOptions {
  autoTranslate?: boolean;
  cacheResults?: boolean;
  targetLanguage?: string;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  onTranslationStart?: () => void;
  onTranslationComplete?: (result: TranslationResponse) => void;
  onTranslationError?: (error: TranslationError) => void;
}

export type TranslationMode = 'side-by-side' | 'stacked' | 'translation-only';

export interface LanguagePreferencesHookReturn {
  preferences: UserTranslationPreferences | null;
  updatePreferences: (preferences: Partial<UserTranslationPreferences>) => Promise<void>;
  isLoading: boolean;
  error: TranslationError | null;
}

export interface TranslationApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: TranslationError;
}

// Component Props Interfaces
export interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (languageCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showNativeNames?: boolean;
  className?: string;
}

export interface TranslationPanelProps {
  originalText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage?: string;
  isLoading?: boolean;
  error?: TranslationError | null;
  confidence?: number;
  onRetry?: () => void;
  displayMode?: DisplayMode;
  className?: string;
}

export interface TranslationControlsProps {
  onTranslate: () => void;
  onToggleAutoTranslate: () => void;
  isTranslating: boolean;
  autoTranslate: boolean;
  disabled?: boolean;
  className?: string;
}

// API Route Types
export interface TranslateApiRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  userId?: string;
}

export interface LanguagesApiResponse {
  languages: Language[];
}

export interface PreferencesApiRequest {
  userId: string;
  defaultLanguage: string;
  autoTranslate: boolean;
  displayMode: DisplayMode;
}

export interface PreferencesApiResponse {
  preferences: UserTranslationPreferences;
}

// Utility Types
export type TranslationKey = `${string}-${string}-${string}`; // originalTextHash-sourceLanguage-targetLanguage
export type DisplayMode = 'side-by-side' | 'stacked' | 'translation-only';
export type LanguageCode = string;

// Constants
export const SUPPORTED_DISPLAY_MODES: DisplayMode[] = ['side-by-side', 'stacked', 'translation-only'];
export const DEFAULT_LANGUAGE = 'en';
export const TRANSLATION_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
export const MAX_TRANSLATION_LENGTH = 5000;
export const TRANSLATION_CONFIDENCE_THRESHOLD = 0.7;