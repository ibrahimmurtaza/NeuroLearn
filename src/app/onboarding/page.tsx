'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/Progress'
import { Separator } from '@/components/ui/Separator'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ProfileFormData, TutorOnboardingFormData, Subject, InterestCategory, OnboardingStep } from '@/types/profile'
import { ChevronLeft, ChevronRight, User, BookOpen, Heart, Camera, Check, GraduationCap, DollarSign, Clock } from 'lucide-react'

const STUDENT_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tell us about yourself',
    component: 'BasicInfoForm',
    isCompleted: false,
    isActive: true
  },
  {
    id: 'academic-info',
    title: 'Academic Background',
    description: 'Your field of study and goals',
    component: 'AcademicInfoForm',
    isCompleted: false,
    isActive: false
  },
  {
    id: 'interests',
    title: 'Learning Interests',
    description: 'What would you like to learn?',
    component: 'InterestsForm',
    isCompleted: false,
    isActive: false
  },
  {
    id: 'avatar',
    title: 'Profile Picture',
    description: 'Add a profile picture (optional)',
    component: 'AvatarForm',
    isCompleted: false,
    isActive: false
  }
]

const TUTOR_ONBOARDING_STEPS = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tell us your name',
    component: 'BasicInfoForm'
  },
  {
    id: 'experience',
    title: 'Teaching Experience',
    description: 'Tell us about your teaching background',
    component: 'ExperienceForm'
  },
  {
    id: 'subjects',
    title: 'Subject Specializations',
    description: 'Select the subjects you can teach',
    component: 'SubjectsForm'
  },
  {
    id: 'rates',
    title: 'Rates & Availability',
    description: 'Set your hourly rate and availability',
    component: 'RatesForm'
  },
  {
    id: 'profile',
    title: 'Complete Profile',
    description: 'Add additional details about yourself',
    component: 'ProfileForm'
  }
]

