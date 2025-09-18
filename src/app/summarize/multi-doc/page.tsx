'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  FileText, 
  Plus, 
  X, 
  Search, 
  Filter, 
  BarChart3, 
  Network, 
  Lightbulb, 
  Download, 
  Share2, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Copy, 
  BookOpen, 
  Brain, 
  Zap,
  ArrowRight,
  Link2
} from 'lucide-react'
import { Document, Summary } from '@/types/summarization'

interface MultiDocAnalysis {
  id: string
  title: string
  documents: Document[]
  analysis: string
  insights: string[]
  connections: Array<{
    doc1: string
    doc2: string
    relationship: string
    strength: number
  }>
  themes: Array<{
    name: string
    frequency: number
    documents: string[]
  }>
  created_at: string
  updated_at: string
}

export default function MultiDocumentAnalysis() {
  const { user } = useAuth()
  
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([])
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<MultiDocAnalysis | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<MultiDocAnalysis[]>([])
  
  // Analysis options
  const [analysisType, setAnalysisType] = useState<'comparative' | 'thematic' | 'chronological' | 'argumentative'>('comparative')
  const [language, setLanguage] = useState('en')
  const [includeConnections, setIncludeConnections] = useState(true)
  const [includeThemes, setIncludeThemes] = useState(true)
  
  useEffect(() => {
    fetchDocuments()
    fetchAnalysisHistory()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/summarize/upload')
      if (response.ok) {
        const data = await response.json()
        setAvailableDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalysisHistory = async () => {
    try {
      const response = await fetch('/api/summarize/multi-doc')
      if (response.ok) {
        const data = await response.json()
        setAnalysisHistory(data.analyses || [])
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error)
    }
  }

  const addDocument = (document: Document) => {
    if (!selectedDocuments.find(d => d.id === document.id)) {
      setSelectedDocuments(prev => [...prev, document])
    }
  }

  const removeDocument = (documentId: string) => {
    setSelectedDocuments(prev => prev.filter(d => d.id !== documentId))
  }

  const analyzeDocuments = async () => {
    if (selectedDocuments.length < 2) return
    
    setAnalyzing(true)
    try {
      const response = await fetch('/api/summarize/multi-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: selectedDocuments.map(d => d.id),
          analysis_type: analysisType,
          language,
          include_connections: includeConnections,
          include_themes: includeThemes
        })
      })

      if (response.ok) {
        const result = await response.json()
        setAnalysis(result.analysis)
        setAnalysisHistory(prev => [result.analysis, ...prev])
      }
    } catch (error) {
      console.error('Error analyzing documents:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const exportAnalysis = () => {
    if (!analysis) return
    
    const content = `# Multi-Document Analysis: ${analysis.title}\n\n## Documents Analyzed\n\n${analysis.documents.map(doc => `- ${doc.title}`).join('\n')}\n\n## Analysis\n\n${analysis.analysis}\n\n## Key Insights\n\n${analysis.insights.map(insight => `- ${insight}`).join('\n')}\n\n## Document Connections\n\n${analysis.connections.map(conn => `- ${conn.doc1} ↔ ${conn.doc2}: ${conn.relationship} (${Math.round(conn.strength * 100)}% strength)`).join('\n')}\n\n## Themes\n\n${analysis.themes.map(theme => `- **${theme.name}** (${theme.frequency} occurrences): ${theme.documents.join(', ')}`).join('\n')}`
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analysis.title.replace(/\s+/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // TODO: Show toast notification
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const filteredDocuments = availableDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Multi-Document Analysis</h1>
              <p className="text-muted-foreground mt-2">
                Analyze relationships, themes, and insights across multiple documents
              </p>
            </div>
            <div className="flex items-center gap-3">
              {analysis && (
                <>
                  <button
                    onClick={() => copyToClipboard(analysis.analysis)}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    onClick={exportAnalysis}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document Selection */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Documents
              </h2>
              
              {/* Selected Documents */}
              {selectedDocuments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Selected ({selectedDocuments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocument(doc.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              {/* Available Documents */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocuments.find(d => d.id === doc.id)
                        ? 'bg-primary/10 border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => addDocument(doc)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!selectedDocuments.find(d => d.id === doc.id) && (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Analysis Options */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Analysis Options</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Analysis Type</label>
                    <select
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value as any)}
                      className="w-full mt-1 p-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="comparative">Comparative Analysis</option>
                      <option value="thematic">Thematic Analysis</option>
                      <option value="chronological">Chronological Analysis</option>
                      <option value="argumentative">Argumentative Analysis</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeConnections}
                        onChange={(e) => setIncludeConnections(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs">Include document connections</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeThemes}
                        onChange={(e) => setIncludeThemes(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs">Include theme analysis</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Analyze Button */}
              <button
                onClick={analyzeDocuments}
                disabled={selectedDocuments.length < 2 || analyzing}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Analyze Documents
                  </>
                )}
              </button>
              
              {selectedDocuments.length < 2 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Select at least 2 documents to analyze
                </p>
              )}
            </div>
          </div>
          
          {/* Analysis Results */}
          <div className="lg:col-span-2">
            {analysis ? (
              <div className="space-y-6">
                {/* Analysis Overview */}
                <div className="bg-card rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analysis Results
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed
                    </div>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-foreground">
                      {analysis.analysis}
                    </div>
                  </div>
                </div>
                
                {/* Key Insights */}
                {analysis.insights && analysis.insights.length > 0 && (
                  <div className="bg-card rounded-xl border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Key Insights
                    </h3>
                    <div className="space-y-3">
                      {analysis.insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                          </div>
                          <p className="text-sm text-foreground">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Document Connections */}
                {analysis.connections && analysis.connections.length > 0 && (
                  <div className="bg-card rounded-xl border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Network className="h-5 w-5" />
                      Document Connections
                    </h3>
                    <div className="space-y-3">
                      {analysis.connections.map((connection, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm font-medium">{connection.doc1}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{connection.doc2}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {connection.relationship}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${connection.strength * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(connection.strength * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Themes */}
                {analysis.themes && analysis.themes.length > 0 && (
                  <div className="bg-card rounded-xl border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Common Themes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.themes.map((theme, index) => (
                        <div key={index} className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{theme.name}</h4>
                            <span className="text-sm text-muted-foreground">
                              {theme.frequency} occurrences
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {theme.documents.map((doc, docIndex) => (
                              <span key={docIndex} className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-xl border p-12 text-center">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
                <p className="text-muted-foreground mb-6">
                  Select at least 2 documents from the left panel and click "Analyze Documents" to get started.
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Network className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="font-medium">Find Connections</p>
                    <p className="text-muted-foreground text-xs">Discover relationships between documents</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <Lightbulb className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="font-medium">Extract Insights</p>
                    <p className="text-muted-foreground text-xs">Generate key insights and themes</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Analysis History */}
        {analysisHistory.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Analysis History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysisHistory.slice(0, 6).map((item) => (
                <div key={item.id} className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => setAnalysis(item)}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.analysis.substring(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.documents.length} documents</span>
                    <span>{item.insights.length} insights</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}