// Base types
export type SummaryType = 'short' | 'medium' | 'detailed' | 'brief' | 'bullet_points' | 'executive' | 'academic' | 'custom'
export type NoteType = 'outline' | 'mind_map' | 'cornell' | 'linear' | 'concept_map'
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard'
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error'
export type ProcessingStage = 'uploading' | 'extracting' | 'chunking' | 'analyzing' | 'summarizing' | 'generating' | 'completed' | 'error'
export type AudioType = 'lecture' | 'meeting' | 'interview' | 'podcast' | 'other'
export type AnalysisType = 'comparison' | 'synthesis' | 'themes' | 'timeline'
export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'txt' | 'markdown' | 'json' | 'csv' | 'srt' | 'vtt' | 'anki'

// Re-export from video-summarization types
export type { SummaryOptions } from './video-summarization'

// Document related types
export interface Document {
  id: string
  user_id: string
  folder_id?: string
  title: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  mime_type: string
  status: DocumentStatus
  upload_progress?: number
  processing_progress?: number
  error_message?: string
  metadata: DocumentMetadata
  created_at: string
  updated_at: string
}

export interface DocumentMetadata {
  page_count?: number
  word_count?: number
  language?: string
  author?: string
  subject?: string
  keywords?: string[]
  duration?: number // for audio/video files
  resolution?: string // for video files
  bitrate?: number // for audio files
  format_info?: Record<string, any>
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  metadata: ChunkMetadata
  embedding?: number[]
  created_at: string
}

export interface ChunkMetadata {
  page_number?: number
  start_time?: number
  end_time?: number
  speaker?: string
  confidence?: number
  word_count: number
  character_count: number
}

export interface Folder {
  id: string
  user_id: string
  parent_id?: string
  name: string
  description?: string
  color?: string
  icon?: string
  document_count: number
  created_at: string
  updated_at: string
}

// Summary related types
export interface Summary {
  id: string
  user_id: string
  document_id: string
  title: string
  content: string
  summary_type: SummaryType
  language: string
  word_count: number
  key_points: string[]
  tags: string[]
  metadata: SummaryMetadata
  created_at: string
  updated_at: string
}

export interface SummaryMetadata {
  model_used: string
  processing_time: number
  confidence_score?: number
  source_chunks: string[]
  generation_settings: Record<string, any>
}

// Video summary types
export interface VideoSummary {
  id: string
  user_id: string
  document_id: string
  title: string
  summary: string
  summary_type: SummaryType
  language: string
  duration: number
  transcript?: string
  key_moments: KeyMoment[]
  chapters: VideoChapter[]
  metadata: VideoMetadata
  created_at: string
  updated_at: string
}

export interface KeyMoment {
  id: string
  timestamp: number
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
  thumbnail_url?: string
}

export interface VideoChapter {
  id: string
  start_time: number
  end_time: number
  title: string
  summary: string
  key_points: string[]
}

export interface VideoMetadata {
  resolution: string
  fps: number
  bitrate: number
  codec: string
  file_size: number
  processing_settings: VideoProcessingSettings
}

export interface VideoProcessingSettings {
  chunk_size: number
  include_timestamps: boolean
  extract_key_moments: boolean
  generate_transcript: boolean
  model_used: string
}

// Audio summary types
export interface AudioSummary {
  id: string
  user_id: string
  document_id: string
  title: string
  summary: string
  summary_type: SummaryType
  audio_type: AudioType
  language: string
  duration: number
  transcript?: string
  speakers: Speaker[]
  chapters: AudioChapter[]
  metadata: AudioMetadata
  created_at: string
  updated_at: string
}

export interface Speaker {
  id: string
  name: string
  segments: SpeakerSegment[]
  total_speaking_time: number
}

export interface SpeakerSegment {
  start_time: number
  end_time: number
  text: string
  confidence: number
}

export interface AudioChapter {
  id: string
  start_time: number
  end_time: number
  title: string
  summary: string
  speaker_id?: string
  key_points: string[]
}

export interface AudioMetadata {
  bitrate: number
  sample_rate: number
  channels: number
  codec: string
  file_size: number
  processing_settings: AudioProcessingSettings
}

export interface AudioProcessingSettings {
  include_timestamps: boolean
  generate_transcript: boolean
  identify_speakers: boolean
  model_used: string
  language?: string
  summaryType?: 'brief' | 'detailed' | 'bullet-points'
  audioType?: 'podcast' | 'lecture' | 'meeting' | 'interview' | 'general'
  includeTimestamps?: boolean
  speakerIdentification?: boolean
}

export interface AudioFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  duration?: number
  transcript?: string
}

export interface AudioProcessRequest {
  file: File
  folderId?: string
  userId: string
  language?: string
  summaryType?: string
  audioType?: string
}

