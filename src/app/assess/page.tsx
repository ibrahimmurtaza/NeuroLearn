'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileText, Clock, Users, CheckCircle, XCircle, AlertCircle, Eye, Edit, Download, Filter, Search, BarChart3, TrendingUp, Award, Calendar } from 'lucide-react'

export default function Assess() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [sortBy, setSortBy] = useState('dueDate')

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

  const assessments = [
    {
      id: 1,
      title: 'Machine Learning Midterm Exam',
      course: 'CS 4641',
      type: 'exam',
      status: 'pending',
      submissions: 24,
      totalStudents: 28,
      dueDate: '2024-01-20T23:59:00',
      createdDate: '2024-01-10T09:00:00',
      averageScore: null,
      timeLimit: 120,
      questions: 25,
      autoGrade: false,
    },
    {
      id: 2,
      title: 'Data Structures Quiz #3',
      course: 'CS 1332',
      type: 'quiz',
      status: 'graded',
      submissions: 32,
      totalStudents: 32,
      dueDate: '2024-01-15T23:59:00',
      createdDate: '2024-01-08T14:30:00',
      averageScore: 87.5,
      timeLimit: 30,
      questions: 15,
      autoGrade: true,
    },
    {
      id: 3,
      title: 'Binary Search Tree Implementation',
      course: 'CS 1332',
      type: 'assignment',
      status: 'grading',
      submissions: 28,
      totalStudents: 32,
      dueDate: '2024-01-18T23:59:00',
      createdDate: '2024-01-05T10:15:00',
      averageScore: null,
      timeLimit: null,
      questions: null,
      autoGrade: false,
    },
    {
      id: 4,
      title: 'Linear Algebra Problem Set 4',
      course: 'MATH 1554',
      type: 'assignment',
      status: 'graded',
      submissions: 45,
      totalStudents: 48,
      dueDate: '2024-01-12T23:59:00',
      createdDate: '2024-01-02T16:20:00',
      averageScore: 92.3,
      timeLimit: null,
      questions: 8,
      autoGrade: false,
    },
    {
      id: 5,
      title: 'Database Design Quiz',
      course: 'CS 4400',
      type: 'quiz',
      status: 'pending',
      submissions: 0,
      totalStudents: 25,
      dueDate: '2024-01-25T23:59:00',
      createdDate: '2024-01-15T11:45:00',
      averageScore: null,
      timeLimit: 45,
      questions: 20,
      autoGrade: true,
    },
    {
      id: 6,
      title: 'Algorithms Final Project',
      course: 'CS 3510',
      type: 'project',
      status: 'grading',
      submissions: 18,
      totalStudents: 20,
      dueDate: '2024-01-19T23:59:00',
      createdDate: '2023-12-15T09:30:00',
      averageScore: null,
      timeLimit: null,
      questions: null,
      autoGrade: false,
    },
  ]

  const courses = ['CS 4641', 'CS 1332', 'MATH 1554', 'CS 4400', 'CS 3510']

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: assessments.filter(a => a.status === 'pending').length },
    { id: 'grading', label: 'In Progress', count: assessments.filter(a => a.status === 'grading').length },
    { id: 'graded', label: 'Completed', count: assessments.filter(a => a.status === 'graded').length },
    { id: 'all', label: 'All Assessments', count: assessments.length },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'grading':
        return 'bg-blue-100 text-blue-700'
      case 'graded':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'grading':
        return <AlertCircle className="h-4 w-4" />
      case 'graded':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'quiz':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'assignment':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'project':
        return <FileText className="h-5 w-5 text-purple-500" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getCompletionRate = (submissions: number, total: number) => {
    return Math.round((submissions / total) * 100)
  }

  const filteredAssessments = assessments
    .filter(assessment => {
      if (activeTab !== 'all' && assessment.status !== activeTab) return false
      if (filterCourse !== 'all' && assessment.course !== filterCourse) return false
      if (searchTerm && !assessment.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'submissions':
          return b.submissions - a.submissions
        case 'course':
          return a.course.localeCompare(b.course)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  const stats = {
    totalAssessments: assessments.length,
    pendingReview: assessments.filter(a => a.status === 'pending').length,
    inProgress: assessments.filter(a => a.status === 'grading').length,
    averageScore: assessments
      .filter(a => a.averageScore !== null)
      .reduce((sum, a) => sum + (a.averageScore || 0), 0) / assessments.filter(a => a.averageScore !== null).length || 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Assessment Center</h1>
            <p className="text-muted-foreground">
              Review submissions, grade assignments, and track student progress
            </p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </button>
            <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Grades
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.totalAssessments}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.pendingReview}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.inProgress}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.averageScore.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-border rounded-lg bg-background text-foreground focus-ring"
            />
          </div>
          
          <div className="flex space-x-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="submissions">Sort by Submissions</option>
              <option value="course">Sort by Course</option>
              <option value="title">Sort by Title</option>
            </select>
          </div>
        </div>

        {/* Assessments List */}
        <div className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <div className="bg-card rounded-lg border border-border card-shadow p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No assessments found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            filteredAssessments.map((assessment) => {
              const daysUntilDue = getDaysUntilDue(assessment.dueDate)
              const completionRate = getCompletionRate(assessment.submissions, assessment.totalStudents)
              
              return (
                <div
                  key={assessment.id}
                  className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                  onClick={() => router.push(`/assess/${assessment.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {getTypeIcon(assessment.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-card-foreground">{assessment.title}</h3>
                              <p className="text-sm text-muted-foreground">{assessment.course}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(assessment.status)}`}>
                                {getStatusIcon(assessment.status)}
                                <span className="ml-1 capitalize">{assessment.status}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {assessment.submissions}/{assessment.totalStudents} submitted
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Due {formatDate(assessment.dueDate)}
                            </div>
                            {assessment.timeLimit && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {assessment.timeLimit} minutes
                              </div>
                            )}
                            {assessment.averageScore !== null && (
                              <div className="flex items-center">
                                <Award className="h-4 w-4 mr-2" />
                                Avg: {assessment.averageScore}%
                              </div>
                            )}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Completion Rate</span>
                              <span className="font-medium text-card-foreground">{completionRate}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Due Date Warning */}
                          {daysUntilDue <= 3 && daysUntilDue > 0 && (
                            <div className="flex items-center text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                            </div>
                          )}
                          
                          {daysUntilDue < 0 && (
                            <div className="flex items-center text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                              <XCircle className="h-4 w-4 mr-2" />
                              Overdue by {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Type: {assessment.type}</span>
                        {assessment.questions && (
                          <span>{assessment.questions} questions</span>
                        )}
                        {assessment.autoGrade && (
                          <span className="text-green-600">Auto-graded</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/assess/${assessment.id}/analytics`)
                          }}
                          className="flex items-center px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/assess/${assessment.id}/grade`)
                          }}
                          className="flex items-center px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {assessment.status === 'pending' ? 'Start Grading' : 'Continue Grading'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}