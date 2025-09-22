// Video Summarization Feature TypeScript Interfaces

// Core video summary interface
export interface VideoSummary {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_file_path?: string;
  source_type?: 'youtube' | 'upload';
  video_title?: string;
  video_description?: string;
  channel_name?: string;
  thumbnail_url?: string;
  duration: number; // in seconds
  summary: string;
  summary_content?: string;
  key_points: string[];
  summary_options?: any;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Video metadata interface
export interface VideoMetadata {
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  language?: string;
  chapters?: VideoChapter[];
  quality?: 'low' | 'medium' | 'high' | 'hd' | '4k';
}

// Video chapter interface
export interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}

// Summary generation options
export interface SummaryOptions {
  length: 'short' | 'medium' | 'long' | 'detailed';
  style: 'bullet-points' | 'paragraph' | 'structured' | 'academic';
  focus: 'general' | 'technical' | 'educational' | 'business' | 'entertainment';
  language: string;
  includeTimestamps: boolean;
  includeKeywords: boolean;
  includeQuotes: boolean;
  customPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro' | 'claude-3';
}

// Transcript segment interface
export interface TranscriptSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
  confidence?: number; // 0-1 confidence score
  speaker?: string;
  keywords?: string[];
  created_at?: string;
}

// Emotion analysis data
export interface EmotionData {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
    disgust?: number;
  };
}

// Video transcript interface
export interface VideoTranscript {
  id: string;
  video_summary_id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
  speaker?: string;
  keywords?: string[];
  created_at: string;
}

// Video timestamp interface for key moments
export interface VideoTimestamp {
  id: string;
  video_summary_id: string;
  timestamp: number; // in seconds
  title: string;
  description: string;
  timestamp_type: 'key-point' | 'chapter' | 'highlight' | 'quote' | 'action-item';
  importance: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

// Video frame interface for visual analysis
export interface VideoFrame {
  id: string;
  video_summary_id: string;
  timestamp: number; // in seconds
  frame_url: string; // URL to the extracted frame image
  description?: string; // AI-generated description
  analysis_data?: any; // JSON data for objects, text, scene analysis
  created_at: string;
}

// Detected object in frame
export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Extracted text from frame
export interface ExtractedText {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  language?: string;
}

// Scene analysis data
export interface SceneAnalysis {
  sceneType: 'presentation' | 'discussion' | 'demonstration' | 'interview' | 'lecture' | 'other';
  lighting: 'bright' | 'dim' | 'natural' | 'artificial';
  setting: 'indoor' | 'outdoor' | 'studio' | 'office' | 'classroom' | 'other';
  peopleCount: number;
  dominantColors: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

// API request/response interfaces

// YouTube video processing request
export interface YouTubeProcessRequest {
  url: string;
  userId: string;
  options: SummaryOptions;
  extractFrames?: boolean;
  frameInterval?: number; // seconds between frame extractions
}

// Video upload processing request
export interface VideoUploadRequest {
  userId: string;
  options: SummaryOptions;
  extractFrames?: boolean;
  frameInterval?: number;
}

// Video processing response
export interface VideoProcessResponse {
  success: boolean;
  videoSummary?: VideoSummary;
  processingId?: string;
  estimatedTime?: number; // in seconds
  error?: string;
  warnings?: string[];
}

// Transcript search request
export interface TranscriptSearchRequest {
  videoSummaryId: string;
  userId: string;
  query: string;
  options?: {
    contextWindow?: number; // seconds before/after match
    maxResults?: number;
    minRelevanceScore?: number;
    includeTimestamps?: boolean;
    searchType?: 'semantic' | 'keyword' | 'fuzzy';
  };
}

// Transcript search response
export interface TranscriptSearchResponse {
  success: boolean;
  query: string;
  matches: Array<{
    segment: TranscriptSegment;
    relevanceScore: number;
    context: string;
    highlightedText: string;
    relatedTimestamps?: VideoTimestamp[];
  }>;
  totalMatches: number;
  searchTime: number; // in milliseconds
}

// Frame analysis request
export interface FrameAnalysisRequest {
  videoSummaryId: string;
  userId: string;
  timestamps?: number[]; // specific timestamps to analyze
  analysisType: 'objects' | 'text' | 'scene' | 'all';
  options?: {
    includeDescriptions?: boolean;
    detectObjects?: boolean;
    extractText?: boolean;
    analyzeScene?: boolean;
    maxFrames?: number;
  };
}

// Frame analysis response
export interface FrameAnalysisResponse {
  success: boolean;
  frames: VideoFrame[];
  totalFrames: number;
  processingTime: number;
  error?: string;
}

// Batch processing request
export interface BatchProcessRequest {
  userId: string;
  videos: Array<{
    type: 'youtube' | 'upload';
    source: string; // URL for YouTube, file path for upload
    options: SummaryOptions;
  }>;
  priority: 'low' | 'normal' | 'high';
}

// Batch processing response
export interface BatchProcessResponse {
  success: boolean;
  batchId: string;
  totalVideos: number;
  estimatedTime: number;
  processingOrder: string[]; // video IDs in processing order
}

// Processing status interface
export interface ProcessingStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // in seconds
  error?: string;
  startedAt: string;
  completedAt?: string;
  result?: VideoSummary;
}

// Export configuration interface
export interface ExportConfig {
  format: 'json' | 'pdf' | 'docx' | 'txt' | 'srt' | 'vtt';
  includeTranscript: boolean;
  includeTimestamps: boolean;
  includeFrames: boolean;
  includeSummary: boolean;
  includeMetadata: boolean;
  customTemplate?: string;
  language?: string;
}

// Export response interface
export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  format: string;
  expiresAt: string;
  error?: string;
}

