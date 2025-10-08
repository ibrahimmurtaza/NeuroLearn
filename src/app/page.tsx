'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight, BookOpen, Brain, Users, BarChart3, GraduationCap, DollarSign, Calendar, MessageSquare } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'

// Student Homepage Component
function StudentHomepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">NeuroLearn</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-500 hover:text-gray-900">Features</Link>
              <Link href="#about" className="text-gray-500 hover:text-gray-900">About</Link>
              <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Driven Educational Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your learning experience with personalized AI assistance, 
            adaptive content, and intelligent insights that optimize your educational journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              Start Learning
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/courses" 
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50"
            >
              Browse Courses
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <BookOpen className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Interactive Learning</h3>
            <p className="text-gray-600">
              Engage with multimedia content, AI-powered Q&A, and adaptive learning paths.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <Users className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
            <p className="text-gray-600">
              Connect with peers, join study groups, and participate in discussions.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <BarChart3 className="h-12 w-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
            <p className="text-gray-600">
              Track your progress with detailed analytics and AI-powered recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

// Teacher Homepage Component
function TeacherHomepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-green-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">NeuroLearn</span>
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">Tutor</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-500 hover:text-gray-900">Features</Link>
              <Link href="#about" className="text-gray-500 hover:text-gray-900">About</Link>
              <Link href="/dashboard" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                Tutor Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Empower Students with AI-Enhanced Tutoring
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join our platform as a tutor and leverage AI-powered tools to create personalized 
            learning experiences, track student progress, and grow your tutoring business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              Start Teaching
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/students" 
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50"
            >
              Find Students
            </Link>
          </div>
        </div>

        {/* Features Grid for Teachers */}
        <div id="features" className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <GraduationCap className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Student Management</h3>
            <p className="text-gray-600">
              Manage your students, track their progress, and provide personalized feedback with AI insights.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <DollarSign className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Flexible Earnings</h3>
            <p className="text-gray-600">
              Set your own rates, manage your schedule, and earn money teaching subjects you're passionate about.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <Calendar className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-gray-600">
              AI-powered scheduling system that matches you with students based on availability and expertise.
            </p>
          </div>
        </div>

        {/* Additional Teacher Benefits */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Teach on NeuroLearn?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of educators who are making a difference while building their careers
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Communication</h3>
                <p className="text-gray-600">
                  Get AI assistance for lesson planning, student communication, and progress tracking.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Performance Analytics</h3>
                <p className="text-gray-600">
                  Track your teaching effectiveness with detailed analytics and student feedback.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Growing Community</h3>
                <p className="text-gray-600">
                  Connect with other educators and share best practices in our tutor community.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Resource Library</h3>
                <p className="text-gray-600">
                  Access a vast library of teaching materials and AI-generated content for your lessons.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  const { user, profile, profileLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If user is logged in and has a profile, redirect to dashboard
    if (user && profile) {
      router.push('/dashboard')
    }
  }, [user, profile, router])

  if (profileLoading) {
    return <LoadingSpinner />
  }

  // If user is logged in but no profile yet, show appropriate homepage
  if (user && !profile) {
    const userRole = user.user_metadata?.role || 
                    user.app_metadata?.role || 
                    user.raw_user_meta_data?.role

    if (userRole === 'tutor') {
      return <TeacherHomepage />
    } else {
      return <StudentHomepage />
    }
  }

  // Default to student homepage for non-logged in users
  return <StudentHomepage />
}