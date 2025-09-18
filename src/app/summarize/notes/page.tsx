'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  BookOpen, 
  Brain, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Share2, 
  Copy, 
  Edit3, 
  Trash2, 
  Star, 
  StarOff, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Check, 
  X, 
  Zap, 
  FileText, 
  Settings, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Shuffle,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react'
import { Note, Flashcard, Document } from '@/types/summarization'

interface StudySession {
  id: string
  type: 'notes' | 'flashcards'
  documentId: string
  documentTitle: string
  totalItems: number
  completedItems: number
  correctAnswers: number
  startTime: Date
  endTime?: Date
  score?: number
}

export default function NotesFlashcards() {
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'study'>('notes')
  const [documents, setDocuments] = useState<Document[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  
  // Generation state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationType, setGenerationType] = useState<'notes' | 'flashcards'>('notes')
  
  // Notes state
  const [notesSearch, setNotesSearch] = useState('')
  const [notesFilter, setNotesFilter] = useState<'all' | 'favorites' | 'recent'>('all')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  
  // Flashcards state
  const [flashcardsSearch, setFlashcardsSearch] = useState('')
  const [flashcardsFilter, setFlashcardsFilter] = useState<'all' | 'favorites' | 'difficult'>('all')
  const [studyMode, setStudyMode] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [studyCards, setStudyCards] = useState<Flashcard[]>([])
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null)
  
  // Generation options
  const [noteType, setNoteType] = useState<'outline' | 'summary' | 'detailed'>('outline')
  const [flashcardDifficulty, setFlashcardDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [flashcardCount, setFlashcardCount] = useState(10)
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    loadDocuments()
    loadNotes()
    loadFlashcards()
    loadStudySessions()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/summarize/upload')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/summarize/notes?type=notes')
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const loadFlashcards = async () => {
    try {
      const response = await fetch('/api/summarize/notes?type=flashcards')
      if (response.ok) {
        const data = await response.json()
        setFlashcards(data.flashcards || [])
      }
    } catch (error) {
      console.error('Error loading flashcards:', error)
    }
  }

  const loadStudySessions = async () => {
    try {
      const response = await fetch('/api/summarize/study-sessions')
      if (response.ok) {
        const data = await response.json()
        setStudySessions(data.sessions || [])
      } else {
        console.error('Failed to fetch study sessions:', response.statusText)
        setStudySessions([])
      }
    } catch (error) {
      console.error('Error loading study sessions:', error)
      setStudySessions([])
    }
  }

  const generateContent = async () => {
    if (!selectedDocument) return
    
    setGenerating(true)
    
    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: selectedDocument.id,
          type: generationType,
          note_type: noteType,
          difficulty: flashcardDifficulty,
          count: flashcardCount,
          language
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (generationType === 'notes') {
          setNotes(prev => [...prev, ...data.notes])
        } else {
          setFlashcards(prev => [...prev, ...data.flashcards])
        }
        
        setSelectedDocument(null)
      }
    } catch (error) {
      console.error('Error generating content:', error)
    } finally {
      setGenerating(false)
    }
  }

  const startStudySession = (cards: Flashcard[]) => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    setStudyCards(shuffledCards)
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setStudyMode(true)
    
    const session: StudySession = {
      id: Date.now().toString(),
      type: 'flashcards',
      documentId: cards[0]?.document_id || '',
      documentTitle: documents.find(d => d.id === cards[0]?.document_id)?.title || 'Unknown',
      totalItems: cards.length,
      completedItems: 0,
      correctAnswers: 0,
      startTime: new Date()
    }
    
    setCurrentSession(session)
  }

  const handleCardAnswer = (correct: boolean) => {
    if (!currentSession) return
    
    const updatedSession = {
      ...currentSession,
      completedItems: currentSession.completedItems + 1,
      correctAnswers: correct ? currentSession.correctAnswers + 1 : currentSession.correctAnswers
    }
    
    setCurrentSession(updatedSession)
    
    if (currentCardIndex < studyCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setShowAnswer(false)
    } else {
      // Session complete
      const finalSession = {
        ...updatedSession,
        endTime: new Date(),
        score: Math.round((updatedSession.correctAnswers / updatedSession.totalItems) * 100)
      }
      
      setStudySessions(prev => [finalSession, ...prev])
      setStudyMode(false)
      setCurrentSession(null)
    }
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(notesSearch.toLowerCase()) ||
                         note.content.toLowerCase().includes(notesSearch.toLowerCase())
    
    switch (notesFilter) {
      case 'favorites': return matchesSearch && note.is_favorite
      case 'recent': return matchesSearch && new Date(note.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      default: return matchesSearch
    }
  })

  const filteredFlashcards = flashcards.filter(card => {
    const matchesSearch = card.question.toLowerCase().includes(flashcardsSearch.toLowerCase()) ||
                         card.answer.toLowerCase().includes(flashcardsSearch.toLowerCase())
    
    switch (flashcardsFilter) {
      case 'favorites': return matchesSearch && card.is_favorite
      case 'difficult': return matchesSearch && card.difficulty === 'hard'
      default: return matchesSearch
    }
  })

  const toggleNoteFavorite = async (noteId: string) => {
    try {
      const response = await fetch(`/api/summarize/notes/${noteId}/favorite`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        setNotes(prev => prev.map(note => 
          note.id === noteId ? { ...note, is_favorite: !note.is_favorite } : note
        ))
      } else {
        console.error('Failed to toggle note favorite:', response.statusText)
      }
    } catch (error) {
      console.error('Error toggling note favorite:', error)
    }
  }

  const toggleFlashcardFavorite = async (cardId: string) => {
    try {
      const response = await fetch(`/api/summarize/flashcards/${cardId}/favorite`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        setFlashcards(prev => prev.map(card => 
          card.id === cardId ? { ...card, is_favorite: !card.is_favorite } : card
        ))
      } else {
        console.error('Failed to toggle flashcard favorite:', response.statusText)
      }
    } catch (error) {
      console.error('Error toggling flashcard favorite:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/summarize/notes/${noteId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
      } else {
        console.error('Failed to delete note:', response.statusText)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const deleteFlashcard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/summarize/flashcards/${cardId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setFlashcards(prev => prev.filter(card => card.id !== cardId))
      } else {
        console.error('Failed to delete flashcard:', response.statusText)
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error)
    }
  }

  const exportNotes = () => {
    const content = filteredNotes.map(note => 
      `# ${note.title}\n\n${note.content}\n\n---\n\n`
    ).join('')
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'notes.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportFlashcards = () => {
    const content = filteredFlashcards.map(card => 
      `Q: ${card.question}\nA: ${card.answer}\n\n`
    ).join('')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flashcards.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (studyMode && studyCards.length > 0) {
    const currentCard = studyCards[currentCardIndex]
    
    return (
      <div className="min-h-screen bg-background">
        {/* Study Header */}
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setStudyMode(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Study Session</h1>
                <p className="text-sm text-muted-foreground">
                  {currentSession?.documentTitle}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {currentCardIndex + 1}/{studyCards.length}
                </div>
                <div className="text-xs text-muted-foreground">Cards</div>
              </div>
              
              {currentSession && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round((currentSession.correctAnswers / Math.max(1, currentSession.completedItems)) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="px-6 pb-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentCardIndex + 1) / studyCards.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Study Card */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
              <div className="text-center space-y-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-medium text-foreground">
                    {showAnswer ? 'Answer' : 'Question'}
                  </h2>
                  
                  <div className="min-h-[120px] flex items-center justify-center">
                    <p className="text-lg text-foreground leading-relaxed">
                      {showAnswer ? currentCard.answer : currentCard.question}
                    </p>
                  </div>
                </div>
                
                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Show Answer
                  </button>
                ) : (
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleCardAnswer(false)}
                      className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <X className="h-5 w-5" />
                      <span>Incorrect</span>
                    </button>
                    <button
                      onClick={() => handleCardAnswer(true)}
                      className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="h-5 w-5" />
                      <span>Correct</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Card Navigation */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => {
                  if (currentCardIndex > 0) {
                    setCurrentCardIndex(prev => prev - 1)
                    setShowAnswer(false)
                  }
                }}
                disabled={currentCardIndex === 0}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex space-x-2">
                {studyCards.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentCardIndex ? 'bg-primary' : 
                      index < currentCardIndex ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => {
                  if (currentCardIndex < studyCards.length - 1) {
                    setCurrentCardIndex(prev => prev + 1)
                    setShowAnswer(false)
                  }
                }}
                disabled={currentCardIndex === studyCards.length - 1}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notes &amp; Flashcards</h1>
            <p className="text-muted-foreground">
              Generate and study with AI-powered notes and flashcards
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeTab === 'notes' && (
              <>
                <button
                  onClick={exportNotes}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Export notes"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Share">
                  <Share2 className="h-4 w-4" />
                </button>
              </>
            )}
            
            {activeTab === 'flashcards' && (
              <>
                <button
                  onClick={exportFlashcards}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Export flashcards"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => startStudySession(filteredFlashcards)}
                  disabled={filteredFlashcards.length === 0}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>Start Study</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'notes', label: 'Notes', icon: BookOpen },
              { id: 'flashcards', label: 'Flashcards', icon: Brain },
              { id: 'study', label: 'Study Sessions', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-169px)]">
        {/* Sidebar - Generation */}
        <div className="w-80 border-r border-border bg-card p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Generate New Content */}
            <div>
              <h3 className="font-medium text-foreground mb-4 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Generate New Content
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Document
                  </label>
                  <select
                    value={selectedDocument?.id || ''}
                    onChange={(e) => {
                      const doc = documents.find(d => d.id === e.target.value)
                      setSelectedDocument(doc || null)
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Choose a document...</option>
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Content Type
                  </label>
                  <select
                    value={generationType}
                    onChange={(e) => setGenerationType(e.target.value as 'notes' | 'flashcards')}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="notes">Notes</option>
                    <option value="flashcards">Flashcards</option>
                  </select>
                </div>

                {generationType === 'notes' ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Note Type
                    </label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="outline">Outline</option>
                      <option value="summary">Summary</option>
                      <option value="detailed">Detailed Notes</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Difficulty
                      </label>
                      <select
                        value={flashcardDifficulty}
                        onChange={(e) => setFlashcardDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Number of Cards
                      </label>
                      <select
                        value={flashcardCount}
                        onChange={(e) => setFlashcardCount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value={5}>5 cards</option>
                        <option value={10}>10 cards</option>
                        <option value={15}>15 cards</option>
                        <option value={20}>20 cards</option>
                      </select>
                    </div>
                  </>
                )}

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

                <button
                  onClick={generateContent}
                  disabled={!selectedDocument || generating}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate {generationType === 'notes' ? 'Notes' : 'Flashcards'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="font-medium text-foreground mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{notes.length}</div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{flashcards.length}</div>
                  <div className="text-xs text-muted-foreground">Flashcards</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{studySessions.length}</div>
                  <div className="text-xs text-muted-foreground">Sessions</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary">
                    {studySessions.length > 0 ? 
                      Math.round(studySessions.reduce((acc, s) => acc + (s.score || 0), 0) / studySessions.filter(s => s.score).length) : 0
                    }%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'notes' && (
            <>
              {/* Notes Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search notes..."
                        value={notesSearch}
                        onChange={(e) => setNotesSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    
                    <select
                      value={notesFilter}
                      onChange={(e) => setNotesFilter(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="all">All Notes</option>
                      <option value="favorites">Favorites</option>
                      <option value="recent">Recent</option>
                    </select>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {filteredNotes.length} notes
                  </div>
                </div>
              </div>

              {/* Notes Grid */}
              <div className="flex-1 p-4 overflow-y-auto">
                {filteredNotes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map(note => (
                      <div key={note.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium text-foreground line-clamp-2">{note.title}</h3>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => toggleNoteFavorite(note.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {note.is_favorite ? 
                                <Star className="h-4 w-4 text-yellow-500 fill-current" /> : 
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              }
                            </button>
                            <button
                              onClick={() => setEditingNote(note)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Edit3 className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
                          {note.content}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="capitalize">{note.type}</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Notes Found</h3>
                    <p className="text-muted-foreground mb-6">
                      Generate notes from your documents to get started
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'flashcards' && (
            <>
              {/* Flashcards Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search flashcards..."
                        value={flashcardsSearch}
                        onChange={(e) => setFlashcardsSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    
                    <select
                      value={flashcardsFilter}
                      onChange={(e) => setFlashcardsFilter(e.target.value as any)}
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="all">All Cards</option>
                      <option value="favorites">Favorites</option>
                      <option value="difficult">Difficult</option>
                    </select>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {filteredFlashcards.length} cards
                  </div>
                </div>
              </div>

              {/* Flashcards Grid */}
              <div className="flex-1 p-4 overflow-y-auto">
                {filteredFlashcards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFlashcards.map(card => (
                      <div key={card.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              card.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {card.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleFlashcardFavorite(card.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {card.is_favorite ? 
                                <Star className="h-4 w-4 text-yellow-500 fill-current" /> : 
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              }
                            </button>
                            <button
                              onClick={() => deleteFlashcard(card.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Question</div>
                            <p className="text-sm text-foreground line-clamp-3">{card.question}</p>
                          </div>
                          
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Answer</div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{card.answer}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>{new Date(card.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Flashcards Found</h3>
                    <p className="text-muted-foreground mb-6">
                      Generate flashcards from your documents to get started
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'study' && (
            <>
              {/* Study Sessions Header */}
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-medium text-foreground">Study Sessions</h2>
                <p className="text-sm text-muted-foreground">Track your learning progress</p>
              </div>

              {/* Study Sessions List */}
              <div className="flex-1 p-4 overflow-y-auto">
                {studySessions.length > 0 ? (
                  <div className="space-y-4">
                    {studySessions.map(session => (
                      <div key={session.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              session.type === 'notes' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                            }`}>
                              {session.type === 'notes' ? <BookOpen className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{session.documentTitle}</h3>
                              <p className="text-sm text-muted-foreground capitalize">{session.type} session</p>
                            </div>
                          </div>
                          
                          {session.score && (
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                session.score >= 80 ? 'text-green-600' :
                                session.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {session.score}%
                              </div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Items</div>
                            <div className="font-medium text-foreground">
                              {session.completedItems}/{session.totalItems}
                            </div>
                          </div>
                          
                          {session.type === 'flashcards' && (
                            <div>
                              <div className="text-muted-foreground">Correct</div>
                              <div className="font-medium text-foreground">{session.correctAnswers}</div>
                            </div>
                          )}
                          
                          <div>
                            <div className="text-muted-foreground">Duration</div>
                            <div className="font-medium text-foreground">
                              {session.endTime ? 
                                Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000) + 'm' :
                                'In progress'
                              }
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(session.completedItems / session.totalItems) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Study Sessions</h3>
                    <p className="text-muted-foreground mb-6">
                      Start studying with flashcards to track your progress
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}