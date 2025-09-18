import { useState, useCallback } from 'react'
import { Note, Flashcard, StudySession, NoteType, FlashcardDifficulty } from '@/types/summarization'

interface NotesOptions {
  type: NoteType
  language: string
  includeImages?: boolean
  includeCharts?: boolean
  maxLength?: number
}

interface FlashcardsOptions {
  difficulty: FlashcardDifficulty
  language: string
  count?: number
  includeImages?: boolean
}

interface StudySessionOptions {
  flashcardIds: string[]
  sessionType: 'review' | 'learn' | 'test'
  timeLimit?: number
  shuffleCards?: boolean
}

interface UseNotesReturn {
  notes: Note[]
  flashcards: Flashcard[]
  studySessions: StudySession[]
  loading: boolean
  error: string | null
  generateNotes: (documentId: string, options: NotesOptions) => Promise<Note | null>
  generateFlashcards: (documentId: string, options: FlashcardsOptions) => Promise<Flashcard[]>
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<boolean>
  deleteNote: (noteId: string) => Promise<boolean>
  updateFlashcard: (flashcardId: string, updates: Partial<Flashcard>) => Promise<boolean>
  deleteFlashcard: (flashcardId: string) => Promise<boolean>
  startStudySession: (options: StudySessionOptions) => Promise<StudySession | null>
  updateStudySession: (sessionId: string, updates: Partial<StudySession>) => Promise<boolean>
  endStudySession: (sessionId: string) => Promise<boolean>
  answerFlashcard: (sessionId: string, flashcardId: string, correct: boolean, timeSpent: number) => Promise<boolean>
  getStudyStats: (flashcardIds?: string[]) => Promise<StudyStats | null>
  exportNotes: (noteIds: string[], format: 'pdf' | 'docx' | 'markdown') => Promise<string | null>
  exportFlashcards: (flashcardIds: string[], format: 'json' | 'csv' | 'anki') => Promise<string | null>
  clearError: () => void
}

interface StudyStats {
  totalCards: number
  studiedCards: number
  correctAnswers: number
  incorrectAnswers: number
  averageTimePerCard: number
  streakCount: number
  masteredCards: number
  difficultCards: number
  studyTime: number
  sessionsCompleted: number
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const generateNotes = useCallback(async (
    documentId: string,
    options: NotesOptions
  ): Promise<Note | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          type: 'notes',
          note_type: options.type,
          language: options.language,
          include_images: options.includeImages || false,
          include_charts: options.includeCharts || false,
          max_length: options.maxLength || 2000
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate notes')
      }

      const data = await response.json()
      const note = data.note
      setNotes(prev => [note, ...prev])
      return note
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate notes'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateFlashcards = useCallback(async (
    documentId: string,
    options: FlashcardsOptions
  ): Promise<Flashcard[]> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          type: 'flashcards',
          difficulty: options.difficulty,
          language: options.language,
          count: options.count || 20,
          include_images: options.includeImages || false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate flashcards')
      }

      const data = await response.json()
      const newFlashcards = data.flashcards
      setFlashcards(prev => [...newFlashcards, ...prev])
      return newFlashcards
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate flashcards'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const updateNote = useCallback(async (
    noteId: string,
    updates: Partial<Note>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note_id: noteId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update note')
      }

      const data = await response.json()
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, ...data.note } : note
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note_id: noteId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      setNotes(prev => prev.filter(note => note.id !== noteId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note'
      setError(errorMessage)
      return false
    }
  }, [])

  const updateFlashcard = useCallback(async (
    flashcardId: string,
    updates: Partial<Flashcard>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcard_id: flashcardId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update flashcard')
      }

      const data = await response.json()
      setFlashcards(prev => prev.map(card => 
        card.id === flashcardId ? { ...card, ...data.flashcard } : card
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update flashcard'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteFlashcard = useCallback(async (flashcardId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/notes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flashcard_id: flashcardId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete flashcard')
      }

      setFlashcards(prev => prev.filter(card => card.id !== flashcardId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete flashcard'
      setError(errorMessage)
      return false
    }
  }, [])

  const startStudySession = useCallback(async (
    options: StudySessionOptions
  ): Promise<StudySession | null> => {
    try {
      const response = await fetch('/api/summarize/study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcard_ids: options.flashcardIds,
          session_type: options.sessionType,
          time_limit: options.timeLimit,
          shuffle_cards: options.shuffleCards || true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start study session')
      }

      const data = await response.json()
      const session = data.session
      setStudySessions(prev => [session, ...prev])
      return session
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start study session'
      setError(errorMessage)
      return null
    }
  }, [])

  const updateStudySession = useCallback(async (
    sessionId: string,
    updates: Partial<StudySession>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/study', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update study session')
      }

      const data = await response.json()
      setStudySessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, ...data.session } : session
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update study session'
      setError(errorMessage)
      return false
    }
  }, [])

  const endStudySession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/study', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (!response.ok) {
        throw new Error('Failed to end study session')
      }

      setStudySessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'completed', ended_at: new Date().toISOString() }
          : session
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end study session'
      setError(errorMessage)
      return false
    }
  }, [])

  const answerFlashcard = useCallback(async (
    sessionId: string,
    flashcardId: string,
    correct: boolean,
    timeSpent: number
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/study/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          flashcard_id: flashcardId,
          correct,
          time_spent: timeSpent
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record answer')
      }

      // Update local flashcard statistics
      setFlashcards(prev => prev.map(card => {
        if (card.id === flashcardId) {
          return {
            ...card,
            times_reviewed: card.times_reviewed + 1,
            times_correct: card.times_correct + (correct ? 1 : 0),
            last_reviewed: new Date().toISOString(),
            difficulty: correct 
              ? (card.difficulty === 'hard' ? 'medium' : card.difficulty === 'medium' ? 'easy' : 'easy')
              : (card.difficulty === 'easy' ? 'medium' : card.difficulty === 'medium' ? 'hard' : 'hard')
          }
        }
        return card
      }))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record answer'
      setError(errorMessage)
      return false
    }
  }, [])

  const getStudyStats = useCallback(async (
    flashcardIds?: string[]
  ): Promise<StudyStats | null> => {
    try {
      const params = flashcardIds ? `?flashcard_ids=${JSON.stringify(flashcardIds)}` : ''
      const response = await fetch(`/api/summarize/study/stats${params}`)

      if (!response.ok) {
        throw new Error('Failed to get study stats')
      }

      const data = await response.json()
      return data.stats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get study stats'
      setError(errorMessage)
      return null
    }
  }, [])

  const exportNotes = useCallback(async (
    noteIds: string[],
    format: 'pdf' | 'docx' | 'markdown'
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/summarize/export/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note_ids: noteIds,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export notes')
      }

      const data = await response.json()
      return data.download_url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export notes'
      setError(errorMessage)
      return null
    }
  }, [])

  const exportFlashcards = useCallback(async (
    flashcardIds: string[],
    format: 'json' | 'csv' | 'anki'
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/summarize/export/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcard_ids: flashcardIds,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export flashcards')
      }

      const data = await response.json()
      return data.download_url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export flashcards'
      setError(errorMessage)
      return null
    }
  }, [])

  return {
    notes,
    flashcards,
    studySessions,
    loading,
    error,
    generateNotes,
    generateFlashcards,
    updateNote,
    deleteNote,
    updateFlashcard,
    deleteFlashcard,
    startStudySession,
    updateStudySession,
    endStudySession,
    answerFlashcard,
    getStudyStats,
    exportNotes,
    exportFlashcards,
    clearError
  }
}

export default useNotes