'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Mic, MicOff, Upload, Play, Pause, Square, Download, Copy, RotateCcw, Settings, Volume2, FileAudio, Clock, Headphones } from 'lucide-react'
import Link from 'next/link'

interface AudioSummary {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  speakers: {
    id: string
    name: string
    segments: {
      start: number
      end: number
      text: string
    }[]
  }[]
  emotions: {
    timestamp: number
    emotion: string
    confidence: number
  }[]
  topics: {
    topic: string
    relevance: number
    timestamps: number[]
  }[]
  duration: number
  createdAt: string
}

interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed'
  focus: 'general' | 'key-points' | 'speakers' | 'emotions' | 'topics'
  includeSpeakers: boolean
  includeEmotions: boolean
  language: string
}

interface WaveformData {
  peaks: number[]
  duration: number
}

export default function AudioSummary() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioSummary, setAudioSummary] = useState<AudioSummary | null>(null)
  const [transcript, setTranscript] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    length: 'medium',
    focus: 'general',
    includeSpeakers: true,
    includeEmotions: false,
    language: 'en'
  })
  const [showOptions, setShowOptions] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording. Please check your microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploadedFile(file)
    await processAudio(file)
  }

  const processAudio = async (audioFile: File | Blob) => {
    setIsProcessing(true)

    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('options', JSON.stringify(summaryOptions))

    try {
      const response = await fetch('/api/summarize/audio', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setAudioSummary(data.summary)
        setTranscript(data.transcript)
        setWaveformData(data.waveform)
      } else {
        throw new Error('Failed to process audio file')
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      alert('Failed to process audio file. Please try again.')
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
    if (file && file.type.startsWith('audio/')) {
      handleFileUpload(file)
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const drawWaveform = () => {
    if (!canvasRef.current || !waveformData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const { peaks } = waveformData

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#8B5CF6'

    const barWidth = width / peaks.length
    const centerY = height / 2

    peaks.forEach((peak, index) => {
      const barHeight = peak * centerY
      const x = index * barWidth
      
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight)
    })

    // Draw progress indicator
    if (audioSummary) {
      const progress = currentTime / audioSummary.duration
      const progressX = progress * width
      
      ctx.fillStyle = '#EC4899'
      ctx.fillRect(0, 0, progressX, height)
      ctx.globalCompositeOperation = 'source-atop'
      
      peaks.slice(0, Math.floor(progress * peaks.length)).forEach((peak, index) => {
        const barHeight = peak * centerY
        const x = index * barWidth
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight)
      })
      
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  useEffect(() => {
    drawWaveform()
  }, [waveformData, currentTime])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const exportSummary = () => {
    if (!audioSummary) return

    const exportData = {
      title: audioSummary.title,
      summary: audioSummary.summary,
      keyPoints: audioSummary.keyPoints,
      speakers: audioSummary.speakers,
      emotions: audioSummary.emotions,
      topics: audioSummary.topics,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audio-summary-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setUploadedFile(null)
    setRecordedBlob(null)
    setAudioSummary(null)
    setTranscript('')
    setCurrentTime(0)
    setIsPlaying(false)
    setWaveformData(null)
    setRecordingTime(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processRecording = () => {
    if (recordedBlob) {
      processAudio(recordedBlob)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link href="/summarize" className="text-pink-600 hover:text-pink-800 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Headphones className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Audio Summarization
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Extract insights from audio files and recordings
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Length
                </label>
                <select
                  value={summaryOptions.length}
                  onChange={(e) => setSummaryOptions(prev => ({ ...prev, length: e.target.value as any }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="general">General Overview</option>
                  <option value="key-points">Key Points</option>
                  <option value="speakers">Speaker Analysis</option>
                  <option value="emotions">Emotion Analysis</option>
                  <option value="topics">Topic Analysis</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={summaryOptions.includeSpeakers}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, includeSpeakers: e.target.checked }))}
                    className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 dark:focus:ring-pink-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Include Speakers
                  </span>
                </label>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={summaryOptions.includeEmotions}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, includeEmotions: e.target.checked }))}
                    className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 dark:focus:ring-pink-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Include Emotions
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
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                    activeTab === 'upload'
                      ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload Audio</span>
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all ${
                    activeTab === 'record'
                      ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Mic className="h-5 w-5" />
                  <span>Record Audio</span>
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-pink-300 dark:border-pink-600 rounded-2xl p-8 text-center hover:border-pink-400 dark:hover:border-pink-500 transition-colors"
                >
                  <FileAudio className="h-12 w-12 text-pink-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Upload Audio File
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Drag and drop an audio file here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label
                    htmlFor="audio-upload"
                    className="inline-flex items-center px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      'Choose Audio File'
                    )}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supported formats: MP3, WAV, M4A, OGG (Max 50MB)
                  </p>
                  {uploadedFile && (
                    <div className="mt-4 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                      <p className="text-sm text-pink-700 dark:text-pink-300">
                        Selected: {uploadedFile.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Record Tab */}
              {activeTab === 'record' && (
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${
                      isRecording 
                        ? 'bg-red-500 animate-pulse' 
                        : 'bg-pink-500 hover:bg-pink-600'
                    }`}>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className="text-white p-4"
                      >
                        {isRecording ? (
                          <Square className="h-12 w-12" />
                        ) : (
                          <Mic className="h-12 w-12" />
                        )}
                      </button>
                    </div>
                    {isRecording && (
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {formatTime(recordingTime)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {isRecording ? 'Recording...' : 'Ready to Record'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {isRecording 
                        ? 'Click the square to stop recording' 
                        : 'Click the microphone to start recording'
                      }
                    </p>
                  </div>
                  
                  {recordedBlob && !isRecording && (
                    <div className="space-y-4">
                      <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <p className="text-sm text-pink-700 dark:text-pink-300 mb-2">
                          Recording completed ({formatTime(recordingTime)})
                        </p>
                        <audio 
                          controls 
                          src={URL.createObjectURL(recordedBlob)}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={processRecording}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Headphones className="h-5 w-5" />
                            <span>Summarize Recording</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audio Player & Waveform */}
            {(uploadedFile || recordedBlob) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Audio Player
                </h3>
                
                {/* Waveform */}
                {waveformData && (
                  <div className="mb-4">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={100}
                      className="w-full h-24 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer"
                      onClick={(e) => {
                        if (audioRef.current && audioSummary) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = e.clientX - rect.left
                          const progress = x / rect.width
                          const newTime = progress * audioSummary.duration
                          audioRef.current.currentTime = newTime
                          setCurrentTime(newTime)
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* Audio Controls */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlayPause}
                    className="p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  
                  <div className="flex-1">
                    <audio
                      ref={audioRef}
                      src={uploadedFile ? URL.createObjectURL(uploadedFile) : recordedBlob ? URL.createObjectURL(recordedBlob) : undefined}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="w-full"
                      controls
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {audioSummary ? (
              <>
                {/* Summary */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Audio Summary
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(audioSummary.summary)}
                        className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
                        title="Copy summary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={exportSummary}
                        className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
                        title="Export summary"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={resetForm}
                        className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
                        title="Reset"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {audioSummary.title}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {audioSummary.summary}
                      </p>
                    </div>
                    
                    {audioSummary.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Key Points
                        </h4>
                        <ul className="space-y-2">
                          {audioSummary.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="text-gray-700 dark:text-gray-300">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Speakers */}
                {audioSummary.speakers.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Speaker Analysis
                    </h3>
                    <div className="space-y-4">
                      {audioSummary.speakers.map((speaker, index) => (
                        <div key={speaker.id} className="border-l-4 border-pink-500 pl-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {speaker.name}
                          </h4>
                          <div className="space-y-2">
                            {speaker.segments.slice(0, 3).map((segment, segIndex) => (
                              <div key={segIndex} className="text-sm">
                                <span className="text-pink-600 dark:text-pink-400 font-medium">
                                  {formatTime(segment.start)} - {formatTime(segment.end)}:
                                </span>
                                <span className="text-gray-700 dark:text-gray-300 ml-2">
                                  {segment.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {audioSummary.topics.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Topic Analysis
                    </h3>
                    <div className="space-y-3">
                      {audioSummary.topics.map((topic, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {topic.topic}
                            </span>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Relevance: {Math.round(topic.relevance * 100)}%
                            </div>
                          </div>
                          <div className="text-sm text-pink-600 dark:text-pink-400">
                            {topic.timestamps.length} mentions
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotions */}
                {audioSummary.emotions.length > 0 && summaryOptions.includeEmotions && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Emotion Analysis
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {audioSummary.emotions.map((emotion, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-pink-600 dark:text-pink-400">
                            {formatTime(emotion.timestamp)}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {emotion.emotion}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {Math.round(emotion.confidence * 100)}%
                          </span>
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
                        className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
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
                <Headphones className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No audio processed yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Upload an audio file or record audio to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}