'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, BookOpen, FileText, BarChart3, Settings, Shield, AlertTriangle, TrendingUp, Activity, Search, Filter, MoreVertical, Edit, Trash2, Eye, UserPlus, Plus, Download, Upload } from 'lucide-react'

export default function Admin() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
    // In a real app, check if user has admin privileges
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'content', label: 'Content', icon: <FileText className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  const overviewStats = [
    { label: 'Total Users', value: '2,847', change: '+12%', trend: 'up', icon: <Users className="h-6 w-6" /> },
    { label: 'Active Courses', value: '156', change: '+8%', trend: 'up', icon: <BookOpen className="h-6 w-6" /> },
    { label: 'Assignments', value: '1,234', change: '+15%', trend: 'up', icon: <FileText className="h-6 w-6" /> },
    { label: 'System Health', value: '99.9%', change: '+0.1%', trend: 'up', icon: <Activity className="h-6 w-6" /> },
  ]

  const recentUsers = [
    { id: 1, name: 'Alice Johnson', email: 'alice@gatech.edu', role: 'Student', status: 'Active', joinDate: '2024-01-15', lastActive: '2 hours ago' },
    { id: 2, name: 'Bob Smith', email: 'bob@gatech.edu', role: 'Instructor', status: 'Active', joinDate: '2024-01-10', lastActive: '1 day ago' },
    { id: 3, name: 'Carol Davis', email: 'carol@gatech.edu', role: 'Student', status: 'Inactive', joinDate: '2024-01-08', lastActive: '1 week ago' },
    { id: 4, name: 'David Wilson', email: 'david@gatech.edu', role: 'Admin', status: 'Active', joinDate: '2024-01-05', lastActive: '30 minutes ago' },
  ]

  const courses = [
    { id: 1, title: 'Introduction to Machine Learning', instructor: 'Dr. Smith', students: 45, status: 'Active', created: '2024-01-01', lastUpdated: '2024-01-20' },
    { id: 2, title: 'Data Structures and Algorithms', instructor: 'Prof. Johnson', students: 67, status: 'Active', created: '2023-12-15', lastUpdated: '2024-01-18' },
    { id: 3, title: 'Web Development Fundamentals', instructor: 'Dr. Brown', students: 32, status: 'Draft', created: '2024-01-10', lastUpdated: '2024-01-19' },
    { id: 4, title: 'Database Systems', instructor: 'Prof. Davis', students: 28, status: 'Archived', created: '2023-11-20', lastUpdated: '2024-01-15' },
  ]

  const systemAlerts = [
    { id: 1, type: 'warning', message: 'Server load is above 80%', time: '5 minutes ago' },
    { id: 2, type: 'info', message: 'Scheduled maintenance in 2 hours', time: '1 hour ago' },
    { id: 3, type: 'error', message: 'Failed login attempts detected', time: '3 hours ago' },
  ]

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'inactive': return 'text-red-600 bg-red-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      case 'archived': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'text-purple-600 bg-purple-100'
      case 'instructor': return 'text-blue-600 bg-blue-100'
      case 'student': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredUsers = recentUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || user.role.toLowerCase() === selectedFilter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || course.status.toLowerCase() === selectedFilter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage users, courses, and system settings
            </p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </button>
            <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Quick Action
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewStats.map((stat, index) => (
                <div key={index} className="bg-card rounded-lg border border-border card-shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                      <p className={`text-sm flex items-center mt-1 ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.change}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* System Alerts */}
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">System Alerts</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {systemAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm text-card-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-card rounded-lg border border-border card-shadow">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-card-foreground">Recent Users</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentUsers.slice(0, 4).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-card-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border card-shadow">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-card-foreground">Course Activity</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {courses.slice(0, 4).map((course) => (
                      <div key={course.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{course.title}</p>
                          <p className="text-xs text-muted-foreground">{course.instructor} • {course.students} students</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                          {course.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus-ring"
                />
              </div>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus-ring"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>
              <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border border-border card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Join Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-card-foreground">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user.joinDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user.lastActive}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-muted-foreground hover:text-foreground">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-muted-foreground hover:text-foreground">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-muted-foreground hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus-ring"
                />
              </div>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus-ring"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </button>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-card rounded-lg border border-border card-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-card-foreground mb-2">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.instructor}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                        {course.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Students:</span>
                        <span className="text-card-foreground font-medium">{course.students}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-card-foreground">{course.created}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="text-card-foreground">{course.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex space-x-2">
                        <button className="text-muted-foreground hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-muted-foreground hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <button className="text-primary hover:text-primary/80 text-sm font-medium">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs would be implemented similarly */}
        {activeTab === 'content' && (
          <div className="bg-card rounded-lg border border-border card-shadow p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Content Management</h3>
            <p className="text-muted-foreground">Content management features will be implemented here.</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-card rounded-lg border border-border card-shadow p-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Advanced Analytics</h3>
            <p className="text-muted-foreground">Advanced analytics and reporting features will be implemented here.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-card rounded-lg border border-border card-shadow p-8 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">System Settings</h3>
            <p className="text-muted-foreground">System configuration and settings will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  )
}