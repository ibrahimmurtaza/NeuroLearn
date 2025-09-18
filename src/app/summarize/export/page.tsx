'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Download, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Presentation, 
  Mail, 
  Share2, 
  Copy, 
  Check, 
  Settings, 
  Filter, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Star, 
  Archive, 
  Trash2, 
  Eye, 
  Edit3, 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Zap, 
  Palette, 
  Layout, 
  Type, 
  Sliders, 
  Globe, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Printer, 
  Cloud, 
  HardDrive, 
  Link, 
  QrCode, 
  X, 
  Plus, 
  ChevronDown, 
  ChevronRight
} from 'lucide-react'
import { Document, Summary } from '@/types/summarization'

interface ExportItem {
  id: string
  title: string
  type: 'summary' | 'notes' | 'flashcards' | 'analysis'
  format: 'pdf' | 'docx' | 'pptx' | 'html' | 'markdown' | 'json' | 'csv'
  size: number
  created_at: string
  updated_at: string
  status: 'ready' | 'processing' | 'failed'
  download_url?: string
  user_id: string
  source_document?: string
  tags: string[]
  is_favorite: boolean
}

interface ExportTemplate {
  id: string
  name: string
  description: string
  format: ExportItem['format']
  icon: any
  color: string
  features: string[]
}

interface ExportSettings {
  format: ExportItem['format']
  template: string
  includeMetadata: boolean
  includeImages: boolean
  includeCharts: boolean
  pageSize: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
  fontSize: 'small' | 'medium' | 'large'
  theme: 'light' | 'dark' | 'auto'
  language: string
  watermark: boolean
  headerFooter: boolean
}

