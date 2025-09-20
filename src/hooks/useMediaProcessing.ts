import { useState, useCallback, useRef } from 'react'
import { VideoSummary, AudioSummary, ProcessingStage, KeyMoment } from '@/types/summarization'

interface VideoProcessingOptions {
  language: string
  summaryType: 'brief' | 'detailed' | 'bullet_points' | 'chapters'
  chunkSize: number
  includeTimestamps: boolean
  extractKeyMoments: boolean
  generateTranscript: boolean
}

interface AudioProcessingOptions {
  language: string
  audioType: 'lecture' | 'meeting' | 'interview' | 'podcast' | 'other'
  summaryType: 'brief' | 'detailed' | 'bullet_points' | 'chapters'
  includeTimestamps: boolean
  generateTranscript: boolean
  identifySpeakers: boolean
}

interface UseMediaProcessingReturn {
  videoSummaries: VideoSummary[]
  audioSummaries: AudioSummary[]
  processing: boolean
  progress: number
  status: ProcessingStage | null
  error: string | null
  processVideo: (file: File, options: VideoProcessingOptions) => Promise<VideoSummary | null>
  processAudio: (file: File, options: AudioProcessingOptions) => Promise<AudioSummary | null>
  getVideoSummary: (summaryId: string) => Promise<VideoSummary | null>
  getAudioSummary: (summaryId: string) => Promise<AudioSummary | null>
  updateVideoSummary: (summaryId: string, updates: Partial<VideoSummary>) => Promise<boolean>
  updateAudioSummary: (summaryId: string, updates: Partial<AudioSummary>) => Promise<boolean>
  deleteVideoSummary: (summaryId: string) => Promise<boolean>
  deleteAudioSummary: (summaryId: string) => Promise<boolean>
  exportVideoSummary: (summaryId: string, format: 'pdf' | 'docx' | 'srt' | 'vtt') => Promise<string | null>
  exportAudioSummary: (summaryId: string, format: 'pdf' | 'docx' | 'txt') => Promise<string | null>
  cancelProcessing: () => void
  clearError: () => void
}

