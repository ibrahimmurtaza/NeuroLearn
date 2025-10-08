// Profile system type definitions

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  academic_field: string | null;
  study_goals: string | null;
  interests: string[];
  role: 'student' | 'tutor';
  created_at: string;
  updated_at: string;
}

export interface TutorProfile {
  id: string;
  user_id: string;
  experience_years: number | null;
  hourly_rate: number | null;
  availability: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TutorSubject {
  id: string;
  tutor_profile_id: string;
  subject_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  created_at: string;
}

export interface TutorProfileWithSubjects extends TutorProfile {
  subjects: Array<{
    id: string;
    name: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
}

export interface ProfileFormData {
  full_name: string;
  bio?: string;
  academic_field: string;
  study_goals: string;
  interests: string[];
  avatar_url?: string;
  role?: 'student' | 'tutor';
}

export interface TutorOnboardingFormData {
  first_name: string;
  last_name: string;
  experience_years: number;
  hourly_rate: number;
  availability: string;
  bio: string;
  education: string;
  certifications: string[];
  languages: string[];
  subjects: Array<{
    subject_id: string;
    proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
}

export interface InterestCategory {
  id: string;
  name: string;
  description: string | null;
  interests: string[];
  created_at: string;
}

export interface ProfileApiResponse {
  profile: Profile | null;
  exists: boolean;
}

export interface CreateProfileRequest {
  full_name: string;
  bio?: string;
  academic_field: string;
  study_goals: string;
  interests: string[];
  avatar_url?: string;
  role?: 'student' | 'tutor';
}

export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
  academic_field?: string;
  study_goals?: string;
  interests?: string[];
  avatar_url?: string;
  role?: 'student' | 'tutor';
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  formData: Partial<ProfileFormData>;
  isLoading: boolean;
  error: string | null;
}

// Form validation types
export interface ProfileValidationErrors {
  full_name?: string;
  academic_field?: string;
  study_goals?: string;
  interests?: string;
  bio?: string;
}

// API error response type
export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}

// Success response type
export interface ApiSuccess<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}