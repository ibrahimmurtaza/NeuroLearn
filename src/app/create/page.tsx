'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Plus, FileText, Video, Image, Mic, BookOpen, Users, Settings, Upload, Save, Eye, Share2, Clock, Tag, Globe, Lock } from 'lucide-react'

export default function Create() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('course')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

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

  const contentTypes = [
    {
      id: 'course',
      title: 'Course',
      description: 'Create a comprehensive course with lessons and assessments',
      icon: <BookOpen className="h-6 w-6" />,
      color: 'bg-blue-500',
    },
    {
      id: 'lesson',
      title: 'Lesson',
      description: 'Create individual lessons with multimedia content',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-green-500',
    },
    {
      id: 'assignment',
      title: 'Assignment',
      description: 'Create assignments and homework for students',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-orange-500',
    },
    {
      id: 'quiz',
      title: 'Quiz',
      description: 'Create interactive quizzes and assessments',
      icon: <FileText className="h-6 w-6" />,
      color: 'bg-purple-500',
    },
    {
      id: 'study-group',
      title: 'Study Group',
      description: 'Organize collaborative study sessions',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-pink-500',
    },
  ]

  const courseTemplates = [
    {
      id: 'blank',
      title: 'Blank Course',
      description: 'Start from scratch with a blank course',
      lessons: 0,
      duration: 'Custom',
    },
    {
      id: 'programming',
      title: 'Programming Course',
      description: 'Template for programming and coding courses',
      lessons: 12,
      duration: '8 weeks',
    },
    {
      id: 'mathematics',
      title: 'Mathematics Course',
      description: 'Template for mathematics and calculus courses',
      lessons: 15,
      duration: '10 weeks',
    },
    {
      id: 'science',
      title: 'Science Course',
      description: 'Template for physics, chemistry, and biology',
      lessons: 10,
      duration: '6 weeks',
    },
  ]

  const recentContent = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      type: 'course',
      status: 'draft',
      lastModified: '2024-01-15T10:30:00',
      students: 0,
      lessons: 8,
    },
    {
      id: 2,
      title: 'Linear Algebra Quiz #3',
      type: 'quiz',
      status: 'published',
      lastModified: '2024-01-14T15:45:00',
      students: 24,
      questions: 15,
    },
    {
      id: 3,
      title: 'Data Structures Assignment',
      type: 'assignment',
      status: 'published',
      lastModified: '2024-01-13T09:20:00',
      students: 18,
      dueDate: '2024-01-20T23:59:00',
    },
    {
      id: 4,
      title: 'Neural Networks Study Group',
      type: 'study-group',
      status: 'active',
      lastModified: '2024-01-12T14:15:00',
      members: 6,
      nextSession: '2024-01-16T15:00:00',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700'
      case 'draft':
        return 'bg-yellow-100 text-yellow-700'
      case 'active':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4" />
      case 'lesson':
        return <FileText className="h-4 w-4" />
      case 'assignment':
        return <FileText className="h-4 w-4" />
      case 'quiz':
        return <FileText className="h-4 w-4" />
      case 'study-group':
        return <Users className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
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

  const handleCreateContent = (type: string) => {
    setActiveTab(type)
    setIsCreating(true)
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    // Navigate to course creation with template
    router.push(`/create/course?template=${templateId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Content</h1>
            <p className="text-muted-foreground">
              Design courses, lessons, and assessments for your students
            </p>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Import Content
            </button>
            <button className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Quick Create
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content Types */}
          <div className="lg:col-span-2">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">What would you like to create?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentTypes.map((type) => (
                  <div
                    key={type.id}
                    className="bg-card rounded-lg border border-border card-shadow interactive cursor-pointer"
                    onClick={() => handleCreateContent(type.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${type.color} text-white`}>
                          {type.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-card-foreground mb-2">{type.title}</h3>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Templates */}
            {activeTab === 'course' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Choose a Template</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`bg-card rounded-lg border card-shadow interactive cursor-pointer ${
                        selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      }`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-card-foreground mb-2">{template.title}</h3>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>
                          {selectedTemplate === template.id && (
                            <div className="p-1 bg-primary rounded-full">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{template.lessons} lessons</span>
                          <span>{template.duration}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="flex flex-col items-center p-4 bg-card rounded-lg border border-border card-shadow interactive">
                  <Video className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-card-foreground">Record Video</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-card rounded-lg border border-border card-shadow interactive">
                  <Mic className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-card-foreground">Record Audio</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-card rounded-lg border border-border card-shadow interactive">
                  <Image className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-card-foreground">Upload Images</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-card rounded-lg border border-border card-shadow interactive">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium text-card-foreground">Import Document</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Content */}
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Recent Content</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentContent.map((content) => (
                    <div
                      key={content.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/create/${content.type}/${content.id}`)}
                    >
                      <div className="p-2 bg-muted rounded-lg">
                        {getTypeIcon(content.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-card-foreground truncate">{content.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(content.status)}`}>
                            {content.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Modified {formatDate(content.lastModified)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 text-sm text-primary hover:text-primary/80 transition-colors">
                  View all content →
                </button>
              </div>
            </div>

            {/* Content Stats */}
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground">Content Statistics</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Courses</span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Lessons</span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">48</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Assignments</span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-pink-500" />
                      <span className="text-sm text-muted-foreground">Study Groups</span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-card rounded-lg border border-border card-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">💡 Pro Tips</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>• Use templates to get started quickly with structured content</p>
                  <p>• Add multimedia elements to make lessons more engaging</p>
                  <p>• Set clear learning objectives for each lesson</p>
                  <p>• Include interactive assessments to track progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}