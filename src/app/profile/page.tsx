'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Profile, ProfileFormData, InterestCategory } from '@/types/profile'
import { 
  User, 
  BookOpen, 
  Target, 
  Heart, 
  Edit3, 
  Save, 
  X, 
  Calendar,
  Mail,
  MapPin,
  Settings
} from 'lucide-react'

export default function ProfilePage() {
  const { user, session, profile, profileLoading, refreshProfile } = useAuth()
  const router = useRouter()
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<ProfileFormData>>({})
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    if (!profileLoading && !profile) {
      router.push('/onboarding')
      return
    }
  }, [user, profile, profileLoading, router])

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        bio: profile.bio || '',
        academic_field: profile.academic_field,
        study_goals: profile.study_goals,
        avatar_url: profile.avatar_url || '',
        interests: profile.interests
      })
      setSelectedInterests(profile.interests || [])
    }
  }, [profile])

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

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    )
  }

  const handleEdit = () => {
    setIsEditing(true)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    setSuccess(null)
    // Reset form data to original profile data
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        bio: profile.bio || '',
        academic_field: profile.academic_field,
        study_goals: profile.study_goals,
        avatar_url: profile.avatar_url || '',
        interests: profile.interests
      })
      setSelectedInterests(profile.interests || [])
    }
  }

  const handleSave = async () => {
    if (!session?.access_token) {
      setError('Authentication required')
      return
    }

    // Validation
    if (!formData.full_name?.trim()) {
      setError('Full name is required')
      return
    }

    if (!formData.academic_field?.trim()) {
      setError('Academic field is required')
      return
    }

    if (!formData.study_goals?.trim()) {
      setError('Study goals are required')
      return
    }

    if (selectedInterests.length === 0) {
      setError('Please select at least one interest')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const profileData = {
        ...formData,
        interests: selectedInterests,
        full_name: formData.full_name?.trim() || '',
        academic_field: formData.academic_field?.trim() || '',
        study_goals: formData.study_goals?.trim() || '',
        bio: formData.bio?.trim() || undefined
      }

      console.log('Profile submission data:', JSON.stringify(profileData, null, 2))
      console.log('Form data:', JSON.stringify(formData, null, 2))
      console.log('Selected interests:', selectedInterests)

      // Use POST if profile doesn't exist, PUT if it does
      const method = profile ? 'PUT' : 'POST'
      
      const response = await fetch('/api/profile', {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })

      if (response.ok) {
        await refreshProfile()
        setIsEditing(false)
        setSuccess(profile ? 'Profile updated successfully!' : 'Profile created successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const errorData = await response.json()
        console.error('Profile submission error:', errorData)
        setError(errorData.error || `Failed to ${profile ? 'update' : 'create'} profile`)
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your learning profile and preferences</p>
          </div>
          
          {!isEditing ? (
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 shadow-lg">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {profile.full_name}
                </h2>
                
                <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{user?.email}</span>
                </div>

                {profile.bio && (
                  <p className="text-gray-600 text-sm mb-4">{profile.bio}</p>
                )}

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Last updated {new Date(profile.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name || ''}
                      onChange={(e) => updateFormData('full_name', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{profile.full_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="avatar_url">Profile Picture URL</Label>
                  {isEditing ? (
                    <Input
                      id="avatar_url"
                      type="url"
                      value={formData.avatar_url || ''}
                      onChange={(e) => updateFormData('avatar_url', e.target.value)}
                      className="mt-1"
                      placeholder="https://example.com/your-photo.jpg"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">
                      {profile.avatar_url || 'No profile picture set'}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio || ''}
                    onChange={(e) => updateFormData('bio', e.target.value)}
                    className="mt-1"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {profile.bio || 'No bio provided'}
                  </p>
                )}
              </div>
            </Card>

            {/* Academic Information */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-semibold text-gray-900">Academic Background</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="academic_field">Field of Study</Label>
                  {isEditing ? (
                    <Input
                      id="academic_field"
                      type="text"
                      value={formData.academic_field || ''}
                      onChange={(e) => updateFormData('academic_field', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{profile.academic_field}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="study_goals">Learning Goals</Label>
                  {isEditing ? (
                    <Textarea
                      id="study_goals"
                      value={formData.study_goals || ''}
                      onChange={(e) => updateFormData('study_goals', e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{profile.study_goals}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Learning Interests */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-semibold text-gray-900">Learning Interests</h3>
              </div>

              {isEditing ? (
                <div className="space-y-6">
                  {interestCategories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <h4 className="font-medium text-gray-800">{category.name}</h4>
                      <p className="text-sm text-gray-600">{category.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {category.interests.map((interest) => (
                          <Badge
                            key={interest}
                            variant={selectedInterests.includes(interest) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              selectedInterests.includes(interest)
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'hover:bg-blue-50 hover:border-blue-300'
                            }`}
                            onClick={() => toggleInterest(interest)}
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                      <Separator className="my-4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.interests && profile.interests.length > 0 ? (
                    profile.interests.map((interest) => (
                      <Badge key={interest} className="bg-blue-500 text-white">
                        {interest}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">No interests selected</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}