export interface AudioProcessResponse {
  success: boolean
  document: {
    id: string
    title: string
    fileName: string
    fileType: string
    fileSize: number
    language: string
    processingStatus: DocumentStatus
    wordCount: number
    characterCount: number
    createdAt: string
    updatedAt: string
  }
  transcript: string
  summary?: {
    id: string
    documentId: string
    summaryType: string
    content: string
    keyPoints: string[]
    language: string
    wordCount: number
    processingStatus: DocumentStatus
    createdAt: string
    updatedAt: string
  }
  chunksCreated: number
  speakers?: string[]
  duration: number | null
}

// Notes and flashcards types
export interface Note {
  id: string
  user_id: string
  document_id: string
  title: string
  content: string
  note_type: NoteType
  language: string
  tags: string[]
  is_favorite: boolean
  metadata: NoteMetadata
  created_at: string
  updated_at: string
}

export interface NoteMetadata {
  word_count: number
  source_chunks: string[]
  generation_settings: Record<string, any>
  formatting: NoteFormatting
}

export interface NoteFormatting {
  font_size: number
  font_family: string
  line_height: number
  margin: number
  include_images: boolean
  include_charts: boolean
}

export interface Flashcard {
  id: string
  user_id: string
  document_id: string
  question: string
  answer: string
  difficulty: FlashcardDifficulty
  tags: string[]
  times_reviewed: number
  times_correct: number
  last_reviewed?: string
  next_review?: string
  interval_days: number
  ease_factor: number
  is_favorite: boolean
  metadata: FlashcardMetadata
  created_at: string
  updated_at: string
}

export interface FlashcardMetadata {
  source_chunk: string
  generation_settings: Record<string, any>
  image_url?: string
  audio_url?: string
}

