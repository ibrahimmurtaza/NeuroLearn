'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Play, Pause, Upload, Youtube, Clock, FileVideo, Download, Copy, RotateCcw, Settings, Volume2, Maximize } from 'lucide-react'
import Link from 'next/link'

interface VideoSummary {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  timestamps: {
    time: string
    description: string
    importance: 'high' | 'medium' | 'low'
  }[]
  duration: string
  createdAt: string
}

interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed'
  focus: 'general' | 'key-points' | 'action-items' | 'educational'
  includeTimestamps: boolean
  language: string
}

export default function VideoSummary() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload'>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoSummary, setVideoSummary] = useState<VideoSummary | null>(null)
  const [transcript, setTranscript] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    length: 'medium',
    focus: 'general',
    includeTimestamps: true,
    language: 'en'
  })
  const [showOptions, setShowOptions] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl.trim()) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/summarize/video/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          options: summaryOptions
        })
      })

      if (response.ok) {
        const data = await response.json()
        setVideoSummary(data.summary)
        setTranscript(data.transcript)
      } else {
        throw new Error('Failed to process YouTube video')
      }
    } catch (error) {
      console.error('Error processing YouTube video:', error)
      alert('Failed to process YouTube video. Please check the URL and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploadedFile(file)
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('video', file)
    formData.append('options', JSON.stringify(summaryOptions))

    try {
      const response = await fetch('/api/summarize/video/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setVideoSummary(data.summary)
        setTranscript(data.transcript)
      } else {
        throw new Error('Failed to process uploaded video')
      }
    } catch (error) {
      console.error('Error processing uploaded video:', error)
      alert('Failed to process uploaded video. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file)
    }
  }

  const jumpToTimestamp = (timeStr: string) => {
    if (videoRef.current) {
      const [minutes, seconds] = timeStr.split(':').map(Number)
      const totalSeconds = minutes * 60 + seconds
      videoRef.current.currentTime = totalSeconds
      setCurrentTime(totalSeconds)
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const exportSummary = () => {
    if (!videoSummary) return

    const exportData = {
      title: videoSummary.title,
      summary: videoSummary.summary,
      keyPoints: videoSummary.keyPoints,
      timestamps: videoSummary.timestamps,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-summary-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setYoutubeUrl('')
    setUploadedFile(null)
    setVideoSummary(null)
    setTranscript('')
    setCurrentTime(0)
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/summarize" className="text-purple-600 hover:text-purple-800 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FileVideo className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Video Summarization
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Extract key insights from YouTube videos or uploaded files
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <Settings className="h-5 w-5" />
              <span>Options</span>
            </button>
          </div>
        </div>

        {/* Options Panel */}
        {showOptions && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Summary Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Length
                </label>
                <select
                  value={summaryOptions.length}
                  onChange={(e) => setSummaryOptions(prev => ({ ...prev, length: e.target.value as any }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="general">General Overview</option>
                  <option value="key-points">Key Points</option>
                  <option value="action-items">Action Items</option>
                  <option value="educational">Educational Content</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={summaryOptions.includeTimestamps}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Include Timestamps
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('youtube')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                    activeTab === 'youtube'
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Youtube className="h-5 w-5" />
                  <span>YouTube URL</span>
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                    activeTab === 'upload'
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload Video</span>
                </button>
              </div>

              {/* YouTube Tab */}
              {activeTab === 'youtube' && (
                <form onSubmit={handleYouTubeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      YouTube Video URL
                    </label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isProcessing || !youtubeUrl.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Youtube className="h-5 w-5" />
                        <span>Summarize Video</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-2xl p-8 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors"
                >
                  <FileVideo className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Upload Video File
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Drag and drop a video file here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="inline-flex items-center px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Choose Video File'
                    )}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supported formats: MP4, AVI, MOV, WMV (Max 100MB)
                  </p>
                  {uploadedFile && (
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Selected: {uploadedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Player */}
            {(youtubeUrl || uploadedFile) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Video Player
                </h3>
                <div className="relative bg-black rounded-xl overflow-hidden">
                  {youtubeUrl && (
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeUrl.split('v=')[1]?.split('&')[0]}`}
                      className="w-full h-64"
                      allowFullScreen
                    />
                  )}
                  {uploadedFile && (
                    <video
                      ref={videoRef}
                      src={URL.createObjectURL(uploadedFile)}
                      className="w-full h-64"
                      controls
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {videoSummary ? (
              <>
                {/* Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Video Summary
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(videoSummary.summary)}
                        className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                        title="Copy summary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={exportSummary}
                        className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                        title="Export summary"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={resetForm}
                        className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                        title="Reset"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {videoSummary.title}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {videoSummary.summary}
                      </p>
                    </div>
                    
                    {videoSummary.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Key Points
                        </h4>
                        <ul className="space-y-2">
                          {videoSummary.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-700 dark:text-gray-300">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                {videoSummary.timestamps.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Timestamps</span>
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {videoSummary.timestamps.map((timestamp, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => jumpToTimestamp(timestamp.time)}
                        >
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                              {timestamp.time}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {timestamp.description}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-1 ${
                              timestamp.importance === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              timestamp.importance === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {timestamp.importance} importance
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {transcript && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Transcript
                      </h3>
                      <button
                        onClick={() => copyToClipboard(transcript)}
                        className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                        title="Copy transcript"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {transcript}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
                <FileVideo className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No video processed yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Enter a YouTube URL or upload a video file to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}