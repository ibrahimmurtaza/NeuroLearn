'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, Clock, Users, Star, Search, Filter } from 'lucide-react'

export default function Courses() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const categories = [
    { id: 'all', name: 'All Courses' },
    { id: 'computer-science', name: 'Computer Science' },
    { id: 'mathematics', name: 'Mathematics' },
    { id: 'physics', name: 'Physics' },
    { id: 'engineering', name: 'Engineering' },
  ]

  const enrolledCourses = [
    {
      id: 1,
      title: 'Machine Learning Fundamentals',
      code: 'CS 4641',
      instructor: 'Dr. Sarah Johnson',
      progress: 68,
      nextClass: '2024-01-15 10:00 AM',
      students: 156,
      rating: 4.8,
      category: 'computer-science',
    },
    {
      id: 2,
      title: 'Data Structures & Algorithms',
      code: 'CS 1332',
      instructor: 'Prof. Michael Chen',
      progress: 45,
      nextClass: '2024-01-16 2:00 PM',
      students: 203,
      rating: 4.6,
      category: 'computer-science',
    },
  ]

  const availableCourses = [
    {
      id: 3,
      title: 'Deep Learning & Neural Networks',
      code: 'CS 7643',
      instructor: 'Dr. Emily Rodriguez',
      duration: '16 weeks',
      students: 89,
      rating: 4.9,
      category: 'computer-science',
      difficulty: 'Advanced',
    },
    {
      id: 4,
      title: 'Linear Algebra',
      code: 'MATH 1554',
      instructor: 'Prof. David Kim',
      duration: '12 weeks',
      students: 245,
      rating: 4.4,
      category: 'mathematics',
      difficulty: 'Intermediate',
    },
    {
      id: 5,
      title: 'Software Engineering Principles',
      code: 'CS 3240',
      instructor: 'Dr. Lisa Wang',
      duration: '14 weeks',
      students: 178,
      rating: 4.7,
      category: 'computer-science',
      difficulty: 'Intermediate',
    },
  ]

  const filteredAvailableCourses = availableCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
          <p className="text-muted-foreground">
            Explore and manage your learning journey
          </p>
        </div>

        {/* My Courses Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">My Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolledCourses.map((course) => (
              <div
                key={course.id}
                className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-card-foreground mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {course.code} • {course.instructor}
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 text-warning-500 mr-1" />
                      {course.rating}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-card-foreground font-medium">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Next: {course.nextClass}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {course.students} students
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Courses Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Available Courses</h2>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus-ring"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAvailableCourses.map((course) => (
              <div
                key={course.id}
                className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-card-foreground mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {course.code} • {course.instructor}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        course.difficulty === 'Advanced'
                          ? 'bg-error-100 text-error-700'
                          : course.difficulty === 'Intermediate'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-success-100 text-success-700'
                      }`}>
                        {course.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 text-warning-500 mr-1" />
                      {course.rating}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {course.duration}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {course.students} students
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}