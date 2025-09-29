// Quiz Module Types
// Based on the specifications provided for the Quiz Module implementation

// Base types
export type QuestionType = 'mcq' | 'short_answer' | 'fill_blank' | 'tf' | 'numeric'
export type SourceType = 'pdf' | 'txt' | 'video' | 'audio' | 'md'
export type QuizMode = 'timed' | 'untimed'
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5
export type QuizStatus = 'draft' | 'active' | 'completed' | 'archived'
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned'
export type FlagCategory = 'incorrect_answer' | 'unclear_question' | 'technical_issue' | 'content_error' | 'other'
export type FlagStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type FlagPriority = 'low' | 'medium' | 'high' | 'critical'

// Document interface for quiz content
export interface QuizDocument {
  id: string
  title: string
  source_type: SourceType
  uploader_id: string
  language: string
  created_at: string
  updated_at?: string
  file_path?: string
  file_size?: number
  metadata?: DocumentMetadata
}

export interface DocumentMetadata {
  page_count?: number
  word_count?: number
  duration?: number // for audio/video files
  author?: string
  subject?: string
  keywords?: string[]
}

// Chunk interface for document processing
export interface QuizChunk {
  id: string
  doc_id: string
  text: string
  start_offset: number
  end_offset: number
  page?: number
  embedding_id?: string
  created_at: string
  metadata?: ChunkMetadata
}

export interface ChunkMetadata {
  word_count: number
  character_count: number
  confidence?: number
  processing_model?: string
}

// Evidence interface for question validation
export interface QuestionEvidence {
  chunk_id: string
  start: number
  end: number
  text_snippet: string
  relevance_score?: number
}

// Question interface
export interface QuizQuestion {
  id: string
  quiz_id: string
  type: QuestionType
  prompt: string
  options?: string[] // For MCQ questions
  correct_option_index?: number // For MCQ questions
  answer_text: string // Canonical answer
  evidence: QuestionEvidence[]
  difficulty: DifficultyLevel
  source_doc_ids: string[]
  generated_by: string // Model version used
  verified: boolean
  verification_reason?: string
  flag_count?: number
  created_at: string
  updated_at?: string
  metadata?: QuestionMetadata
}

export interface QuestionMetadata {
  generation_time?: number
  confidence_score?: number
  review_notes?: string
  tags?: string[]
  // Added concept metadata for uniqueness tracking
  concept_name?: string
  concept_facet?: string
}

// Quiz interface
export interface Quiz {
  id: string
  user_id: string
  title: string
  description?: string
  document_ids: string[]
  questions: QuizQuestion[]
  mode: QuizMode
  time_limit?: number // in minutes
  status: QuizStatus
  settings: QuizSettings
  created_at: string
  updated_at?: string
  metadata?: QuizMetadata
}

export interface QuizSettings {
  shuffle_questions: boolean
  shuffle_options: boolean
  show_feedback: boolean
  allow_review: boolean
  max_attempts?: number
  passing_score?: number
}

export interface QuizMetadata {
  total_questions: number
  difficulty_distribution: Record<DifficultyLevel, number>
  estimated_duration: number // in minutes
  topics?: string[]
  generation_settings?: GenerationSettings
}

// Quiz attempt interface
export interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  answers: QuizAnswer[]
  score: number
  percentage: number
  status: AttemptStatus
  started_at: string
  completed_at?: string
  time_taken?: number // in milliseconds
  metadata?: AttemptMetadata
}

export interface QuizAnswer {
  question_id: string
  selected?: number // For MCQ - option index
  answer_text?: string // For text-based questions
  is_correct: boolean
  time_taken_ms: number
  confidence?: number
}

export interface AttemptMetadata {
  device_info?: string
  browser_info?: string
  interruptions?: number
  review_time?: number
}

// User statistics for adaptive difficulty
export interface QuizUserStats {
  user_id: string
  topic?: string
  skill_theta: number // Ability score
  total_attempts: number
  correct_answers: number
  average_score: number
  last_updated: string
  performance_trend: 'improving' | 'stable' | 'declining'
}

// Question flagging interface
export interface QuestionFlag {
  id: string
  question_id: string
  user_id: string
  category: FlagCategory
  reason: string
  description?: string
  status: FlagStatus
  priority: FlagPriority
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  resolution_notes?: string
}