// Student Onboarding Component
function StudentOnboarding() {
  const { user, session, refreshProfile } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState(STUDENT_ONBOARDING_STEPS)
  const [formData, setFormData] = useState<Partial<ProfileFormData>>({
    interests: []
  })
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Generate storage keys for both localStorage and sessionStorage
  const getStorageKey = (suffix: string) => {
    return user?.id ? `onboarding_student_${user.id}_${suffix}` : null
  }

  // Enhanced save function that saves to both localStorage and sessionStorage
  const saveDataImmediately = () => {
    if (!user?.id) return

    setAutoSaveStatus('saving')

    try {
      const formDataKey = getStorageKey('formData')
      const interestsKey = getStorageKey('interests')
      const stepKey = getStorageKey('step')

      // Save to both localStorage (persistent) and sessionStorage (tab-specific)
      if (formDataKey && Object.keys(formData).length > 1) {
        const formDataJson = JSON.stringify(formData)
        localStorage.setItem(formDataKey, formDataJson)
        sessionStorage.setItem(formDataKey, formDataJson)
      }

      if (interestsKey && selectedInterests.length > 0) {
        const interestsJson = JSON.stringify(selectedInterests)
        localStorage.setItem(interestsKey, interestsJson)
        sessionStorage.setItem(interestsKey, interestsJson)
      }

      if (stepKey) {
        const stepValue = currentStep.toString()
        localStorage.setItem(stepKey, stepValue)
        sessionStorage.setItem(stepKey, stepValue)
      }

      setLastSaved(new Date())
      setAutoSaveStatus('saved')
      
      // Reset status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save form data:', error)
      setAutoSaveStatus('idle')
    }
  }

  // Enhanced load function that checks both sessionStorage and localStorage
  const loadSavedData = () => {
    if (!user?.id) return

    const formDataKey = getStorageKey('formData')
    const interestsKey = getStorageKey('interests')
    const stepKey = getStorageKey('step')

    // Priority: sessionStorage first (more recent), then localStorage (fallback)
    const getSavedData = (key: string) => {
      return sessionStorage.getItem(key) || localStorage.getItem(key)
    }

    const savedFormData = getSavedData(formDataKey)
    const savedInterests = getSavedData(interestsKey)
    const savedStep = getSavedData(stepKey)

    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData))
      } catch (error) {
        console.error('Failed to parse saved form data:', error)
      }
    }

    if (savedInterests) {
      try {
        setSelectedInterests(JSON.parse(savedInterests))
      } catch (error) {
        console.error('Failed to parse saved interests:', error)
      }
    }

    if (savedStep) {
      try {
        const step = parseInt(savedStep)
        if (step >= 0 && step < STUDENT_ONBOARDING_STEPS.length) {
          setCurrentStep(step)
        }
      } catch (error) {
        console.error('Failed to parse saved step:', error)
      }
    }
  }

  // Clear stored data from both storages after successful submission
  const clearStoredData = () => {
    if (!user?.id) return

    const keys = ['formData', 'interests', 'step']
    keys.forEach(suffix => {
      const key = getStorageKey(suffix)
      if (key) {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      }
    })
  }

  // Load saved state from storage on mount
  useEffect(() => {
    loadSavedData()
  }, [user?.id])

  // Save form data to both storages whenever it changes
  useEffect(() => {
    if (!user?.id) return
    const key = getStorageKey('formData')
    if (key && Object.keys(formData).length > 1) {
      const formDataJson = JSON.stringify(formData)
      localStorage.setItem(key, formDataJson)
      sessionStorage.setItem(key, formDataJson)
      setLastSaved(new Date())
    }
  }, [formData, user?.id])

  // Save selected interests to both storages whenever they change
  useEffect(() => {
    if (!user?.id) return
    const key = getStorageKey('interests')
    if (key && selectedInterests.length > 0) {
      const interestsJson = JSON.stringify(selectedInterests)
      localStorage.setItem(key, interestsJson)
      sessionStorage.setItem(key, interestsJson)
      setLastSaved(new Date())
    }
  }, [selectedInterests, user?.id])

  // Save current step to both storages whenever it changes
  useEffect(() => {
    if (!user?.id) return
    const key = getStorageKey('step')
    if (key) {
      const stepValue = currentStep.toString()
      localStorage.setItem(key, stepValue)
      sessionStorage.setItem(key, stepValue)
      setLastSaved(new Date())
    }
  }, [currentStep, user?.id])

  // Enhanced persistence: beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDataImmediately()
      // Optional: Show confirmation dialog for unsaved changes
      if (Object.keys(formData).length > 1 || selectedInterests.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, selectedInterests])

  // Enhanced Page Visibility API for better application switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save immediately when switching away from the application
        saveDataImmediately()
      } else {
        // Reload data when returning to the application (in case of external changes)
        loadSavedData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Enhanced focus/blur event handlers for application switching
  useEffect(() => {
    const handleWindowBlur = () => {
      // Save data when losing focus (switching applications)
      saveDataImmediately()
    }

    const handleWindowFocus = () => {
      // Reload data when gaining focus (returning to application)
      loadSavedData()
    }

    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  // Enhanced persistence: periodic auto-save
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(formData).length > 1 || selectedInterests.length > 0) {
        saveDataImmediately()
      }
    }, 30000) // Save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [formData, selectedInterests])

  // Fetch interest categories
  useEffect(() => {
    const fetchInterestCategories = async () => {
      try {
        const response = await fetch('/api/interests/categories')
        if (response.ok) {
          const data = await response.json()
          setInterestCategories(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch interest categories:', error)
      }
    }

    fetchInterestCategories()
  }, [])

  const updateFormData = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(formData.first_name && formData.last_name && formData.date_of_birth)
      case 1: // Academic
        return !!(formData.school && formData.grade_level && formData.academic_field)
      case 2: // Interests
        return !!(selectedInterests && selectedInterests.length > 0)
      case 3: // Avatar (optional)
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (!validateCurrentStep()) {
      setError('Please fill in all required fields')
      return
    }

    setError(null)
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const createProfile = async () => {
    if (!session?.access_token) {
      setError('Authentication required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const profileData = {
        // Map form fields to database columns
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        dob: formData.date_of_birth,
        school: formData.school,
        grade_level: formData.grade_level,
        academic_field: formData.academic_field,
        study_goals: formData.learning_goals?.trim() || undefined,
        interests: selectedInterests,
        bio: formData.bio?.trim() || undefined,
        avatar_url: formData.avatar_url
      }

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (response.ok) {
        // Clear stored data after successful profile creation
        clearStoredData()
        // Refresh the profile in AuthContext before redirecting
        await refreshProfile()
        router.push('/dashboard')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create profile')
      }
    } catch (error) {
      console.error('Profile creation error:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    )
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to NeuroLearn!</h1>
          <p className="text-gray-600">Let's set up your learning profile to get started</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
              {/* Auto-save status indicator */}
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="w-3 h-3" />
                  Saved
                </div>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                index <= currentStep 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-gray-200 border-gray-300 text-gray-500'
              }`}>
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className="text-xs text-gray-600 mt-1 text-center max-w-20">
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Main Form Card */}
        <Card className="p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep].description}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Step Content */}
          <div className="space-y-6">
            {/* Basic Information Step */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Personal Details</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      placeholder="Enter your first name"
                      value={formData.first_name || ''}
                      onChange={(e) => updateFormData('first_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      placeholder="Enter your last name"
                      value={formData.last_name || ''}
                      onChange={(e) => updateFormData('last_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => updateFormData('date_of_birth', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Tell us about yourself</Label>
                  <Textarea
                    id="bio"
                    placeholder="Share a bit about your interests, hobbies, or what motivates you to learn..."
                    value={formData.bio || ''}
                    onChange={(e) => updateFormData('bio', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Academic Background Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Academic Information</span>
                </div>

                <div>
                  <Label htmlFor="school">School/Institution *</Label>
                  <Input
                    id="school"
                    placeholder="Enter your school or institution name"
                    value={formData.school || ''}
                    onChange={(e) => updateFormData('school', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="grade_level">Grade Level *</Label>
                  <Input
                    id="grade_level"
                    placeholder="e.g., 10th Grade, Freshman, Senior"
                    value={formData.grade_level || ''}
                    onChange={(e) => updateFormData('grade_level', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="academic_field">Field of Study *</Label>
                  <Input
                    id="academic_field"
                    placeholder="e.g., Computer Science, Mathematics, Biology"
                    value={formData.academic_field || ''}
                    onChange={(e) => updateFormData('academic_field', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="learning_goals">Learning Goals</Label>
                  <Textarea
                    id="learning_goals"
                    placeholder="What do you hope to achieve through learning? Any specific goals or aspirations?"
                    value={formData.learning_goals || ''}
                    onChange={(e) => updateFormData('learning_goals', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Learning Interests Step */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Learning Interests</span>
                </div>

                <div>
                  <Label>Select your learning interests *</Label>
                  <p className="text-sm text-gray-600 mt-1 mb-4">
                    Choose the subjects and topics you're interested in learning about. You can select multiple interests across different categories.
                  </p>
                  
                  <div className="mt-4 space-y-6">
                    {interestCategories.map((category) => (
                      <div key={category.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {category.interests.map((interest) => (
                            <button
                              key={interest}
                              type="button"
                              className={`px-3 py-2 text-sm font-medium rounded-full border transition-all duration-200 hover:scale-105 ${
                                selectedInterests.includes(interest)
                                  ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                              }`}
                              onClick={() => toggleInterest(interest)}
                            >
                              {interest}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedInterests.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-blue-900 font-medium">
                        Selected Interests ({selectedInterests.length}):
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedInterests.map((interest) => (
                          <Badge 
                            key={interest} 
                            className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1"
                          >
                            {interest}
                            <button
                              type="button"
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              onClick={() => toggleInterest(interest)}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedInterests.length === 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        Please select at least one learning interest to continue.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Avatar Step */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Profile Picture</span>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    {formData.avatar_url ? (
                      <img
                        src={formData.avatar_url}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="avatar_url">Profile Picture URL (optional)</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      placeholder="https://example.com/your-photo.jpg"
                      value={formData.avatar_url || ''}
                      onChange={(e) => updateFormData('avatar_url', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-2">
                    You can add a profile picture now or skip this step and add one later.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={createProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// Teacher Onboarding Component
function TeacherOnboarding() {
  const { user, session, refreshProfile } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [formData, setFormData] = useState<TutorOnboardingFormData>({
    first_name: '',
    last_name: '',
    experience_years: 0,
    subjects: [],
    hourly_rate: 0,
    bio: '',
    availability: '',
    education: '',
    certifications: [],
    languages: []
  })
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Generate localStorage key based on user ID
  const getStorageKey = (suffix: string) => {
    return user?.id ? `onboarding_tutor_${user.id}_${suffix}` : null
  }

  // Enhanced save function that saves to both localStorage and sessionStorage
  const saveDataImmediately = () => {
    if (!user?.id) return

    setAutoSaveStatus('saving')

    try {
      const formDataKey = getStorageKey('formData')
      const stepKey = getStorageKey('step')

      // Save to both localStorage (persistent) and sessionStorage (tab-specific)
      if (formDataKey && (formData.experience_years > 0 || formData.subjects.length > 0 || formData.hourly_rate > 0)) {
        const formDataJson = JSON.stringify(formData)
        localStorage.setItem(formDataKey, formDataJson)
        sessionStorage.setItem(formDataKey, formDataJson)
      }

      if (stepKey) {
        const stepValue = currentStep.toString()
        localStorage.setItem(stepKey, stepValue)
        sessionStorage.setItem(stepKey, stepValue)
      }

      setLastSaved(new Date())
      setAutoSaveStatus('saved')
      
      // Reset status after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save tutor form data:', error)
      setAutoSaveStatus('idle')
    }
  }

  // Enhanced load function that checks both sessionStorage and localStorage
  const loadSavedData = () => {
    if (!user?.id) return

    const formDataKey = getStorageKey('formData')
    const stepKey = getStorageKey('step')

    // Priority: sessionStorage first (more recent), then localStorage (fallback)
    const getSavedData = (key: string) => {
      return sessionStorage.getItem(key) || localStorage.getItem(key)
    }

    const savedFormData = getSavedData(formDataKey)
    const savedStep = getSavedData(stepKey)

    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData))
      } catch (error) {
        console.error('Failed to parse saved tutor form data:', error)
      }
    }

    if (savedStep) {
      try {
        const step = parseInt(savedStep)
        if (step >= 0 && step < TUTOR_ONBOARDING_STEPS.length) {
          setCurrentStep(step)
        }
      } catch (error) {
        console.error('Failed to parse saved tutor step:', error)
      }
    }
  }

  // Clear stored data from both storages after successful submission
  const clearStoredData = () => {
    if (!user?.id) return
    const keys = ['formData', 'step']
    keys.forEach(suffix => {
      const key = getStorageKey(suffix)
      if (key) {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      }
    })
  }

  // Load saved state from storage on mount
  useEffect(() => {
    loadSavedData()
  }, [user?.id])

  // Save form data to both storages whenever it changes
  useEffect(() => {
    if (!user?.id) return
    const key = getStorageKey('formData')
    if (key && (formData.experience_years > 0 || formData.subjects.length > 0 || formData.hourly_rate > 0)) {
      const formDataJson = JSON.stringify(formData)
      localStorage.setItem(key, formDataJson)
      sessionStorage.setItem(key, formDataJson)
      setLastSaved(new Date())
    }
  }, [formData, user?.id])

  // Save current step to both storages whenever it changes
  useEffect(() => {
    if (!user?.id) return
    const key = getStorageKey('step')
    if (key) {
      const stepValue = currentStep.toString()
      localStorage.setItem(key, stepValue)
      sessionStorage.setItem(key, stepValue)
      setLastSaved(new Date())
    }
  }, [currentStep, user?.id])

  // Enhanced persistence: beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDataImmediately()
      // Optional: Show confirmation dialog for unsaved changes
      if (formData.experience_years > 0 || formData.subjects.length > 0 || formData.hourly_rate > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData])

  // Enhanced Page Visibility API for better application switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save immediately when switching away from the application
        saveDataImmediately()
      } else {
        // Reload data when returning to the application (in case of external changes)
        loadSavedData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Enhanced focus/blur event handlers for application switching
  useEffect(() => {
    const handleWindowBlur = () => {
      // Save data when losing focus (switching applications)
      saveDataImmediately()
    }

    const handleWindowFocus = () => {
      // Reload data when gaining focus (returning to application)
      loadSavedData()
    }

    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  // Enhanced persistence: periodic auto-save
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (formData.experience_years > 0 || formData.subjects.length > 0 || formData.hourly_rate > 0) {
        saveDataImmediately()
      }
    }, 30000) // Save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [formData])

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true)
        setSubjectsError(null)
        console.log('Fetching subjects from /api/tutor/subjects...')
        
        const response = await fetch('/api/tutor/subjects')
        console.log('Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Subjects API response:', data)
          
          // Ensure data is an array - check the actual API response structure
          if (Array.isArray(data)) {
            setSubjects(data)
          } else if (data && Array.isArray(data.data)) {
            // API returns { success: true, data: subjects[] }
            setSubjects(data.data)
          } else if (data && Array.isArray(data.subjects)) {
            // Fallback for other possible formats
            setSubjects(data.subjects)
          } else {
            console.warn('Subjects API returned non-array data:', data)
            console.warn('Expected format: { success: true, data: subjects[] }')
            console.warn('Actual response structure:', JSON.stringify(data, null, 2))
            setSubjects([])
            setSubjectsError('Invalid data format received from server')
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to fetch subjects - Response not OK:', response.status, errorText)
          setSubjectsError(`Failed to load subjects: ${response.status}`)
          setSubjects([]) // Fallback to empty array
        }
      } catch (error) {
        console.error('Failed to fetch subjects - Network error:', error)
        setSubjectsError('Network error while loading subjects')
        setSubjects([]) // Fallback to empty array
      } finally {
        setSubjectsLoading(false)
      }
    }

    fetchSubjects()
  }, [])

      const updateFormData = (field: keyof TutorOnboardingFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
      }

      const validateCurrentStep = (): boolean => {
        switch (currentStep) {
          case 0: // Basic Information
            return !!(formData.first_name && formData.first_name.trim() && 
                     formData.last_name && formData.last_name.trim())
          case 1: // Teaching Experience
            return !!(formData.experience_years && formData.experience_years > 0)
          case 2: // Subject Specializations
            return !!(formData.subjects && formData.subjects.length > 0)
          case 3: // Rates & Availability
            return !!(formData.hourly_rate && formData.hourly_rate > 0)
          case 4: // Complete Profile (optional fields)
            return true
          default:
            return false
        }
      }

      const nextStep = () => {
        if (!validateCurrentStep()) {
          setError('Please fill in all required fields')
          return
        }

        setError(null)
        
        if (currentStep < TUTOR_ONBOARDING_STEPS.length - 1) {
          setCurrentStep(currentStep + 1)
        }
      }

      const prevStep = () => {
        if (currentStep > 0) {
          setCurrentStep(currentStep - 1)
        }
      }

      const submitTutorProfile = async () => {
        if (!session?.access_token) {
          setError('Authentication required')
          return
        }

        setLoading(true)
        setError(null)

        try {
          // First, update the user's role to 'tutor'
          const roleUpdateResponse = await fetch('/api/user/update-role', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'tutor' }),
          })

          if (!roleUpdateResponse.ok) {
            const roleErrorData = await roleUpdateResponse.json()
            setError(roleErrorData.error || 'Failed to update user role')
            return
          }

          const tutorData = {
            // Map form fields to database columns - only send fields actually collected by the tutor form
            full_name: `${formData.first_name} ${formData.last_name}`.trim(),
            bio: formData.bio?.trim() || undefined,
            // Tutor-specific fields
            education: formData.education?.trim() || undefined,
            languages: formData.languages || undefined,
            experience_years: formData.experience_years || 0,
            hourly_rate: formData.hourly_rate || 0,
            availability: formData.availability?.trim() || undefined,
            subjects: formData.subjects || []
          }

          const response = await fetch('/api/tutor/profile', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tutorData),
          })

          if (response.ok) {
            // Clear stored data after successful profile creation
            clearStoredData()
            
            // Show success message briefly before redirect
            setError('') // Clear any previous errors
            
            // Force refresh the profile context to update profileExists
            await refreshProfile()
            
            // Add a small delay to prevent flashing and show success state
            setTimeout(() => {
              router.push('/dashboard')
            }, 800)
          } else {
            const errorData = await response.json()
            setError(errorData.error || 'Failed to create tutor profile')
          }
        } catch (error) {
          console.error('Tutor profile creation error:', error)
          setError('An unexpected error occurred')
        } finally {
          setLoading(false)
        }
      }

      const toggleSubject = (subjectId: number) => {
        const currentSubjects = formData.subjects || []
        const updatedSubjects = currentSubjects.includes(subjectId)
          ? currentSubjects.filter(id => id !== subjectId)
          : [...currentSubjects, subjectId]
        
        updateFormData('subjects', updatedSubjects)
      }

      const addLanguage = (language: string) => {
        if (language.trim() && !(formData.languages || []).includes(language.trim())) {
          updateFormData('languages', [...(formData.languages || []), language.trim()])
        }
      }

      const removeLanguage = (language: string) => {
        updateFormData('languages', (formData.languages || []).filter(lang => lang !== language))
      }

      const progress = ((currentStep + 1) / TUTOR_ONBOARDING_STEPS.length) * 100

      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Tutor!</h1>
              <p className="text-gray-600">Let's set up your tutoring profile to connect with students</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep + 1} of {TUTOR_ONBOARDING_STEPS.length}
                </span>
                <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
                {/* Auto-save status indicator */}
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between mb-8">
              {TUTOR_ONBOARDING_STEPS.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStep 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 mt-1 text-center max-w-20">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Main Form Card */}
            <Card className="p-8 shadow-lg">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {TUTOR_ONBOARDING_STEPS[currentStep].title}
                </h2>
                <p className="text-gray-600">{TUTOR_ONBOARDING_STEPS[currentStep].description}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Step Content */}
              <div className="space-y-6">
                {/* Basic Information Step */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-700">Basic Information</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          type="text"
                          placeholder="Enter your first name"
                          value={formData.first_name || ''}
                          onChange={(e) => updateFormData('first_name', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          type="text"
                          placeholder="Enter your last name"
                          value={formData.last_name || ''}
                          onChange={(e) => updateFormData('last_name', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Teaching Experience Step */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-700">Teaching Experience</span>
                    </div>
                    
                    <div>
                      <Label htmlFor="experience_years">Years of Teaching Experience *</Label>
                      <Input
                        id="experience_years"
                        type="number"
                        min="0"
                        max="50"
                        placeholder="e.g., 3"
                        value={formData.experience_years || ''}
                        onChange={(e) => updateFormData('experience_years', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="education">Education Background</Label>
                      <Textarea
                        id="education"
                        placeholder="Describe your educational background, degrees, certifications..."
                        value={formData.education || ''}
                        onChange={(e) => updateFormData('education', e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Subject Specializations Step */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-700">Subject Specializations</span>
                    </div>

                    <div>
                      <Label>Select subjects you can teach *</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {subjectsLoading ? (
                          <div className="col-span-2 flex items-center justify-center py-8">
                            <LoadingSpinner />
                            <span className="ml-2 text-gray-600">Loading subjects...</span>
                          </div>
                        ) : subjectsError ? (
                          <div className="col-span-2 text-center py-8">
                            <div className="text-red-600 mb-2">⚠️ {subjectsError}</div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Retry fetching subjects
                                const fetchSubjects = async () => {
                                  try {
                                    setSubjectsLoading(true)
                                    setSubjectsError(null)
                                    const response = await fetch('/api/tutor/subjects')
                                    if (response.ok) {
                                      const data = await response.json()
                                      if (Array.isArray(data)) {
                                       setSubjects(data)
                                     } else if (data && Array.isArray(data.data)) {
                                       // API returns { success: true, data: subjects[] }
                                       setSubjects(data.data)
                                     } else if (data && Array.isArray(data.subjects)) {
                                       setSubjects(data.subjects)
                                     } else {
                                       setSubjects([])
                                       setSubjectsError('Invalid data format received from server')
                                     }
                                    } else {
                                      setSubjectsError(`Failed to load subjects: ${response.status}`)
                                      setSubjects([])
                                    }
                                  } catch (error) {
                                    setSubjectsError('Network error while loading subjects')
                                    setSubjects([])
                                  } finally {
                                    setSubjectsLoading(false)
                                  }
                                }
                                fetchSubjects()
                              }}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : Array.isArray(subjects) && subjects.length > 0 ? (
                          subjects.map((subject) => (
                            <div
                              key={subject.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                formData.subjects?.includes(subject.id)
                                  ? 'bg-green-50 border-green-500 text-green-700'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => toggleSubject(subject.id)}
                            >
                              <div className="font-medium">{subject.name}</div>
                              {subject.description && (
                                <div className="text-sm text-gray-500 mt-1">{subject.description}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 text-center py-8 text-gray-500">
                            No subjects available at the moment.
                          </div>
                        )}
                      </div>
                    </div>

                    {formData.subjects && formData.subjects.length > 0 && (
                      <div>
                        <Label>Selected Subjects:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.subjects.map((subjectId) => {
                            const subject = subjects.find(s => s.id === subjectId)
                            return subject ? (
                              <Badge key={subjectId} variant="secondary">
                                {subject.name}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rates & Availability Step */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-700">Rates & Availability</span>
                    </div>

                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate (USD) *</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        min="1"
                        max="500"
                        placeholder="e.g., 25"
                        value={formData.hourly_rate || ''}
                        onChange={(e) => updateFormData('hourly_rate', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Textarea
                        id="availability"
                        placeholder="Describe your availability (e.g., weekdays 3-6 PM, weekends flexible...)"
                        value={formData.availability || ''}
                        onChange={(e) => updateFormData('availability', e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* Complete Profile Step */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-green-500" />
                      <span className="font-medium text-gray-700">Complete Your Profile</span>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell students about yourself, your teaching style, and what makes you a great tutor..."
                        value={formData.bio || ''}
                        onChange={(e) => updateFormData('bio', e.target.value)}
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label>Languages Spoken</Label>
                      <div className="mt-2">
                        <div className="flex gap-2 mb-3">
                          <Input
                            placeholder="Type a language and press Enter"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const target = e.target as HTMLInputElement
                                addLanguage(target.value)
                                target.value = ''
                              }
                            }}
                          />
                        </div>
                        
                        {formData.languages && formData.languages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.languages.map((language, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="cursor-pointer hover:bg-red-100"
                                onClick={() => removeLanguage(language)}
                              >
                                {language} ×
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentStep === TUTOR_ONBOARDING_STEPS.length - 1 ? (
                  <Button
                    onClick={submitTutorProfile}
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )
}

export default function OnboardingPage() {
  const { user, profile, profileExists, profileLoading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (profileExists && profile && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/dashboard')
    }
  }, [user, profile, profileExists, router, isRedirecting])

  if (profileLoading || !user || isRedirecting) {
    return <LoadingSpinner />
  }

  // Determine user type from user metadata
  const userRole = user.user_metadata?.role || 
                  user.app_metadata?.role || 
                  user.raw_user_meta_data?.role

  // Render appropriate onboarding based on user type
  if (userRole === 'tutor') {
    return <TeacherOnboarding />
  } else {
    return <StudentOnboarding />
  }
}