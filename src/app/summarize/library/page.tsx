'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Upload, FileText, Search, Filter, Grid, List, Download, Trash2, Eye, CheckSquare, Square, Plus, Brain } from 'lucide-react'
import Link from 'next/link'
import FlashcardModal from '@/components/FlashcardModal'

interface Document {
  id: string
  filename: string
  file_type: string
  storage_path: string
  metadata: any
  processing_status: 'pending' | 'processing' | 'completed' | 'error'
  created_at: string
  updated_at: string
  folder_id?: string
  folders?: {
    id: string
    name: string
  }
  // Computed fields for UI compatibility
  name?: string
  type?: string
  size?: number
  uploadDate?: string
  status?: 'processing' | 'completed' | 'error'
  summary?: string
  tags?: string[]
}

interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed'
  focus: 'general' | 'key-points' | 'action-items' | 'technical'
  language: string
  customPrompt?: string
}

export default function DocumentSummary() {
  const { user, loading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    length: 'medium',
    focus: 'general',
    language: 'en',
    customPrompt: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentDoc: '' })
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [showBatchSummary, setShowBatchSummary] = useState(false)
  const [showFlashcardModal, setShowFlashcardModal] = useState(false)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (!loading && user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchDocuments()
    }
  }, [loading, user?.id])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/documents')
      
      if (response.status === 401) {
        console.error('Authentication required - redirecting to login')
        window.location.href = '/auth/login'
        return
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.documents) {
        // Map API response fields to UI expected fields
        const mappedDocuments = data.documents.map((doc: any) => ({
          ...doc,
          name: doc.filename,
          type: doc.file_type,
          uploadDate: doc.created_at,
          status: doc.processing_status === 'pending' ? 'processing' : doc.processing_status,
          size: doc.metadata?.size || 0,
          tags: doc.metadata?.tags || []
        }))
        
        setDocuments(mappedDocuments)
      } else {
        setDocuments([])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      setError('Failed to load documents. Please try refreshing the page.')
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true)
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('files', file)
      
      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.status === 401) {
          console.error('Authentication required for upload')
          alert('Please log in to upload documents')
          window.location.href = '/auth/login'
          return
        }
        
        if (response.ok) {
          const result = await response.json()
          // Reset the fetch flag and refresh documents list after successful upload
          hasFetchedRef.current = false
          await fetchDocuments()
          hasFetchedRef.current = true
        } else {
          const error = await response.json()
          console.error('Upload failed:', error)
          alert(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error uploading file:', error)
        alert(`Failed to upload ${file.name}. Please try again.`)
      }
    }
    
    setIsUploading(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }

  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocs(newSelected)
  }

  const selectAllDocs = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(doc => doc.id)))
    }
  }

  const handleBatchSummarize = async () => {
    if (selectedDocs.size === 0) return
    
    if (!user?.id) {
      setNotification({ type: 'error', message: 'Please log in to summarize documents' })
      return
    }

    setIsProcessing(true)
    const selectedDocuments = documents.filter(doc => selectedDocs.has(doc.id))
    setProcessingProgress({ current: 0, total: selectedDocuments.length, currentDoc: 'Preparing documents...' })
    setNotification({ type: 'info', message: `Starting batch summarization of ${selectedDocuments.length} documents...` })

    try {
      // Map length option to correct summaryType
      const getSummaryType = (length: string) => {
        switch (length) {
          case 'short': return 'brief';
          case 'medium': return 'medium';
          case 'detailed': return 'detailed';
          default: return 'medium';
        }
      };

      // Show progress for each document being processed
      for (let i = 0; i < selectedDocuments.length; i++) {
        setProcessingProgress({ 
          current: i, 
          total: selectedDocuments.length, 
          currentDoc: `Processing "${selectedDocuments[i].name || selectedDocuments[i].title || `Document ${i + 1}`}"...` 
        })
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      setProcessingProgress({ 
        current: selectedDocuments.length, 
        total: selectedDocuments.length, 
        currentDoc: 'Generating summaries...' 
      })

      const response = await fetch('/api/summarize/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocs),
          options: {
            summaryType: getSummaryType(summaryOptions.length || 'medium'),
            language: 'en',
            length: summaryOptions.length || 'medium',
            focusArea: (summaryOptions.focus || 'general').replace('-', '_')
          },
          customPrompt: summaryOptions.customPrompt
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        const { successfulSummaries, failedSummaries, totalDocuments } = result.metadata
        
        if (successfulSummaries > 0) {
          setNotification({ 
            type: 'success', 
            message: `Successfully generated ${successfulSummaries} summaries${failedSummaries > 0 ? ` (${failedSummaries} failed)` : ''}!` 
          })
        } else {
          setNotification({ type: 'error', message: 'Failed to generate any summaries. Please try again.' })
        }
        
        setSelectedDocs(new Set())
        setShowBatchSummary(false)
        await fetchDocuments()
        
        // Redirect to analysis page after a short delay
        setTimeout(() => {
          window.location.href = '/summarize/analysis'
        }, 2000)
      } else {
        const error = await response.json()
        setNotification({ type: 'error', message: `Failed to generate summaries: ${error.error || 'Unknown error'}` })
      }
    } catch (error) {
      console.error('Error starting batch summarization:', error)
      setNotification({ type: 'error', message: 'Failed to start batch summarization. Please try again.' })
    } finally {
      setIsProcessing(false)
      setProcessingProgress({ current: 0, total: 0, currentDoc: '' })
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchDocuments()
        setSelectedDocs(prev => {
          const newSet = new Set(prev)
          newSet.delete(docId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document. Please try again.')
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
    const matchesFilter = filterType === 'all' || (doc.type?.includes(filterType) ?? false)
    return matchesSearch && matchesFilter
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/summarize" className="text-green-600 hover:text-green-800 transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Document Library
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload, organize, and summarize your documents
                </p>
              </div>
            </div>
            
            {selectedDocs.size > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBatchSummary(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Summarize Selected ({selectedDocs.size})</span>
                </button>
                <button
                  onClick={() => setShowFlashcardModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all flex items-center space-x-2"
                >
                  <Brain className="h-5 w-5" />
                  <span>Generate Flashcards ({selectedDocs.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mb-8">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-green-300 dark:border-green-600 rounded-2xl p-8 text-center bg-white dark:bg-gray-800 hover:border-green-400 dark:hover:border-green-500 transition-colors"
          >
            <Upload className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Upload Documents
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                'Choose Files'
              )}
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supported formats: PDF, DOC, DOCX, TXT, MD (Max 10MB each)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="txt">Text</option>
                <option value="md">Markdown</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              {documents.length > 0 && (
                <button
                  onClick={selectAllDocs}
                  className="flex items-center space-x-2 px-4 py-2 text-green-600 hover:text-green-800 transition-colors"
                >
                  {selectedDocs.size === filteredDocuments.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  <span>Select All</span>
                </button>
              )}
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 max-w-md mx-auto">
              <div className="text-red-500 mb-2">
                <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-700 dark:text-red-300 font-medium mb-2">Error Loading Documents</p>
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* Documents Grid/List */
          filteredDocuments.length > 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all ${
                  selectedDocs.has(doc.id) ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleDocSelection(doc.id)}
                      className="text-green-500 hover:text-green-600 transition-colors"
                    >
                      {selectedDocs.has(doc.id) ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(`/api/documents/${doc.id}/view`, '_blank')}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                      className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                  {doc.name}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(doc.size || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span>{new Date(doc.uploadDate || new Date()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      doc.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                
                {doc.summary && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Summary: {doc.name}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {doc.summary}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No documents found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Upload your first document to get started
            </p>
          </div>
        )
        )}

        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Batch Summary Modal */}
        {showBatchSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Generate Topic-Specific Summaries
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create focused summaries from selected documents using retrieval-based analysis
              </p>
              
              {/* Processing Progress */}
               {isProcessing && (
                 <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                   <div className="flex items-center space-x-3 mb-2">
                     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                     <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                       {processingProgress.currentDoc || 'Processing documents...'}
                     </span>
                   </div>
                   {processingProgress.total > 0 && (
                     <>
                       <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
                         <div 
                           className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                           style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                         ></div>
                       </div>
                       <div className="text-xs text-blue-600 dark:text-blue-400 text-center">
                         {processingProgress.current} of {processingProgress.total} documents
                       </div>
                     </>
                   )}
                 </div>
               )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Prompt (Optional)
                  </label>
                  <textarea
                    value={summaryOptions.customPrompt || ''}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, customPrompt: e.target.value }))}
                    placeholder="Enter a specific topic or question to generate focused summaries from relevant document sections. Leave empty for general summarization."
                    rows={3}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Summary Length
                  </label>
                  <select
                    value={summaryOptions.length}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, length: e.target.value as any }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="short">Short (~100 words)</option>
                    <option value="medium">Medium (~250 words)</option>
                    <option value="detailed">Detailed (~500 words)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Focus Area
                  </label>
                  <select
                    value={summaryOptions.focus}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, focus: e.target.value as any }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="general">General Overview</option>
                    <option value="key-points">Key Points</option>
                    <option value="action-items">Action Items</option>
                    <option value="technical">Technical Details</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowBatchSummary(false)}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors ${
                    isProcessing 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSummarize}
                  disabled={isProcessing || selectedDocs.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    isProcessing || selectedDocs.size === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white`}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Start Summarization</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Flashcard Modal */}
        <FlashcardModal
          isOpen={showFlashcardModal}
          onClose={() => setShowFlashcardModal(false)}
          selectedDocuments={documents.filter(doc => selectedDocs.has(doc.id))}
        />
      </div>
    </div>
  )
}