// Generation preferences interface
export interface QuizGenerationPreferences {
  num_questions: number
  question_types: QuestionType[]
  difficulty_range: {
    min: DifficultyLevel
    max: DifficultyLevel
  }
  focus_topics?: string[]
  exclude_topics?: string[]
  time_limit?: number
  mode: QuizMode
}

// Generation settings for LLM
export interface GenerationSettings {
  model: string
  temperature: number
  max_tokens: number
  chunk_overlap: number
  min_evidence_length: number
  max_evidence_length: number
  verification_enabled: boolean
}

// API Request/Response interfaces
export interface QuizGenerationRequest {
  user_id: string
  doc_ids: string[]
  preferences: QuizGenerationPreferences
  custom_prompt?: string
}

export interface QuizGenerationResponse {
  success: boolean
  quiz_id: string
  questions: QuizQuestion[]
  metadata: {
    total_generated: number
    verified_count: number
    failed_verification: number
    processing_time: number
  }
  error?: string
}

export interface QuizRetrievalResponse {
  success: boolean
  quiz: Omit<Quiz, 'questions'> & {
    questions: Omit<QuizQuestion, 'answer_text' | 'correct_option_index'>[]
  }
  error?: string
}

export interface QuizSubmissionRequest {
  user_id: string
  quiz_id: string
  answers: Omit<QuizAnswer, 'is_correct'>[]
  time_taken: number
}

export interface QuizSubmissionResponse {
  success: boolean
  attempt_id: string
  score: number
  percentage: number
  feedback: QuestionFeedback[]
  adaptive_recommendations?: AdaptiveRecommendation[]
  error?: string
}

export interface QuestionFeedback {
  question_id: string
  is_correct: boolean
  correct_answer: string
  explanation: string
  evidence: QuestionEvidence[]
  time_taken: number
}

export interface AdaptiveRecommendation {
  type: 'difficulty_adjustment' | 'topic_focus' | 'review_suggestion'
  message: string
  suggested_difficulty?: DifficultyLevel
  suggested_topics?: string[]
}

export interface QuizFlagRequest {
  user_id: string
  question_id: string
  category: FlagCategory
  reason: string
  description?: string
}

export interface QuizFlagResponse {
  success: boolean
  flag_id: string
  message: string
  error?: string
}

// Verification result interface
export interface VerificationResult {
  is_valid: boolean
  issues: string[]
  confidence_score: number
  evidence_validation: {
    has_supporting_evidence: boolean
    evidence_quality: 'high' | 'medium' | 'low'
  }
  option_validation?: {
    correct_option_valid: boolean
    distractors_valid: boolean
    option_count_valid: boolean
  }
}

// Processing status interface
export interface QuizProcessingStatus {
  stage: 'uploading' | 'chunking' | 'embedding' | 'generating' | 'verifying' | 'completed' | 'error'
  progress: number
  message: string
  estimated_time?: number
  current_question?: number
  total_questions?: number
}

// Adaptive engine interfaces
export interface AdaptiveEngine {
  calculateDifficulty(userStats: QuizUserStats, topicPerformance?: Record<string, number>): DifficultyLevel
  updateUserStats(userId: string, attempt: QuizAttempt): Promise<QuizUserStats>
  getRecommendations(userId: string, quizId: string): Promise<AdaptiveRecommendation[]>
}

// Hook return types
export interface UseQuizReturn {
  quizzes: Quiz[]
  currentQuiz: Quiz | null
  currentAttempt: QuizAttempt | null
  loading: boolean
  error: string | null
  generateQuiz: (request: QuizGenerationRequest) => Promise<Quiz | null>
  getQuiz: (id: string) => Promise<Quiz | null>
  submitQuiz: (request: QuizSubmissionRequest) => Promise<QuizAttempt | null>
  flagQuestion: (request: QuizFlagRequest) => Promise<boolean>
  getUserStats: (userId: string) => Promise<QuizUserStats | null>
  getAttemptHistory: (userId: string, quizId?: string) => Promise<QuizAttempt[]>
  clearError: () => void
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Export all types for easy importing
export type {
  QuizDocument as Document,
  QuizChunk as Chunk,
  QuizQuestion as Question,
  QuizAttempt as Attempt
}