'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BookOpen, Users, Calendar, TrendingUp, Award, Clock } from 'lucide-react'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

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

  const stats = [
    {
      title: 'Active Courses',
      value: '4',
      icon: BookOpen,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Assignments Due',
      value: '7',
      icon: Clock,
      color: 'text-warning-600',
      bgColor: 'bg-warning-50',
    },
    {
      title: 'Study Groups',
      value: '3',
      icon: Users,
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
    },
    {
      title: 'Achievement Points',
      value: '1,250',
      icon: Award,
      color: 'text-success-600',
      bgColor: 'bg-success-50',
    },
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'assignment',
      title: 'Machine Learning Basics - Assignment 3',
      course: 'CS 4641',
      dueDate: '2024-01-15',
      status: 'pending',
    },
    {
      id: 2,
      type: 'collaboration',
      title: 'Study Group: Data Structures Review',
      course: 'CS 1332',
      dueDate: '2024-01-12',
      status: 'active',
    },
    {
      id: 3,
      type: 'achievement',
      title: 'Completed Neural Networks Module',
      course: 'CS 4641',
      dueDate: '2024-01-10',
      status: 'completed',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your learning journey today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="bg-card rounded-lg p-6 border border-border card-shadow interactive"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-card-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Recent Activities
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-card-foreground">
                          {activity.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {activity.course} • Due {activity.dueDate}
                        </p>
                      </div>
                      <div className="ml-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            activity.status === 'completed'
                              ? 'bg-success-100 text-success-700'
                              : activity.status === 'active'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Quick Actions
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </button>
                <button className="w-full flex items-center justify-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                  <Users className="h-4 w-4 mr-2" />
                  Join Study Group
                </button>
                <button className="w-full flex items-center justify-center px-4 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </button>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Learning Progress
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="text-card-foreground font-medium">68%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">This Week</span>
                      <span className="text-card-foreground font-medium">12 hrs</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-success-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}