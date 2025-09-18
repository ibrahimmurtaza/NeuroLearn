'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Users, MessageCircle, Video, Calendar, Plus, Search, Filter, Clock, BookOpen } from 'lucide-react'

export default function Collaboration() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('study-groups')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')

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

  const studyGroups = [
    {
      id: 1,
      name: 'Machine Learning Study Circle',
      course: 'CS 4641',
      members: 8,
      maxMembers: 12,
      nextSession: '2024-01-15 7:00 PM',
      topic: 'Neural Networks Deep Dive',
      status: 'active',
      isJoined: true,
      description: 'Weekly sessions focusing on practical ML implementations and theory review.',
      tags: ['machine-learning', 'python', 'theory'],
    },
    {
      id: 2,
      name: 'Algorithms Problem Solving',
      course: 'CS 1332',
      members: 6,
      maxMembers: 10,
      nextSession: '2024-01-16 6:30 PM',
      topic: 'Dynamic Programming Practice',
      status: 'active',
      isJoined: true,
      description: 'Collaborative problem-solving sessions for algorithm challenges.',
      tags: ['algorithms', 'problem-solving', 'coding'],
    },
    {
      id: 3,
      name: 'Database Design Workshop',
      course: 'CS 4400',
      members: 5,
      maxMembers: 8,
      nextSession: '2024-01-17 8:00 PM',
      topic: 'Normalization Techniques',
      status: 'recruiting',
      isJoined: false,
      description: 'Hands-on database design and optimization techniques.',
      tags: ['database', 'sql', 'design'],
    },
    {
      id: 4,
      name: 'Linear Algebra Tutoring',
      course: 'MATH 1554',
      members: 4,
      maxMembers: 6,
      nextSession: '2024-01-18 5:00 PM',
      topic: 'Eigenvalues & Eigenvectors',
      status: 'active',
      isJoined: false,
      description: 'Peer tutoring sessions for challenging linear algebra concepts.',
      tags: ['mathematics', 'tutoring', 'theory'],
    },
  ]

  const peerSessions = [
    {
      id: 1,
      title: 'Code Review Session',
      host: 'Sarah Chen',
      participants: 4,
      maxParticipants: 6,
      scheduledTime: '2024-01-15 3:00 PM',
      duration: '1 hour',
      type: 'code-review',
      course: 'CS 4641',
      description: 'Review and discuss neural network implementations.',
      isJoined: true,
    },
    {
      id: 2,
      title: 'Exam Prep Discussion',
      host: 'Michael Rodriguez',
      participants: 8,
      maxParticipants: 10,
      scheduledTime: '2024-01-16 7:00 PM',
      duration: '2 hours',
      type: 'exam-prep',
      course: 'CS 1332',
      description: 'Final exam preparation and concept review.',
      isJoined: false,
    },
    {
      id: 3,
      title: 'Project Collaboration',
      host: 'Emily Wang',
      participants: 3,
      maxParticipants: 4,
      scheduledTime: '2024-01-17 4:00 PM',
      duration: '3 hours',
      type: 'project',
      course: 'CS 4400',
      description: 'Work together on database design project.',
      isJoined: false,
    },
  ]

  const tabs = [
    { id: 'study-groups', label: 'Study Groups', icon: Users },
    { id: 'peer-sessions', label: 'Peer Sessions', icon: Video },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
  ]

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'joined', label: 'Joined' },
    { value: 'available', label: 'Available' },
    { value: 'recruiting', label: 'Recruiting' },
  ]

  const filteredStudyGroups = studyGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.topic.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterBy === 'all' || 
                         (filterBy === 'joined' && group.isJoined) ||
                         (filterBy === 'available' && !group.isJoined) ||
                         (filterBy === 'recruiting' && group.status === 'recruiting')
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-700'
      case 'recruiting':
        return 'bg-warning-100 text-warning-700'
      default:
        return 'bg-secondary-100 text-secondary-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code-review':
        return <BookOpen className="h-4 w-4" />
      case 'exam-prep':
        return <Calendar className="h-4 w-4" />
      case 'project':
        return <Users className="h-4 w-4" />
      default:
        return <MessageCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Collaboration</h1>
            <p className="text-muted-foreground">
              Connect with peers and join study groups
            </p>
          </div>
          <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Study Groups Tab */}
        {activeTab === 'study-groups' && (
          <div>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search study groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus-ring"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-border rounded-lg bg-background text-foreground focus-ring appearance-none"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Study Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredStudyGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                  onClick={() => router.push(`/collaboration/groups/${group.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-card-foreground mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {group.course} • Next: {group.topic}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(group.status)}`}>
                          {group.status}
                        </span>
                        {group.isJoined && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                            Joined
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {group.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-accent-100 text-accent-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {group.members}/{group.maxMembers} members
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {group.nextSession}
                      </div>
                    </div>

                    <button
                      className={`w-full px-4 py-2 rounded-lg transition-colors ${
                        group.isJoined
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle join/leave logic
                      }}
                    >
                      {group.isJoined ? 'View Group' : 'Join Group'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peer Sessions Tab */}
        {activeTab === 'peer-sessions' && (
          <div>
            <div className="space-y-4">
              {peerSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                  onClick={() => router.push(`/collaboration/sessions/${session.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          {getTypeIcon(session.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-card-foreground mb-1">
                            {session.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Hosted by {session.host} • {session.course}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.description}
                          </p>
                        </div>
                      </div>
                      {session.isJoined && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-100 text-success-700">
                          Joined
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {session.scheduledTime}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {session.duration}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {session.participants}/{session.maxParticipants} participants
                      </div>
                      <div className="flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        {session.type.replace('-', ' ')}
                      </div>
                    </div>

                    <button
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        session.isJoined
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle join/leave logic
                      }}
                    >
                      {session.isJoined ? 'View Session' : 'Join Session'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-card rounded-lg border border-border card-shadow">
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Messages Coming Soon</h3>
              <p className="text-muted-foreground">
                Direct messaging and group chat features will be available soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}