import Link from 'next/link';
import { ArrowRight, BookOpen, Brain, Users, BarChart3 } from 'lucide-react';

export default function HomePage() {
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