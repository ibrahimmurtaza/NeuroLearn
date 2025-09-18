'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText, 
  Save, 
  Download, 
  Share2, 
  Settings, 
  Zap, 
  RefreshCw, 
  Copy, 
  Eye, 
  Edit3, 
  Maximize2, 
  Minimize2, 
  Languages, 
  BookOpen, 
  Brain, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2
} from 'lucide-react'
import { Document, Summary, SummaryType, SummaryLength, ProcessingStatus } from '@/types/summarization'
import { useSummarization } from '@/hooks/useSummarization'

export default function SummaryWorkspace() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const documentId = searchParams.get('document')
  const action = searchParams.get('action')
  
  const {
    summaries,
    isLoading,
    error,
    processingStatus,
    generateSummary,
    updateSummary,
    deleteSummary,
    exportSummary,
    startPolling,
    stopPolling,
    clearError
  } = useSummarization();
  
  const [document, setDocument] = useState<Document | null>(null)
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  
  // Summary generation settings
  const [summaryType, setSummaryType] = useState<SummaryType>('extractive')
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium')
  const [language, setLanguage] = useState('en')
  const [customPrompt, setCustomPrompt] = useState('')
  
  // Content states
  const [originalContent, setOriginalContent] = useState('')
  const [summaryContent, setSummaryContent] = useState('')
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  
  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId)
      fetchSummaries(documentId)
    } else if (action === 'quick') {
      // Quick summary mode
      setLoading(false)
    }
  }, [documentId, action])

  const fetchDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/summarize/upload?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
        setOriginalContent(data.document.content || '')
      }
    } catch (error) {
      console.error('Error fetching document:', error)
    }
  }

  const fetchSummaries = async (docId: string) => {
    try {
      const response = await fetch(`/api/summarize/generate?document_id=${docId}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries || [])
        if (data.summaries?.length > 0) {
          setActiveSummary(data.summaries[0])
          setSummaryContent(data.summaries[0].content)
          setKeyPoints(data.summaries[0].key_points || [])
        }
      }
    } catch (error) {
      console.error('Error fetching summaries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!document && !originalContent) return
    
    // Frontend validation
    if (!summaryType) {
      alert('Please select a summary type')
      return
    }

    if (!language) {
      alert('Please select a language')
      return
    }

    if (customPrompt && customPrompt.length > 1000) {
      alert('Custom prompt must be less than 1000 characters')
      return
    }

    const validSummaryTypes = ['extractive', 'abstractive', 'bullet_points', 'key_insights']
    if (!validSummaryTypes.includes(summaryType)) {
      alert('Invalid summary type selected')
      return
    }

    const validLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja']
    if (!validLanguages.includes(language)) {
      alert('Invalid language selected')
      return
    }

    // Validate document ID if document exists
    if (document && !document.id) {
      alert('Invalid document selected. Please try selecting the document again.')
      return
    }

    // Validate UUID format if document ID exists
    if (document?.id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(document.id)) {
        alert('Invalid document ID format. Please try selecting the document again.')
        return
      }
    }
    
    setGenerating(true)
    try {
      const result = await generateSummary({
        documentId: document?.id,
        summaryType: summaryType,
        language,
        customPrompt: customPrompt || undefined,
        userId: user?.id || ''
      })
      
      if (result) {
        setSummaries(prev => [result, ...prev])
        setActiveSummary(result)
        setSummaryContent(result.content)
        setKeyPoints(result.key_points || [])
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      let errorMessage = 'Failed to generate summary. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('Document not found')) {
          errorMessage = 'Document not found. Please make sure you have selected a valid document.'
        } else if (error.message.includes('Invalid document ID')) {
          errorMessage = 'Invalid document selected. Please try selecting the document again.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(errorMessage)
    } finally {
      setGenerating(false)
    }
  }

  const saveSummary = async () => {
    if (!activeSummary) return
    
    try {
      const response = await fetch('/api/summarize/generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summaryId: activeSummary.id,
          content: summaryContent,
          keyPoints: keyPoints,
          userId: user?.id || ''
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setEditMode(false)
          // Update the summary in the list
          setSummaries(prev => prev.map(s => 
            s.id === activeSummary.id 
              ? { ...s, content: summaryContent, keyPoints: keyPoints }
              : s
          ))
          // TODO: Show success toast
        } else {
          throw new Error(result.error || 'Failed to save summary')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving summary:', error)
      // TODO: Show user-friendly error toast
      alert(error instanceof Error ? error.message : 'Failed to save summary. Please try again.')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // TODO: Show toast notification
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleExportSummary = async () => {
    if (!activeSummary) return
    
    try {
      await exportSummary(activeSummary.id, 'markdown')
    } catch (error) {
      console.error('Error exporting summary:', error)
      alert('Failed to export summary. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {document?.title || 'Quick Summary'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {document ? `${document.type.toUpperCase()} • ${Math.round((document.file_size || 0) / 1024)} KB` : 'Text Input'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeSummary && (
              <>
                <button
                  onClick={() => copyToClipboard(summaryContent)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportSummary}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Export summary"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Share">
                  <Share2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Sidebar - Summary Settings */}
        <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Generation Settings */}
            <div>
              <h3 className="font-medium text-foreground mb-4 flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Summary Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Summary Type
                  </label>
                  <select
                    value={summaryType}
                    onChange={(e) => setSummaryType(e.target.value as SummaryType)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="extractive">Extractive</option>
                    <option value="abstractive">Abstractive</option>
                    <option value="bullet_points">Bullet Points</option>
                    <option value="key_insights">Key Insights</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Length
                  </label>
                  <select
                    value={summaryLength}
                    onChange={(e) => setSummaryLength(e.target.value as SummaryLength)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="short">Short (1-2 paragraphs)</option>
                    <option value="medium">Medium (3-4 paragraphs)</option>
                    <option value="long">Long (5+ paragraphs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
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

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Custom Prompt (Optional)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add specific instructions for the AI..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={generating || (!document && !originalContent)}
                className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </button>
            </div>

            {/* Summary History */}
            {summaries.length > 0 && (
              <div>
                <h3 className="font-medium text-foreground mb-4 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Summary History
                </h3>
                <div className="space-y-2">
                  {summaries.map((summary) => (
                    <button
                      key={summary.id}
                      onClick={() => {
                        setActiveSummary(summary)
                        setSummaryContent(summary.content)
                        setKeyPoints(summary.key_points || [])
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        activeSummary?.id === summary.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {summary.summary_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(summary.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {summary.content.substring(0, 100)}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h3 className="font-medium text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/summarize/notes"
                  className="w-full inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Notes
                </Link>
                <Link
                  href="/summarize/analysis"
                  className="w-full inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyze Document
                </Link>
                <Link
                  href="/summarize/export"
                  className="w-full inline-flex items-center px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Options
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Original Content */}
          {!action && document && (
            <div className="flex-1 border-r border-border">
              <div className="p-6 border-b border-border">
                <h3 className="font-medium text-foreground flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Original Document
                </h3>
              </div>
              <div className="p-6 h-[calc(100%-73px)] overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {originalContent ? (
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                      {originalContent}
                    </pre>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No content available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Input for Text */}
          {action === 'quick' && (
            <div className="flex-1 border-r border-border">
              <div className="p-6 border-b border-border">
                <h3 className="font-medium text-foreground flex items-center">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Input Text
                </h3>
              </div>
              <div className="p-6 h-[calc(100%-73px)]">
                <textarea
                  value={originalContent}
                  onChange={(e) => setOriginalContent(e.target.value)}
                  placeholder="Paste or type your text here to generate a summary..."
                  className="w-full h-full resize-none border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Summary Content */}
          <div className="flex-1">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Summary
                  {activeSummary && (
                    <span className="ml-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                      {activeSummary.summary_type}
                    </span>
                  )}
                </h3>
                {activeSummary && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`p-2 rounded-lg transition-colors ${
                        editMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {editMode && (
                      <button
                        onClick={saveSummary}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 h-[calc(100%-73px)] overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Generating summary...</span>
                </div>
              )}
              
              {/* Processing Status Indicators */}
              {Object.entries(processingStatus).map(([summaryId, status]) => {
                if (status === 'processing') {
                  const summary = summaries.find(s => s.id === summaryId);
                  return (
                    <div key={summaryId} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-blue-700 font-medium">
                          Processing {summary?.summaryType || 'summary'}...
                        </span>
                      </div>
                      <div className="mt-2 bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              
              {activeSummary ? (
                <div className="space-y-6">
                  {/* Summary Content */}
                  <div>
                    {editMode ? (
                      <textarea
                        value={summaryContent}
                        onChange={(e) => setSummaryContent(e.target.value)}
                        className="w-full h-64 resize-none border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-foreground">
                          {summaryContent}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Key Points */}
                  {keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Key Points
                      </h4>
                      <div className="space-y-2">
                        {keyPoints.map((point, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <p className="text-foreground">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">No Summary Generated</h4>
                  <p className="text-muted-foreground mb-6">
                    {document || originalContent
                      ? 'Click "Generate Summary" to create an AI-powered summary'
                      : 'Upload a document or enter text to get started'}
                  </p>
                  {(document || originalContent) && (
                    <button
                      onClick={handleGenerateSummary}
                      disabled={generating}
                      className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          Generate Summary
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}