export interface StudySession {
  id: string
  user_id: string
  flashcard_ids: string[]
  session_type: 'review' | 'learn' | 'test'
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  current_card_index: number
  correct_answers: number
  incorrect_answers: number
  time_limit?: number
  time_spent: number
  settings: StudySessionSettings
  started_at: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface StudySessionSettings {
  shuffle_cards: boolean
  show_hints: boolean
  auto_advance: boolean
  time_per_card?: number
}

// Analysis types
export interface Analysis {
  id: string
  user_id: string
  document_ids: string[]
  title: string
  description?: string
  analysis_type: AnalysisType
  results: AnalysisResults
  metadata: AnalysisMetadata
  created_at: string
  updated_at: string
}

export interface AnalysisResults {
  summary: string
  key_findings: string[]
  comparisons?: ComparisonResult[]
  trends?: TrendResult[]
  gaps?: GapResult[]
  themes?: ThemeResult[]
  recommendations: string[]
}

export interface ComparisonResult {
  aspect: string
  documents: DocumentComparison[]
  similarity_score: number
}

export interface DocumentComparison {
  document_id: string
  document_title: string
  key_points: string[]
  unique_aspects: string[]
}

export interface TrendResult {
  trend_name: string
  description: string
  confidence: number
  supporting_evidence: string[]
}

export interface GapResult {
  gap_type: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommendations: string[]
}

export interface ThemeResult {
  theme_name: string
  description: string
  frequency: number
  related_documents: string[]
}

export interface AnalysisMetadata {
  processing_time: number
  model_used: string
  confidence_score: number
  settings: AnalysisSettings
}

export interface AnalysisSettings {
  include_similarities: boolean
  include_differences: boolean
  min_confidence: number
  max_results: number
}

// Export types
export interface ExportJob {
  id: string
  user_id: string
  title: string
  description?: string
  export_type: 'summary' | 'notes' | 'flashcards' | 'analysis' | 'document'
  format: ExportFormat
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  file_url?: string
  file_size?: number
  error_message?: string
  settings: ExportSettings
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface ExportSettings {
  include_metadata: boolean
  include_images: boolean
  include_timestamps: boolean
  page_size?: 'A4' | 'Letter' | 'Legal'
  orientation?: 'portrait' | 'landscape'
  font_size?: number
  margin?: number
  template?: string
}

// Processing status types
export interface ProcessingStatus {
  stage: ProcessingStage
  message: string
  progress?: number
  estimated_time?: number
}

export interface ProcessingError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

// Search and filter types
export interface SearchFilters {
  query?: string
  document_types?: string[]
  date_range?: {
    start: string
    end: string
  }
  tags?: string[]
  folders?: string[]
  status?: DocumentStatus[]
  language?: string[]
  file_size_range?: {
    min: number
    max: number
  }
}

export interface SortOptions {
  field: 'created_at' | 'updated_at' | 'title' | 'file_size' | 'status'
  direction: 'asc' | 'desc'
}

export interface PaginationOptions {
  page: number
  limit: number
  total?: number
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Streaming response types
export interface StreamingResponse {
  type: 'progress' | 'complete' | 'error'
  data?: any
  progress?: number
  stage?: ProcessingStage
  message?: string
  error?: string
}

// UI state types
export interface ViewMode {
  type: 'grid' | 'list' | 'table'
  size: 'small' | 'medium' | 'large'
}

export interface UIState {
  sidebarOpen: boolean
  viewMode: ViewMode
  selectedItems: string[]
  filters: SearchFilters
  sortOptions: SortOptions
  pagination: PaginationOptions
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Form types
export interface DocumentUploadForm {
  files: File[]
  folder_id?: string
  tags?: string[]
  auto_process?: boolean
}

export interface SummaryGenerationForm {
  document_id: string
  summary_type: SummaryType
  language: string
  max_length?: number
  include_key_points?: boolean
  custom_prompt?: string
}

export interface NotesGenerationForm {
  document_id: string
  note_type: NoteType
  language: string
  include_images?: boolean
  include_charts?: boolean
  max_length?: number
}

export interface FlashcardsGenerationForm {
  document_id: string
  difficulty: FlashcardDifficulty
  language: string
  count?: number
  include_images?: boolean
  tags?: string[]
}

export interface AnalysisCreationForm {
  document_ids: string[]
  analysis_type: AnalysisType
  title: string
  description?: string
  settings: Partial<AnalysisSettings>
}

export interface ExportCreationForm {
  item_ids: string[]
  export_type: ExportJob['export_type']
  format: ExportFormat
  title: string
  description?: string
  settings: Partial<ExportSettings>
}

// Hook return types
export interface UseDocumentsReturn {
  documents: Document[]
  folders: Folder[]
  loading: boolean
  error: string | null
  uploadDocuments: (form: DocumentUploadForm) => Promise<Document[]>
  getDocument: (id: string) => Promise<Document | null>
  updateDocument: (id: string, updates: Partial<Document>) => Promise<boolean>
  deleteDocument: (id: string) => Promise<boolean>
  moveDocument: (id: string, folderId?: string) => Promise<boolean>
  searchDocuments: (filters: SearchFilters, sort?: SortOptions, pagination?: PaginationOptions) => Promise<PaginatedResponse<Document>>
  createFolder: (name: string, parentId?: string) => Promise<Folder | null>
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<boolean>
  deleteFolder: (id: string) => Promise<boolean>
  clearError: () => void
}

// API Request/Response types for new routes
export interface MultiDocAnalysisRequest {
  documentIds: string[]
  analysisType?: AnalysisType
  language?: string
  userId: string
  title?: string
}

export interface MultiDocAnalysisResponse {
  success: boolean
  analysis: {
    id: string
    title: string
    analysisType: AnalysisType
    content: string
    insights: string[]
    connections: Array<{
      doc1: string
      doc2: string
      relationship: string
    }>
    documentIds: string[]
    language: string
    createdAt: string
    updatedAt: string
  }
}

export interface ExportRequest {
  summaryIds: string[]
  format?: ExportFormat
  userId: string
  includeMetadata?: boolean
  filename?: string
}

// Batch summarization types
export interface BatchSummaryRequest {
  documentIds: string[]
  options: {
    summaryType: SummaryType
    language?: string
    length?: 'short' | 'medium' | 'detailed'
    focusArea?: 'general' | 'key_points' | 'action_items' | 'technical'
  }
  customPrompt?: string
  // userId is now obtained from authentication, not from request body
}

export interface BatchSummaryResponse {
  success: boolean
  batchId: string
  summaries: Array<{
    documentId: string
    documentTitle: string
    summaryId: string
    content: string
    keyPoints: string[]
    relevantChunks?: Array<{
      chunkId: string
      content: string
      relevanceScore: number
    }>
    processingStatus: ProcessingStatus
    error?: string
  }>
  metadata: {
    totalDocuments: number
    successfulSummaries: number
    failedSummaries: number
    processingTime: number
    customPromptUsed: boolean
  }
}

export interface ExportResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  fileSize?: number
}

export interface HistoryRequest {
  userId: string
  limit?: number
  offset?: number
  type?: string
  language?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export interface HistoryItem {
  id: string
  title: string
  type: string
  content: string
  keyPoints: string[]
  language: string
  wordCount: number
  processingStatus: DocumentStatus
  documentId?: string
  documentTitle?: string
  documentType?: string
  createdAt: string
  updatedAt: string
  metadata: {
    analysisType?: string
    documentIds?: string[]
    documentTitles?: string[]
    connections?: Array<{
      doc1: string
      doc2: string
      relationship: string
    }>
    processingTime?: number
    modelUsed?: string
  }
}

export interface HistoryResponse {
  success: boolean
  items: HistoryItem[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  statistics: {
    totalSummaries: number
    byType: Record<string, number>
    byLanguage: Record<string, number>
    byMonth: Record<string, number>
  }
  filters: {
    type?: string | null
    language?: string | null
    search?: string | null
    dateFrom?: string | null
    dateTo?: string | null
    sortBy: string
    sortOrder: string
  }
}

// Generate Summary API types
export interface GenerateSummaryRequest {
  documentId: string
  summaryType: SummaryType
  language?: string
  customPrompt?: string
  userId: string
}

export interface GenerateSummaryResponse {
  success: boolean
  summary: {
    id: string
    documentId: string
    summaryType: SummaryType
    content: string
    keyPoints: string[]
    language: string
    wordCount: number
    processingStatus: DocumentStatus
    createdAt: string
    updatedAt: string
  }
}

// Notes and Flashcards API types
export interface NotesGenerationRequest {
  documentIds?: string[]
  summaryIds?: string[]
  notesType: NoteType
  language?: string
  subject?: string
  userId: string
}

export interface NotesGenerationResponse {
  success: boolean
  notes: {
    id: string
    title: string
    content: string
    notesType: NoteType
    language: string
    sourceDocumentIds: string[]
    metadata: any
    createdAt: string
    updatedAt: string
  }
}

export interface FlashcardsGenerationRequest {
  documentIds?: string[]
  summaryIds?: string[]
  difficulty: FlashcardDifficulty
  count?: number
  language?: string
  category?: string
  subject?: string
  userId: string
}

export interface FlashcardsGenerationResponse {
  success: boolean
  flashcards: Array<{
    id: string
    question: string
    answer: string
    difficulty: FlashcardDifficulty
    category?: string
    language: string
    sourceDocumentIds: string[]
    createdAt: string
    updatedAt: string
  }>
  count: number
}

export interface UseSummarizationReturn {
  summaries: Summary[]
  loading: boolean
  error: string | null
  generateSummary: (form: SummaryGenerationForm) => Promise<Summary | null>
  getSummary: (id: string) => Promise<Summary | null>
  updateSummary: (id: string, updates: Partial<Summary>) => Promise<boolean>
  deleteSummary: (id: string) => Promise<boolean>
  exportSummary: (id: string, format: ExportFormat) => Promise<string | null>
  clearError: () => void
}

export interface UseNotesReturn {
  notes: Note[]
  flashcards: Flashcard[]
  studySessions: StudySession[]
  loading: boolean
  error: string | null
  generateNotes: (form: NotesGenerationForm) => Promise<Note | null>
  generateFlashcards: (form: FlashcardsGenerationForm) => Promise<Flashcard[]>
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>
  deleteNote: (id: string) => Promise<boolean>
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => Promise<boolean>
  deleteFlashcard: (id: string) => Promise<boolean>
  startStudySession: (flashcardIds: string[], settings: Partial<StudySessionSettings>) => Promise<StudySession | null>
  updateStudySession: (id: string, updates: Partial<StudySession>) => Promise<boolean>
  endStudySession: (id: string) => Promise<boolean>
  answerFlashcard: (sessionId: string, flashcardId: string, correct: boolean, timeSpent: number) => Promise<boolean>
  exportNotes: (noteIds: string[], format: ExportFormat) => Promise<string | null>
  exportFlashcards: (flashcardIds: string[], format: ExportFormat) => Promise<string | null>
  clearError: () => void
}

export interface UseMediaProcessingReturn {
  videoSummaries: VideoSummary[]
  audioSummaries: AudioSummary[]
  processing: boolean
  progress: number
  status: ProcessingStatus | null
  error: string | null
  processVideo: (file: File, options: VideoProcessingSettings) => Promise<VideoSummary | null>
  processAudio: (file: File, options: AudioProcessingSettings) => Promise<AudioSummary | null>
  getVideoSummary: (id: string) => Promise<VideoSummary | null>
  getAudioSummary: (id: string) => Promise<AudioSummary | null>
  updateVideoSummary: (id: string, updates: Partial<VideoSummary>) => Promise<boolean>
  updateAudioSummary: (id: string, updates: Partial<AudioSummary>) => Promise<boolean>
  deleteVideoSummary: (id: string) => Promise<boolean>
  deleteAudioSummary: (id: string) => Promise<boolean>
  exportVideoSummary: (id: string, format: ExportFormat) => Promise<string | null>
  exportAudioSummary: (id: string, format: ExportFormat) => Promise<string | null>
  cancelProcessing: () => void
  clearError: () => void
}