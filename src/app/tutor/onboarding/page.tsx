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
import { TutorOnboardingFormData, Subject } from '@/types/profile'
import { ChevronLeft, ChevronRight, User, BookOpen, DollarSign, Clock, Check, GraduationCap } from 'lucide-react'

const TUTOR_ONBOARDING_STEPS = [
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

export default function TutorOnboardingPage() {
  const { user, session, profile } = useAuth()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<TutorOnboardingFormData>>({
    subjects: [],
    languages: []
  })
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    // If profile exists, check the role
    if (profile) {
      if (profile.role !== 'tutor') {
        // User has a profile but is not a tutor - redirect to student dashboard
        router.push('/dashboard')
        return
      }
      // User has a tutor profile - redirect to dashboard (already completed onboarding)
      router.push('/dashboard')
      return
    }
    
    // If no profile exists, check user metadata for role
    const userRole = user.user_metadata?.role || 
                    user.app_metadata?.role || 
                    user.raw_user_meta_data?.role
    
    if (userRole !== 'tutor') {
      // User is not a tutor - redirect to student onboarding
      router.push('/onboarding')
      return
    }
    
    // User is a tutor without a profile - stay on this page (correct flow)
  }, [user, profile, router])

  // Fetch available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/tutor/subjects')
        if (response.ok) {
          const data = await response.json()
          setAvailableSubjects(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error)
      }
    }

    fetchSubjects()
  }, [])

  const updateFormData = (field: keyof TutorOnboardingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Experience
        return !!(formData.experience_years && formData.experience_years > 0)
      case 1: // Subjects
        return !!(formData.subjects && formData.subjects.length > 0)
      case 2: // Rates
        return !!(formData.hourly_rate && formData.hourly_rate > 0)
      case 3: // Profile (optional fields)
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
      const tutorData = {
        ...formData,
        experience_years: formData.experience_years || 0,
        hourly_rate: formData.hourly_rate || 0,
        subjects: formData.subjects || [],
        bio: formData.bio?.trim() || undefined,
        availability: formData.availability?.trim() || undefined,
        education: formData.education?.trim() || undefined,
        certifications: formData.certifications || undefined,
        languages: formData.languages || undefined
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
        router.push('/dashboard')
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

  if (!user) {
    return <LoadingSpinner />
  }

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
            {/* Teaching Experience Step */}
            {currentStep === 0 && (
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
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-700">Subject Specializations</span>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Select the subjects you can teach. Choose at least one subject.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSubjects.map((subject) => (
                    <Badge
                      key={subject.id}
                      variant={(formData.subjects || []).includes(subject.id) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors p-3 text-center justify-center ${
                        (formData.subjects || []).includes(subject.id)
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'hover:bg-green-50 hover:border-green-300'
                      }`}
                      onClick={() => toggleSubject(subject.id)}
                    >
                      {subject.name}
                    </Badge>
                  ))}
                </div>

                {formData.subjects && formData.subjects.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 rounded-md">
                    <h4 className="font-medium text-green-900 mb-2">Selected Subjects:</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.subjects.map((subjectId) => {
                        const subject = availableSubjects.find(s => s.id === subjectId)
                        return subject ? (
                          <Badge key={subject.id} className="bg-green-500 text-white">
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
            {currentStep === 2 && (
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
                    placeholder="Describe your availability (e.g., Weekdays 9 AM - 5 PM EST, Weekends flexible)"
                    value={formData.availability || ''}
                    onChange={(e) => updateFormData('availability', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Complete Profile Step */}
            {currentStep === 3 && (
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
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    placeholder="List any relevant certifications, licenses, or credentials..."
                    value={formData.certifications?.join('\n') || ''}
                    onChange={(e) => updateFormData('certifications', e.target.value.split('\n').filter(cert => cert.trim()))}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Languages Spoken</Label>
                  <div className="mt-2">
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add a language (e.g., English, Spanish)"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addLanguage(e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement
                          addLanguage(input.value)
                          input.value = ''
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {formData.languages && formData.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.languages.map((language) => (
                          <Badge
                            key={language}
                            variant="secondary"
                            className="cursor-pointer"
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

            {currentStep < TUTOR_ONBOARDING_STEPS.length - 1 ? (
              <Button
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={submitTutorProfile}
                disabled={loading || !validateCurrentStep()}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}