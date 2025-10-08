'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/Separator'
import LoadingSpinner from '@/components/LoadingSpinner'
import { TutorProfileWithSubjects } from '@/types/profile'
import { 
  User, 
  BookOpen, 
  DollarSign, 
  Clock, 
  Star, 
  Calendar,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
  Award,
  Edit
} from 'lucide-react'

export default function TutorDashboardPage() {
  const { user, session, profile } = useAuth()
  const router = useRouter()
  
  const [tutorProfile, setTutorProfile] = useState<TutorProfileWithSubjects | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if user is not logged in or not a tutor
  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    if (!profile) {
      router.push('/onboarding')
      return
    }

    if (profile.role !== 'tutor') {
      router.push('/dashboard')
      return
    }
  }, [user, profile, router])

  // Fetch tutor profile data
  useEffect(() => {
    const fetchTutorProfile = async () => {
      if (!session?.access_token) return

      try {
        setLoading(true)
        const response = await fetch('/api/tutor/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setTutorProfile(data.data)
        } else if (response.status === 404) {
          // No tutor profile exists, redirect to onboarding
          router.push('/onboarding')
          return
        } else {
          setError('Failed to load tutor profile')
        }
      } catch (error) {
        console.error('Failed to fetch tutor profile:', error)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (user && profile?.role === 'tutor') {
      fetchTutorProfile()
    }
  }, [user, profile, session, router])

  if (!user || !profile) {
    return <LoadingSpinner />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {profile.first_name}!
              </h1>
              <p className="text-gray-600">Manage your tutoring activities and connect with students</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sessions This Month</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">5.0</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Earnings This Month</p>
                <p className="text-2xl font-bold text-gray-900">$0</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Profile Overview</h2>
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </div>

              {tutorProfile && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {profile.first_name} {profile.last_name}
                      </h3>
                      <p className="text-gray-600">{tutorProfile.experience_years} years of experience</p>
                      <div className="flex items-center gap-2 mt-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">${tutorProfile.hourly_rate}/hour</span>
                      </div>
                    </div>
                  </div>

                  {tutorProfile.bio && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                      <p className="text-gray-600 text-sm">{tutorProfile.bio}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Subjects</h4>
                    <div className="flex flex-wrap gap-2">
                      {tutorProfile.subjects?.map((subject) => (
                        <Badge key={subject.id} className="bg-green-100 text-green-800">
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {tutorProfile.languages && tutorProfile.languages.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {tutorProfile.languages.map((language) => (
                          <Badge key={language} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">
                  Your tutoring sessions and student interactions will appear here
                </p>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Availability
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Messages
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Students
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Award className="w-4 h-4 mr-2" />
                  View Achievements
                </Button>
              </div>
            </Card>

            {/* Upcoming Sessions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
              <div className="text-center py-6">
                <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming sessions</p>
                <Button variant="outline" size="sm" className="mt-3">
                  Schedule Session
                </Button>
              </div>
            </Card>

            {/* Performance Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profile Completion</span>
                  <span className="text-sm font-medium text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-full"></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="text-sm font-medium text-gray-900">N/A</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Student Satisfaction</span>
                  <span className="text-sm font-medium text-gray-900">N/A</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}