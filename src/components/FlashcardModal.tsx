'use client'

import { useState } from 'react'
import { X, Download, FileText, RotateCcw } from 'lucide-react'

interface Flashcard {
  question: string
  answer: string
}

interface FlashcardModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDocuments: Array<{ id: string; name: string }>
}

interface FlashcardDisplayProps {
  flashcards: Flashcard[]
  topic: string
  onExport: (format: 'pdf' | 'csv' | 'anki') => void
  onClose: () => void
  flashcardSetId?: string | null
  showSuccessMessage?: boolean
}

// Individual flashcard component with flip animation
function FlashcardItem({ flashcard, index }: { flashcard: Flashcard; index: number }) {
  const [isFlipped, setIsFlipped] = useState(false)
  
  return (
    <div className="relative w-full h-48 perspective-1000">
      <div 
        className={`relative w-full h-full transition-transform duration-600 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front side (Question) */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 flex flex-col justify-center items-center text-white shadow-lg">
          <div className="text-sm font-medium mb-2 opacity-80">Question {index + 1}</div>
          <div className="text-center text-lg font-semibold leading-relaxed">
            {flashcard.question}
          </div>
          <div className="mt-4 text-xs opacity-60 flex items-center">
            <RotateCcw className="h-3 w-3 mr-1" />
            Click to reveal answer
          </div>
        </div>
        
        {/* Back side (Answer) */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 flex flex-col justify-center items-center text-white shadow-lg">
          <div className="text-sm font-medium mb-2 opacity-80">Answer</div>
          <div className="text-center text-base leading-relaxed">
            {flashcard.answer}
          </div>
          <div className="mt-4 text-xs opacity-60 flex items-center">
            <RotateCcw className="h-3 w-3 mr-1" />
            Click to see question
          </div>
        </div>
      </div>
    </div>
  )
}

// Flashcard display component
function FlashcardDisplay({ flashcards, topic, onExport, onClose, flashcardSetId, showSuccessMessage }: FlashcardDisplayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Flashcards: {topic}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {flashcards.length} flashcards generated
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Export buttons */}
              <div className="flex items-center space-x-2 mr-4">
                <button
                  onClick={() => onExport('pdf')}
                  className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => onExport('csv')}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => onExport('anki')}
                  className="px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Anki</span>
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Success message */}
        {showSuccessMessage && flashcardSetId && (
          <div className="mx-6 mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Flashcards saved successfully!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    Your flashcards are now available in your flashcard library.
                  </p>
                </div>
              </div>
              <a
                href="summarize/flashcards"
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md transition-colors"
              >
                View in Library
              </a>
            </div>
          </div>
        )}
        
        {/* Flashcards grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcards.map((flashcard, index) => (
              <FlashcardItem key={index} flashcard={flashcard} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main flashcard modal component
export default function FlashcardModal({ isOpen, onClose, selectedDocuments }: FlashcardModalProps) {
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  if (!isOpen) return null
  
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }
    
    if (selectedDocuments.length === 0) {
      setError('Please select at least one document')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic.trim(),
          documentIds: selectedDocuments.map(doc => doc.id)
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate flashcards')
      }
      
      const data = await response.json()
      setFlashcards(data.flashcards)
      setFlashcardSetId(data.flashcardSetId)
      setShowFlashcards(true)
      
      // Show success message if flashcards were saved to database
      if (data.flashcardSetId) {
        setShowSuccessMessage(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleExport = async (format: 'pdf' | 'csv' | 'anki') => {
    try {
      const response = await fetch('/api/flashcards/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flashcards,
          topic,
          format
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `flashcards-${topic.replace(/\s+/g, '-')}.${format === 'anki' ? 'txt' : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export flashcards. Please try again.')
    }
  }
  
  const handleClose = () => {
    setTopic('')
    setFlashcards([])
    setError(null)
    setShowFlashcards(false)
    setFlashcardSetId(null)
    setShowSuccessMessage(false)
    onClose()
  }
  
  // Show flashcards if they've been generated
  if (showFlashcards && flashcards.length > 0) {
    return (
      <FlashcardDisplay
        flashcards={flashcards}
        topic={topic}
        onExport={handleExport}
        onClose={handleClose}
        flashcardSetId={flashcardSetId}
        showSuccessMessage={showSuccessMessage}
      />
    )
  }
  
  // Show generation modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generate Flashcards
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Generate flashcards from {selectedDocuments.length} selected document{selectedDocuments.length !== 1 ? 's' : ''}
        </p>
        
        {/* Selected documents */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Documents:
          </label>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 max-h-24 overflow-y-auto">
            {selectedDocuments.map((doc, index) => (
              <div key={doc.id} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="h-4 w-4" />
                <span>{doc.name}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Topic input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter Topic *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Machine Learning, History of Rome, Photosynthesis"
            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={isGenerating}
          />
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className={`flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors ${
              isGenerating 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isGenerating || !topic.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}