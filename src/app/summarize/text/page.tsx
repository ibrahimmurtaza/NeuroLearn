'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, Zap, Clock, Copy, Download, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed'
  language: string
}

export default function PlainTextSummary() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [summary, setSummary] = useState('')
  const [options, setOptions] = useState<SummaryOptions>({
    length: 'medium',
    language: 'en'
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [wordCount, setWordCount] = useState(0)

  const handleTextChange = (value: string) => {
    setText(value)
    setWordCount(value.trim().split(/\s+/).filter(word => word.length > 0).length)
  }

  const handleGenerateSummary = async () => {
    if (!text.trim()) return
    
    setIsProcessing(true)
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/summarize/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          length: options.length,
          language: options.language
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }
      
      const data = await response.json()
      setSummary(data.summary)
      setProcessingTime(data.processingTime || Date.now() - startTime)
    } catch (error) {
      console.error('Error generating summary:', error)
      alert('Failed to generate summary. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      alert('Summary copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleExport = () => {
    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `summary-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setText('')
    setSummary('')
    setWordCount(0)
    setProcessingTime(null)
  }

  const getLengthDescription = (length: string) => {
    switch (length) {
      case 'short': return '~100 words, 30 seconds'
      case 'medium': return '~250 words, 45 seconds'
      case 'detailed': return '~500 words, 60 seconds'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/summarize" className="text-blue-600 hover:text-blue-800 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Plain Text Summary
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Transform your text into concise, actionable summaries
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Input Text
              </h2>
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Paste your text here... (up to 50,000 characters)"
                className="w-full h-64 p-4 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                maxLength={50000}
              />
              <div className="flex justify-between items-center mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span>{wordCount} words</span>
                <span>{text.length}/50,000 characters</span>
              </div>
            </div>

            {/* Summary Options */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Summary Options
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Summary Length
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['short', 'medium', 'detailed'] as const).map((length) => (
                      <button
                        key={length}
                        onClick={() => setOptions(prev => ({ ...prev, length }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          options.length === length
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-sm font-medium capitalize">{length}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {getLengthDescription(length)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={options.language}
                    onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={!text.trim() || isProcessing}
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating Summary...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generated Summary
                </h2>
                {summary && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleExport}
                      className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Export as text file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                      title="Reset all"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {summary ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                  
                  {processingTime && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Generated in {(processingTime / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Your generated summary will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}