export default function ExportCenter() {
  const { user } = useAuth()
  
  const [exportItems, setExportItems] = useState<ExportItem[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Export settings
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'pdf',
    template: 'professional',
    includeMetadata: true,
    includeImages: true,
    includeCharts: true,
    pageSize: 'A4',
    orientation: 'portrait',
    fontSize: 'medium',
    theme: 'light',
    language: 'en',
    watermark: false,
    headerFooter: true
  })
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | ExportItem['type']>('all')
  const [filterFormat, setFilterFormat] = useState<'all' | ExportItem['format']>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSettings, setShowSettings] = useState(false)
  
  const exportTemplates: ExportTemplate[] = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional PDF with formatting and images',
      format: 'pdf',
      icon: FileText,
      color: 'bg-red-100 text-red-600',
      features: ['Print-ready', 'Searchable text', 'Embedded images', 'Professional layout']
    },
    {
      id: 'docx',
      name: 'Word Document',
      description: 'Editable Microsoft Word document',
      format: 'docx',
      icon: Edit3,
      color: 'bg-blue-100 text-blue-600',
      features: ['Fully editable', 'Track changes', 'Comments', 'Collaborative']
    },
    {
      id: 'pptx',
      name: 'PowerPoint',
      description: 'Interactive presentation slides',
      format: 'pptx',
      icon: Presentation,
      color: 'bg-orange-100 text-orange-600',
      features: ['Slide layouts', 'Animations', 'Speaker notes', 'Interactive']
    },
    {
      id: 'html',
      name: 'Web Page',
      description: 'Interactive HTML with responsive design',
      format: 'html',
      icon: Globe,
      color: 'bg-green-100 text-green-600',
      features: ['Responsive', 'Interactive', 'Searchable', 'Shareable']
    },
    {
      id: 'markdown',
      name: 'Markdown',
      description: 'Plain text with formatting syntax',
      format: 'markdown',
      icon: Type,
      color: 'bg-gray-100 text-gray-600',
      features: ['Lightweight', 'Version control', 'Platform independent', 'Developer friendly']
    },
    {
      id: 'json',
      name: 'JSON Data',
      description: 'Structured data for applications',
      format: 'json',
      icon: Settings,
      color: 'bg-purple-100 text-purple-600',
      features: ['Machine readable', 'API integration', 'Structured', 'Programmatic']
    }
  ]

  useEffect(() => {
    loadExportItems()
    loadSummaries()
  }, [])

  const loadExportItems = async () => {
    try {
      const response = await fetch('/api/summarize/exports')
      if (response.ok) {
        const data = await response.json()
        setExportItems(data.exports || [])
      } else {
        console.error('Failed to load export items')
        setExportItems([])
      }
    } catch (error) {
      console.error('Error loading export items:', error)
      setExportItems([])
    }
  }

  const loadSummaries = async () => {
    try {
      const response = await fetch('/api/summarize/generate')
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries || [])
      }
    } catch (error) {
      console.error('Error loading summaries:', error)
    }
  }

  const createExport = async () => {
    if (selectedItems.length === 0) return
    
    setProcessing(true)
    
    try {
      const response = await fetch('/api/summarize/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: selectedItems,
          settings: exportSettings
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setExportItems(prev => [data.export, ...prev])
        setShowExportModal(false)
        setSelectedItems([])
      } else {
        console.error('Failed to create export')
      }
      
    } catch (error) {
      console.error('Error creating export:', error)
    } finally {
      setProcessing(false)
    }
  }

  const downloadExport = async (item: ExportItem) => {
    if (!item.download_url) return
    
    try {
      const response = await fetch(`/api/summarize/exports/${item.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${item.title}.${item.format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Failed to download export')
      }
    } catch (error) {
      console.error('Error downloading export:', error)
    }
  }

  const deleteExport = async (itemId: string) => {
    try {
      const response = await fetch(`/api/summarize/exports/${itemId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setExportItems(prev => prev.filter(item => item.id !== itemId))
      } else {
        console.error('Failed to delete export')
      }
    } catch (error) {
      console.error('Error deleting export:', error)
    }
  }

  const toggleFavorite = async (itemId: string) => {
    try {
      const response = await fetch(`/api/summarize/exports/${itemId}/favorite`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        setExportItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, is_favorite: !item.is_favorite }
            : item
        ))
      } else {
        console.error('Failed to toggle favorite')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const copyShareLink = (item: ExportItem) => {
    const shareUrl = `${window.location.origin}/share/export/${item.id}`
    navigator.clipboard.writeText(shareUrl)
    // Show toast notification
  }

  const filteredItems = exportItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'all' || item.type === filterType
    const matchesFormat = filterFormat === 'all' || item.format === filterFormat
    return matchesSearch && matchesType && matchesFormat
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.title.localeCompare(b.title)
      case 'size': return b.size - a.size
      case 'date': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default: return 0
    }
  })

  const getStatusIcon = (status: ExportItem['status']) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getFormatIcon = (format: ExportItem['format']) => {
    const template = exportTemplates.find(t => t.format === format)
    const Icon = template?.icon || FileText
    return <Icon className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Export Center</h1>
            <p className="text-muted-foreground">
              Export your summaries, notes, and analyses in various formats
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-169px)]">
        {/* Sidebar - Templates & Stats */}
        <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Export Templates */}
            <div>
              <h3 className="font-medium text-foreground mb-4">Export Formats</h3>
              <div className="space-y-3">
                {exportTemplates.map(template => {
                  const Icon = template.icon
                  return (
                    <div key={template.id} className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${template.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.features.slice(0, 2).map(feature => (
                              <span key={feature} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="font-medium text-foreground mb-4">Export Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{exportItems.length}</div>
                  <div className="text-xs text-muted-foreground">Total Exports</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">
                    {exportItems.filter(item => item.status === 'ready').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Ready</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">
                    {exportItems.filter(item => item.is_favorite).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">
                    {formatFileSize(exportItems.reduce((total, item) => total + item.size, 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Size</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-medium text-foreground mb-4">Recent Exports</h3>
              <div className="space-y-2">
                {exportItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center space-x-2 text-sm">
                    {getStatusIcon(item.status)}
                    <span className="text-foreground truncate">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search exports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All Types</option>
                  <option value="summary">Summaries</option>
                  <option value="notes">Notes</option>
                  <option value="flashcards">Flashcards</option>
                  <option value="analysis">Analysis</option>
                </select>
                
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All Formats</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="pptx">PowerPoint</option>
                  <option value="html">HTML</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="size">Sort by Size</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <Layout className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                </button>
                <div className="text-sm text-muted-foreground ml-4">
                  {sortedItems.length} exports
                </div>
              </div>
            </div>
          </div>

          {/* Exports Grid/List */}
          <div className="flex-1 p-4 overflow-y-auto">
            {sortedItems.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedItems.map(item => {
                    const template = exportTemplates.find(t => t.format === item.format)
                    const Icon = template?.icon || FileText
                    
                    return (
                      <div key={item.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${template?.color || 'bg-gray-100 text-gray-600'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className={`p-1 rounded transition-colors ${
                                item.is_favorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                            </button>
                            {getStatusIcon(item.status)}
                          </div>
                        </div>
                        
                        <h3 className="font-medium text-foreground mb-2 line-clamp-2">{item.title}</h3>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <span className="text-foreground capitalize">{item.type}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Size</span>
                            <span className="text-foreground">{formatFileSize(item.size)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Created</span>
                            <span className="text-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {item.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          {item.status === 'ready' && (
                            <>
                              <button
                                onClick={() => downloadExport(item)}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </button>
                              <button
                                onClick={() => copyShareLink(item)}
                                className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                title="Copy share link"
                              >
                                <Share2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                          {item.status === 'processing' && (
                            <div className="flex-1 text-center text-sm text-muted-foreground">
                              Processing...
                            </div>
                          )}
                          <button
                            onClick={() => deleteExport(item.id)}
                            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors"
                            title="Delete export"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedItems.map(item => {
                    const template = exportTemplates.find(t => t.format === item.format)
                    const Icon = template?.icon || FileText
                    
                    return (
                      <div key={item.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${template?.color || 'bg-gray-100 text-gray-600'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{item.title}</h3>
                              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                                <span className="capitalize">{item.type}</span>
                                <span>{formatFileSize(item.size)}</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                {item.source_document && (
                                  <span>from {item.source_document}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                item.is_favorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                            </button>
                            {getStatusIcon(item.status)}
                            {item.status === 'ready' && (
                              <>
                                <button
                                  onClick={() => downloadExport(item)}
                                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => copyShareLink(item)}
                                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                                  title="Share"
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => deleteExport(item.id)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Download className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Exports Found</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first export to get started
                </p>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Export
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Create New Export</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Format Selection */}
                <div>
                  <h3 className="font-medium text-foreground mb-4">Select Format</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {exportTemplates.map(template => {
                      const Icon = template.icon
                      return (
                        <button
                          key={template.id}
                          onClick={() => setExportSettings(prev => ({ ...prev, format: template.format }))}
                          className={`p-4 border rounded-lg text-left transition-colors ${
                            exportSettings.format === template.format
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${template.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.features.slice(0, 2).map(feature => (
                                  <span key={feature} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Export Settings */}
                <div>
                  <h3 className="font-medium text-foreground mb-4">Export Settings</h3>
                  <div className="space-y-4">
                    {/* Content Options */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Content Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={exportSettings.includeMetadata}
                            onChange={(e) => setExportSettings(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-foreground">Include metadata</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={exportSettings.includeImages}
                            onChange={(e) => setExportSettings(prev => ({ ...prev, includeImages: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-foreground">Include images</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={exportSettings.includeCharts}
                            onChange={(e) => setExportSettings(prev => ({ ...prev, includeCharts: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-foreground">Include charts</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Page Settings */}
                    {(exportSettings.format === 'pdf' || exportSettings.format === 'docx') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Page Size
                          </label>
                          <select
                            value={exportSettings.pageSize}
                            onChange={(e) => setExportSettings(prev => ({ ...prev, pageSize: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="A4">A4</option>
                            <option value="Letter">Letter</option>
                            <option value="Legal">Legal</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Orientation
                          </label>
                          <select
                            value={exportSettings.orientation}
                            onChange={(e) => setExportSettings(prev => ({ ...prev, orientation: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          >
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Font Size
                      </label>
                      <select
                        value={exportSettings.fontSize}
                        onChange={(e) => setExportSettings(prev => ({ ...prev, fontSize: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    
                    {/* Theme */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Theme
                      </label>
                      <select
                        value={exportSettings.theme}
                        onChange={(e) => setExportSettings(prev => ({ ...prev, theme: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Language
                      </label>
                      <select
                        value={exportSettings.language}
                        onChange={(e) => setExportSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createExport}
                  disabled={selectedItems.length === 0 || processing}
                  className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Create Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}