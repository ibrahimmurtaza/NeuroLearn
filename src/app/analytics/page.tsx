'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Clock, Target, Award, Calendar, Filter, Download, RefreshCw } from 'lucide-react'

export default function Analytics() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timeRange, setTimeRange] = useState('week')
  const [selectedMetric, setSelectedMetric] = useState('overall')
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const overallStats = [
    {
      title: 'Study Hours',
      value: '42.5',
      unit: 'hours',
      change: '+12%',
      trend: 'up',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Assignments Completed',
      value: '18',
      unit: 'tasks',
      change: '+25%',
      trend: 'up',
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Average Score',
      value: '87.3',
      unit: '%',
      change: '+5.2%',
      trend: 'up',
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Learning Streak',
      value: '12',
      unit: 'days',
      change: '+3',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  const courseProgress = [
    {
      course: 'Machine Learning',
      code: 'CS 4641',
      progress: 78,
      timeSpent: '15.2h',
      avgScore: 89.5,
      assignments: { completed: 6, total: 8 },
      trend: 'up',
    },
    {
      course: 'Data Structures & Algorithms',
      code: 'CS 1332',
      progress: 92,
      timeSpent: '18.7h',
      avgScore: 91.2,
      assignments: { completed: 7, total: 7 },
      trend: 'up',
    },
    {
      course: 'Database Systems',
      code: 'CS 4400',
      progress: 65,
      timeSpent: '8.6h',
      avgScore: 82.1,
      assignments: { completed: 3, total: 6 },
      trend: 'down',
    },
    {
      course: 'Linear Algebra',
      code: 'MATH 1554',
      progress: 85,
      timeSpent: '12.3h',
      avgScore: 88.7,
      assignments: { completed: 5, total: 6 },
      trend: 'up',
    },
  ]

  const weeklyActivity = [
    { day: 'Mon', hours: 6.2, assignments: 2 },
    { day: 'Tue', hours: 4.8, assignments: 1 },
    { day: 'Wed', hours: 7.1, assignments: 3 },
    { day: 'Thu', hours: 5.5, assignments: 2 },
    { day: 'Fri', hours: 8.2, assignments: 4 },
    { day: 'Sat', hours: 3.7, assignments: 1 },
    { day: 'Sun', hours: 2.1, assignments: 0 },
  ]

  const learningGoals = [
    {
      title: 'Complete ML Course',
      target: 100,
      current: 78,
      deadline: '2024-02-15',
      status: 'on-track',
    },
    {
      title: 'Study 40h/week',
      target: 40,
      current: 42.5,
      deadline: 'Weekly',
      status: 'achieved',
    },
    {
      title: 'Maintain 85% Average',
      target: 85,
      current: 87.3,
      deadline: 'Semester',
      status: 'achieved',
    },
    {
      title: 'Complete All Assignments',
      target: 27,
      current: 18,
      deadline: '2024-03-01',
      status: 'behind',
    },
  ]

  const timeRangeOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'semester', label: 'This Semester' },
    { value: 'year', label: 'This Year' },
  ]

  const metricOptions = [
    { value: 'overall', label: 'Overall Performance' },
    { value: 'time', label: 'Time Management' },
    { value: 'scores', label: 'Score Analysis' },
    { value: 'progress', label: 'Course Progress' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'text-success-600 bg-success-100'
      case 'on-track':
        return 'text-primary-600 bg-primary-100'
      case 'behind':
        return 'text-destructive-600 bg-destructive-100'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-success-600' : 'text-destructive-600'
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Track your learning progress and performance
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus-ring"
              >
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {overallStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="bg-card rounded-lg border border-border card-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <span className={`text-sm font-medium ${getTrendColor(stat.trend)}`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-card-foreground">
                      {stat.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {stat.unit}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Progress */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">Course Progress</h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {courseProgress.map((course) => (
                    <div key={course.code} className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-card-foreground">{course.course}</h3>
                          <p className="text-sm text-muted-foreground">{course.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-card-foreground">
                            {course.progress}% Complete
                          </p>
                          <p className={`text-xs ${getTrendColor(course.trend)}`}>
                            {course.trend === 'up' ? '↗' : '↘'} Trending {course.trend}
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Time Spent</p>
                          <p className="font-medium text-card-foreground">{course.timeSpent}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Score</p>
                          <p className="font-medium text-card-foreground">{course.avgScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Assignments</p>
                          <p className="font-medium text-card-foreground">
                            {course.assignments.completed}/{course.assignments.total}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Learning Goals */}
          <div>
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">Learning Goals</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {learningGoals.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-card-foreground">{goal.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(goal.status)}`}>
                          {goal.status.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            goal.status === 'achieved' ? 'bg-success-500' :
                            goal.status === 'on-track' ? 'bg-primary' :
                            'bg-destructive'
                          }`}
                          style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{goal.current} / {goal.target}</span>
                        <span>{goal.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Activity Chart */}
            <div className="bg-card rounded-lg border border-border card-shadow mt-6">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">Weekly Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {weeklyActivity.map((day) => (
                    <div key={day.day} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-card-foreground w-8">
                          {day.day}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2 w-20">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(day.hours / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-card-foreground">{day.hours}h</p>
                        <p className="text-xs text-muted-foreground">{day.assignments} tasks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}