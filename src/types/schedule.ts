// Schedule and Task Management Types
// TypeScript interfaces for the consolidated AI Plan Generator service

// Base types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type TaskCategory = 'work' | 'personal' | 'study' | 'health' | 'finance' | 'social' | 'creative' | 'maintenance' | 'other'
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'very_complex'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type TimelineType = 'flexible' | 'fixed' | 'urgent' | 'long_term'
export type RecommendedApproach = 'systematic' | 'iterative' | 'creative' | 'analytical' | 'collaborative'

// Core interfaces
export interface Task {
  id: string
  user_id: string
  goal_id?: string
  parent_task_id?: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  category: TaskCategory
  estimated_duration?: number // in minutes
  actual_duration?: number // in minutes
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  metadata?: TaskMetadata
}

export interface TaskMetadata {
  complexity?: TaskComplexity
  tags?: string[]
  guides?: string[]
  criteria?: string[]
  tips?: string[]
  resources?: string[]
  complexity_score?: number
  recommended_approach?: string
  auto_generated?: boolean
  ai_generated_metadata?: AIGeneratedMetadata
}

export interface AIGeneratedMetadata {
  model_used: string
  generation_timestamp: string
  confidence_score?: number
  prompt_context?: string
  processing_time?: number
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  status: GoalStatus
  priority: TaskPriority
  category: TaskCategory
  target_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  metadata?: GoalMetadata
}

export interface GoalMetadata {
  complexity?: TaskComplexity
  estimated_tasks?: number
  progress_percentage?: number
  milestones?: string[]
  success_criteria?: string[]
  resources_needed?: string[]
  potential_obstacles?: string[]
}

// Subtask generation interfaces
export interface SubtaskGenerationRequest {
  task_title: string
  task_description?: string
  priority: TaskPriority
  category: TaskCategory
  due_date?: string
  goal_context?: string
  user_preferences?: UserPreferences
}

export interface SubtaskGenerationResponse {
  subtasks: GeneratedSubtask[]
  metadata: GenerationMetadata
}

export interface GeneratedSubtask {
  title: string
  description: string
  priority: TaskPriority
  estimated_duration: number
  guides: string[]
  criteria: string[]
  tips: string[]
  resources: string[]
  complexity_score: number
  recommended_approach: string
  order_index: number
}

export interface GenerationMetadata {
  total_generated: number
  processing_time: number
  model_used: string
  confidence_score: number
  generation_timestamp: string
  context_used: GenerationContext
}

export interface GenerationContext {
  complexity_context: string
  category_context: string
  priority_context: string
  timeline_context: string
  goal_context?: string
}

// User preferences and settings
export interface UserPreferences {
  default_priority: TaskPriority
  preferred_categories: TaskCategory[]
  work_hours?: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
  break_preferences?: {
    short_break_duration: number // minutes
    long_break_duration: number // minutes
    breaks_per_session: number
  }
  notification_settings?: NotificationSettings
  ai_assistance_level: 'minimal' | 'moderate' | 'extensive'
}

export interface NotificationSettings {
  task_reminders: boolean
  deadline_alerts: boolean
  progress_updates: boolean
  daily_summary: boolean
  email_notifications: boolean
  push_notifications: boolean
}

// Planning and scheduling interfaces
export interface TaskPlan {
  id: string
  user_id: string
  title: string
  description?: string
  tasks: Task[]
  timeline: PlanTimeline
  status: 'draft' | 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export interface PlanTimeline {
  start_date: string
  end_date?: string
  milestones: Milestone[]
  estimated_total_duration: number
  buffer_time: number // percentage
}

export interface Milestone {
  id: string
  title: string
  description?: string
  target_date: string
  completed: boolean
  task_ids: string[]
}

// Analytics and reporting interfaces
export interface TaskAnalytics {
  user_id: string
  period: AnalyticsPeriod
  metrics: TaskMetrics
  trends: TaskTrends
  insights: string[]
  generated_at: string
}

export interface AnalyticsPeriod {
  start_date: string
  end_date: string
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

export interface TaskMetrics {
  total_tasks: number
  completed_tasks: number
  completion_rate: number
  average_completion_time: number
  overdue_tasks: number
  tasks_by_priority: Record<TaskPriority, number>
  tasks_by_category: Record<TaskCategory, number>
  productivity_score: number
}

export interface TaskTrends {
  completion_trend: TrendData[]
  productivity_trend: TrendData[]
  category_distribution_trend: CategoryTrendData[]
  priority_distribution_trend: PriorityTrendData[]
}

export interface TrendData {
  date: string
  value: number
}

export interface CategoryTrendData {
  date: string
  categories: Record<TaskCategory, number>
}

export interface PriorityTrendData {
  date: string
  priorities: Record<TaskPriority, number>
}

// API request/response interfaces
export interface CreateTaskRequest {
  title: string
  description?: string
  priority: TaskPriority
  category: TaskCategory
  due_date?: string
  goal_id?: string
  parent_task_id?: string
  generate_subtasks?: boolean
  goal_context?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  category?: TaskCategory
  due_date?: string
  estimated_duration?: number
  actual_duration?: number
}

export interface TaskListResponse {
  tasks: Task[]
  pagination?: PaginationInfo
  filters_applied?: TaskFilters
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  category?: TaskCategory[]
  due_date_range?: {
    start: string
    end: string
  }
  search_query?: string
  goal_id?: string
  parent_task_id?: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
}

// Notification interfaces
export interface TaskNotification {
  id: string
  user_id: string
  task_id: string
  type: NotificationType
  title: string
  message: string
  scheduled_for: string
  sent_at?: string
  read_at?: string
  created_at: string
}

export type NotificationType = 
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_completed'
  | 'goal_progress'
  | 'daily_summary'
  | 'weekly_review'

// Error handling interfaces
export interface TaskError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

export interface ValidationError extends TaskError {
  field: string
  value: any
  constraint: string
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type TaskWithSubtasks = Task & {
  subtasks: Task[]
}

export type GoalWithTasks = Goal & {
  tasks: Task[]
  progress: {
    completed_tasks: number
    total_tasks: number
    percentage: number
  }
}

// Constants
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']
export const TASK_CATEGORIES: TaskCategory[] = ['work', 'personal', 'study', 'health', 'finance', 'social', 'creative', 'maintenance', 'other']
export const TASK_COMPLEXITIES: TaskComplexity[] = ['simple', 'moderate', 'complex', 'very_complex']

// Default values
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium'
export const DEFAULT_TASK_STATUS: TaskStatus = 'pending'
export const DEFAULT_TASK_CATEGORY: TaskCategory = 'other'
export const DEFAULT_ESTIMATED_DURATION = 60 // minutes
export const MAX_SUBTASKS_PER_TASK = 10
export const MIN_TASK_TITLE_LENGTH = 3
export const MAX_TASK_TITLE_LENGTH = 200
export const MAX_TASK_DESCRIPTION_LENGTH = 1000