export function useMediaProcessing(): UseMediaProcessingReturn {
  const [videoSummaries, setVideoSummaries] = useState<VideoSummary[]>([])
  const [audioSummaries, setAudioSummaries] = useState<AudioSummary[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<ProcessingStage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setProcessing(false)
      setProgress(0)
      setStatus(null)
    }
  }, [])

  const processVideo = useCallback(async (
    file: File,
    options: VideoProcessingOptions
  ): Promise<VideoSummary | null> => {
    setProcessing(true)
    setProgress(0)
    setError(null)
    setStatus('uploading')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'video')
      formData.append('language', options.language)
      formData.append('summary_type', options.summaryType)
      formData.append('chunk_size', options.chunkSize.toString())
      formData.append('include_timestamps', options.includeTimestamps.toString())
      formData.append('extract_key_moments', options.extractKeyMoments.toString())
      formData.append('generate_transcript', options.generateTranscript.toString())

      const response = await fetch('/api/summarize/video', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process video')
      }

      // Handle streaming response for progress updates
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: VideoSummary | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setProgress(data.progress)
                setStatus(data.stage)
              } else if (data.type === 'complete') {
                finalResult = data.result
                setProgress(100)
                setStatus('completed')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError)
            }
          }
        }
      }

      if (finalResult) {
        setVideoSummaries(prev => [finalResult, ...prev])
        return finalResult
      } else {
        throw new Error('No result received from processing')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Processing cancelled')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process video'
        setError(errorMessage)
      }
      return null
    } finally {
      setProcessing(false)
      setProgress(0)
      setStatus(null)
      abortControllerRef.current = null
    }
  }, [])

  const processAudio = useCallback(async (
    file: File,
    options: AudioProcessingOptions
  ): Promise<AudioSummary | null> => {
    setProcessing(true)
    setProgress(0)
    setError(null)
    setStatus('uploading')

    // Create abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'audio')
      formData.append('language', options.language)
      formData.append('audio_type', options.audioType)
      formData.append('summary_type', options.summaryType)
      formData.append('include_timestamps', options.includeTimestamps.toString())
      formData.append('generate_transcript', options.generateTranscript.toString())
      formData.append('identify_speakers', options.identifySpeakers.toString())

      const response = await fetch('/api/summarize/audio', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process audio')
      }

      // Handle streaming response for progress updates
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: AudioSummary | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setProgress(data.progress)
                setStatus(data.stage)
              } else if (data.type === 'complete') {
                finalResult = data.result
                setProgress(100)
                setStatus('completed')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError)
            }
          }
        }
      }

      if (finalResult) {
        setAudioSummaries(prev => [finalResult, ...prev])
        return finalResult
      } else {
        throw new Error('No result received from processing')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Processing cancelled')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process audio'
        setError(errorMessage)
      }
      return null
    } finally {
      setProcessing(false)
      setProgress(0)
      setStatus(null)
      abortControllerRef.current = null
    }
  }, [])

  const getVideoSummary = useCallback(async (summaryId: string): Promise<VideoSummary | null> => {
    try {
      const response = await fetch(`/api/summarize/video?id=${summaryId}`)
      
      if (!response.ok) {
        throw new Error('Failed to get video summary')
      }

      const data = await response.json()
      return data.summary
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get video summary'
      setError(errorMessage)
      return null
    }
  }, [])

  const getAudioSummary = useCallback(async (summaryId: string): Promise<AudioSummary | null> => {
    try {
      const response = await fetch(`/api/summarize/audio?id=${summaryId}`)
      
      if (!response.ok) {
        throw new Error('Failed to get audio summary')
      }

      const data = await response.json()
      return data.summary
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audio summary'
      setError(errorMessage)
      return null
    }
  }, [])

  const updateVideoSummary = useCallback(async (
    summaryId: string,
    updates: Partial<VideoSummary>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/video', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_id: summaryId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update video summary')
      }

      const data = await response.json()
      setVideoSummaries(prev => prev.map(summary => 
        summary.id === summaryId ? { ...summary, ...data.summary } : summary
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update video summary'
      setError(errorMessage)
      return false
    }
  }, [])

  const updateAudioSummary = useCallback(async (
    summaryId: string,
    updates: Partial<AudioSummary>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/audio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_id: summaryId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update audio summary')
      }

      const data = await response.json()
      setAudioSummaries(prev => prev.map(summary => 
        summary.id === summaryId ? { ...summary, ...data.summary } : summary
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update audio summary'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteVideoSummary = useCallback(async (summaryId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/video', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary_id: summaryId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete video summary')
      }

      setVideoSummaries(prev => prev.filter(summary => summary.id !== summaryId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete video summary'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteAudioSummary = useCallback(async (summaryId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/audio', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary_id: summaryId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete audio summary')
      }

      setAudioSummaries(prev => prev.filter(summary => summary.id !== summaryId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete audio summary'
      setError(errorMessage)
      return false
    }
  }, [])

  const exportVideoSummary = useCallback(async (
    summaryId: string,
    format: 'pdf' | 'docx' | 'srt' | 'vtt'
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/summarize/export/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_id: summaryId,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export video summary')
      }

      const data = await response.json()
      return data.download_url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export video summary'
      setError(errorMessage)
      return null
    }
  }, [])

  const exportAudioSummary = useCallback(async (
    summaryId: string,
    format: 'pdf' | 'docx' | 'txt'
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/summarize/export/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_id: summaryId,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export audio summary')
      }

      const data = await response.json()
      return data.download_url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export audio summary'
      setError(errorMessage)
      return null
    }
  }, [])

  return {
    videoSummaries,
    audioSummaries,
    processing,
    progress,
    status,
    error,
    processVideo,
    processAudio,
    getVideoSummary,
    getAudioSummary,
    updateVideoSummary,
    updateAudioSummary,
    deleteVideoSummary,
    deleteAudioSummary,
    exportVideoSummary,
    exportAudioSummary,
    cancelProcessing,
    clearError
  }
}

export default useMediaProcessing