// Analytics interface
export interface VideoAnalytics {
  videoSummaryId: string;
  viewCount: number;
  averageWatchTime: number;
  completionRate: number;
  mostViewedSegments: Array<{
    startTime: number;
    endTime: number;
    viewCount: number;
  }>;
  searchQueries: Array<{
    query: string;
    count: number;
    lastSearched: string;
  }>;
  exportCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

// User preferences interface
export interface UserPreferences {
  userId: string;
  defaultSummaryOptions: SummaryOptions;
  defaultLanguage: string;
  autoExtractFrames: boolean;
  defaultFrameInterval: number;
  notificationSettings: {
    emailOnCompletion: boolean;
    emailOnError: boolean;
    pushNotifications: boolean;
  };
  exportPreferences: ExportConfig;
  privacySettings: {
    allowPublicSharing: boolean;
    allowAnalytics: boolean;
    dataRetentionDays: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Error interfaces
export interface VideoProcessingError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  videoSummaryId?: string;
  userId?: string;
  step?: string;
  retryable: boolean;
}

// Webhook interfaces
export interface WebhookPayload {
  event: 'video.processing.started' | 'video.processing.completed' | 'video.processing.failed' | 'video.deleted';
  data: {
    videoSummaryId: string;
    userId: string;
    status: ProcessingStatus;
    timestamp: string;
  };
  signature: string;
}

// Rate limiting interface
export interface RateLimit {
  userId: string;
  endpoint: string;
  requestCount: number;
  windowStart: string;
  windowEnd: string;
  limit: number;
  remaining: number;
  resetTime: string;
}

// Storage interfaces
export interface StorageQuota {
  userId: string;
  totalStorage: number; // in bytes
  usedStorage: number; // in bytes
  videoCount: number;
  maxVideos: number;
  maxFileSize: number; // in bytes
  maxDuration: number; // in seconds
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
}

// Database table interfaces (matching Supabase schema)
export interface VideoSummaryRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url?: string;
  youtube_url?: string;
  youtube_video_id?: string;
  thumbnail_url?: string;
  duration: number;
  file_size?: number;
  mime_type?: string;
  summary: string;
  key_points: string[];
  tags: string[];
  processing_status: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface VideoTranscriptRow {
  id: string;
  video_summary_id: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
  speaker?: string;
  keywords?: string[];
  language?: string;
  created_at: string;
}

export interface VideoTimestampRow {
  id: string;
  video_summary_id: string;
  timestamp: number;
  title: string;
  description: string;
  type: string;
  importance: string;
  tags: string[];
  related_segments?: string[];
  created_at: string;
}

export interface VideoFrameRow {
  id: string;
  video_summary_id: string;
  timestamp: number;
  frame_url: string;
  description?: string;
  objects?: any;
  text?: any;
  scene?: any;
  importance: string;
  created_at: string;
}