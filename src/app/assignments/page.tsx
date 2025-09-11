'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileText, Clock, Calendar, CheckCircle, AlertCircle, Search, Filter, Plus } from 'lucide-react'

export default function Assignments() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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

  const assignments = [
    {
      id: 1,
      title: 'Neural Network Implementation',
      course: 'Machine Learning Fundamentals',
      courseCode: 'CS 4641',
      dueDate: '2024-01-15',
      dueTime: '11:59 PM',
      status: 'pending',
      priority: 'high',
      description: 'Implement a basic neural network from scratch using Python and NumPy.',
      points: 100,
      submissionType: 'code',
      estimatedTime: '8-10 hours',
    },
    {
      id: 2,
      title: 'Algorithm Analysis Report',
      course: 'Data Structures & Algorithms',
      courseCode: 'CS 1332',
      dueDate: '2024-01-18',
      dueTime: '11:59 PM',
      status: 'in_progress',
      priority: 'medium',
      description: 'Analyze the time and space complexity of various sorting algorithms.',
      points: 75,
      submissionType: 'document',
      estimatedTime: '4-6 hours',
    },
    {
      id: 3,
      title: 'Database Design Project',
      course: 'Database Systems',
      courseCode: 'CS 4400',
      dueDate: '2024-01-22',
      dueTime: '11:59 PM',
      status: 'pending',
      priority: 'medium',
      description: 'Design and implement a relational database for a library management system.',
      points: 150,
      submissionType: 'project',
      estimatedTime: '12-15 hours',
    },
    {
      id: 4,
      title: 'Linear Algebra Problem Set 3',
      course: 'Linear Algebra',
      courseCode: 'MATH 1554',
      dueDate: '2024-01-12',
      dueTime: '11:59 PM',
      status: 'completed',
      priority: 'low',
      description: 'Solve problems related to eigenvalues and eigenvectors.',
      points: 50,
      submissionType: 'document',
      estimatedTime: '3-4 hours',
      grade: 'A-',
    },
  ]

  const statusOptions = [
    { value: 'all', label: 'All Assignments' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
  ]

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'course', label: 'Course' },
    { value: 'points', label: 'Points' },
  ]

  const filteredAssignments = assignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assignment.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'course':
          return a.course.localeCompare(b.course)
        case 'points':
          return b.points - a.points
        default:
          return 0
      }
    })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-primary-500" />
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-error-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-700'
      case 'in_progress':
        return 'bg-primary-100 text-primary-700'
      case 'overdue':
        return 'bg-error-100 text-error-700'
      default:
        return 'bg-secondary-100 text-secondary-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error-100 text-error-700'
      case 'medium':
        return 'bg-warning-100 text-warning-700'
      default:
        return 'bg-success-100 text-success-700'
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Assignments</h1>
            <p className="text-muted-foreground">
              Track and manage your coursework
            </p>
          </div>
          <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus-ring"
            />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const daysUntilDue = getDaysUntilDue(assignment.dueDate)
            return (
              <div
                key={assignment.id}
                className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                onClick={() => router.push(`/assignments/${assignment.id}`)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        {getStatusIcon(assignment.status)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-card-foreground mb-1">
                          {assignment.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {assignment.course} ({assignment.courseCode})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(assignment.priority)}`}>
                        {assignment.priority} priority
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div>
                        <div>Due: {assignment.dueDate}</div>
                        <div className="text-xs">{assignment.dueTime}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <div>{assignment.estimatedTime}</div>
                        <div className="text-xs">estimated</div>
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      <div>
                        <div>{assignment.points} points</div>
                        <div className="text-xs">{assignment.submissionType}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {assignment.status === 'completed' && assignment.grade ? (
                        <div className="text-success-600 font-medium">
                          Grade: {assignment.grade}
                        </div>
                      ) : (
                        <div className={`font-medium ${
                          daysUntilDue < 0 ? 'text-error-600' :
                          daysUntilDue <= 2 ? 'text-warning-600' :
                          'text-muted-foreground'
                        }`}>
                          {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                           daysUntilDue === 0 ? 'Due today' :
                           `${daysUntilDue} days left`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'You have no assignments at the moment'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}