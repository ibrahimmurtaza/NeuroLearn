'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertCircle,
} from 'lucide-react'

export default function Schedule() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterType, setFilterType] = useState('all')

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

  const events = [
    {
      id: 1,
      title: 'Machine Learning Lecture',
      course: 'CS 4641',
      type: 'lecture',
      startTime: '2024-01-15T10:00:00',
      endTime: '2024-01-15T11:30:00',
      location: 'Klaus 1116',
      instructor: 'Dr. Smith',
      description: 'Introduction to Neural Networks',
      color: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'Assignment Due: Data Structures',
      course: 'CS 1332',
      type: 'assignment',
      startTime: '2024-01-15T23:59:00',
      endTime: '2024-01-15T23:59:00',
      location: 'Online',
      description: 'Binary Search Tree Implementation',
      color: 'bg-red-500',
      priority: 'high',
    },
    {
      id: 3,
      title: 'Study Group: Linear Algebra',
      course: 'MATH 1554',
      type: 'study-group',
      startTime: '2024-01-15T15:00:00',
      endTime: '2024-01-15T17:00:00',
      location: 'Library Room 204',
      participants: 6,
      description: 'Eigenvalues and Eigenvectors Review',
      color: 'bg-green-500',
    },
  ]

  const viewModes = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ]

  const filterTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'lecture', label: 'Lectures' },
    { value: 'assignment', label: 'Assignments' },
    { value: 'exam', label: 'Exams' },
    { value: 'study-group', label: 'Study Groups' },
    { value: 'lab', label: 'Labs' },
  ]

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="h-4 w-4" />
      case 'assignment':
        return <AlertCircle className="h-4 w-4" />
      case 'exam':
        return <AlertCircle className="h-4 w-4" />
      case 'study-group':
        return <Users className="h-4 w-4" />
      case 'lab':
        return <BookOpen className="h-4 w-4" />
      case 'office-hours':
        return <Clock className="h-4 w-4" />
      case 'presentation':
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getWeekDays = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true
    return event.type === filterType
  })

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays(currentDate)
      const start = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${start} - ${end}`
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Schedule</h1>
            <p className="text-muted-foreground">
              Manage your classes, assignments, and study sessions
            </p>
          </div>
          <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
              {viewModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setViewMode(mode.value)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === mode.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
              >
                {filterTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
              {getDateRangeText()}
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Events for {formatDate(currentDate.toISOString())}
            </h3>
            {getEventsForDate(currentDate).length === 0 ? (
              <div className="bg-card rounded-lg border border-border card-shadow p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No events scheduled</h3>
                <p className="text-muted-foreground">You have a free day! Consider adding some study time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getEventsForDate(currentDate)
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((event) => (
                    <div
                      key={event.id}
                      className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                      onClick={() => router.push(`/schedule/events/${event.id}`)}
                    >
                      <div className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg ${event.color.replace('bg-', 'bg-').replace('-500', '-100')} text-white`}>
                            {getEventTypeIcon(event.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-card-foreground">{event.title}</h3>
                                <p className="text-sm text-muted-foreground">{event.course}</p>
                              </div>
                              {event.priority === 'high' && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                  High Priority
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {event.location}
                              </div>
                              {event.instructor && (
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2" />
                                  {event.instructor}
                                </div>
                              )}
                              {event.participants && (
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2" />
                                  {event.participants} participants
                                </div>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}