import { useState, useCallback, useEffect, useRef } from 'react'
import { Summary, SummarizationOptions, ExportFormat, SummaryType } from '@/types/summarization'
import { useAuth } from '@/contexts/AuthContext'

interface UseSummarizationReturn {
  summaries: Summary[]
  setSummaries: React.Dispatch<React.SetStateAction<Summary[]>>
  isLoading: boolean
  error: string | null
  processingStatus: Record<string, string>
  generateSummary: (options: any) => Promise<Summary | null>
  getSummary: (summaryId: string) => Promise<Summary | null>
  updateSummary: (summaryId: string, updates: Partial<Summary>) => Promise<boolean>
  deleteSummary: (summaryId: string) => Promise<boolean>
  exportSummary: (summaryId: string, format: 'pdf' | 'docx' | 'html' | 'markdown') => Promise<string | null>
  startPolling: (summaryId: string, documentId: string) => void
  stopPolling: (summaryId: string) => void
  clearError: () => void
}

export function useSummarization(): UseSummarizationReturn {
  const { user } = useAuth()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({})
  const pollingIntervals = useRef<Record<string, NodeJS.Timeout>>({})

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Polling function to check processing status
  const pollProcessingStatus = useCallback(async (summaryId: string, documentId: string) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/summarize/generate?summaryId=${summaryId}&documentId=${documentId}&userId=${user.id}`);
      const result = await response.json();
      
      if (result.summaries && result.summaries.length > 0) {
        const summary = result.summaries.find((s: Summary) => s.id === summaryId);
        if (summary) {
          setProcessingStatus(prev => ({
            ...prev,
            [summaryId]: summary.processingStatus
          }));
          
          // If processing is complete or failed, stop polling
          if (summary.processingStatus === 'completed' || summary.processingStatus === 'failed') {
            if (pollingIntervals.current[summaryId]) {
              clearInterval(pollingIntervals.current[summaryId]);
              delete pollingIntervals.current[summaryId];
            }
            
            // Update summaries list
            setSummaries(prev => {
              const index = prev.findIndex(s => s.id === summaryId);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = summary;
                return updated;
              }
              return [...prev, summary];
            });
          }
        }
      }
    } catch (error) {
      console.error('Error polling processing status:', error);
    }
  }, [user?.id]);

  // Start polling for a summary
  const startPolling = useCallback((summaryId: string, documentId: string) => {
    if (pollingIntervals.current[summaryId]) {
      clearInterval(pollingIntervals.current[summaryId]);
    }
    
    setProcessingStatus(prev => ({
      ...prev,
      [summaryId]: 'processing'
    }));
    
    pollingIntervals.current[summaryId] = setInterval(() => {
      pollProcessingStatus(summaryId, documentId);
    }, 2000); // Poll every 2 seconds
  }, [pollProcessingStatus]);

  // Stop polling for a summary
  const stopPolling = useCallback((summaryId: string) => {
    if (pollingIntervals.current[summaryId]) {
      clearInterval(pollingIntervals.current[summaryId]);
      delete pollingIntervals.current[summaryId];
    }
  }, []);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [])

  const generateSummary = useCallback(async (
    options: any
  ): Promise<Summary | null> => {
    setLoading(true)
    setError(null)
    setProgress(0)

    // Check authentication
    const userId = options.userId || user?.id
    if (!userId) {
      setError('Please log in to generate summaries')
      setLoading(false)
      return null
    }

    try {
      const response = await fetch('/api/summarize/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: options.documentId,
          summaryType: options.summaryType,
          language: options.language || 'en',
          userId: userId,
          customPrompt: options.customPrompt
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }

      // Handle streaming response for progress updates
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let summary: Summary | null = null

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  
                  if (data.type === 'progress') {
                    setProgress(data.progress)
                  } else if (data.type === 'complete') {
                    summary = data.summary
                    setSummaries(prev => [data.summary, ...prev])
                  } else if (data.type === 'error') {
                    throw new Error(data.error)
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE data:', parseError)
                }
              }
            }
          }
        }

        return summary
      } else {
        const data = await response.json()
        const summary = data.summary
        setSummaries(prev => [summary, ...prev])
        
        // Start polling if summary is still processing
        if (summary.processingStatus === 'processing') {
          startPolling(summary.id, options.documentId);
        }
        
        return summary
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }, [user?.id])

  const getSummary = useCallback(async (summaryId: string): Promise<Summary | null> => {
    if (!user?.id) {
      setError('Please log in to access summaries')
      return null
    }

    try {
      const response = await fetch(`/api/summarize/generate?summaryId=${summaryId}&userId=${user.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch summary')
      }

      const data = await response.json()
      return data.summary
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch summary'
      setError(errorMessage)
      return null
    }
  }, [user?.id])

  const updateSummary = useCallback(async (
    summaryId: string, 
    updates: Partial<Summary>
  ): Promise<boolean> => {
    if (!user?.id) {
      setError('Please log in to update summaries')
      return false
    }

    try {
      const response = await fetch(`/api/summarize/generate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryId: summaryId,
          userId: user.id,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update summary')
      }

      const data = await response.json()
      setSummaries(prev => prev.map(summary => 
        summary.id === summaryId ? { ...summary, ...data.summary } : summary
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update summary'
      setError(errorMessage)
      return false
    }
  }, [user?.id])

  const deleteSummary = useCallback(async (summaryId: string): Promise<boolean> => {
    if (!user?.id) {
      setError('Please log in to delete summaries')
      return false
    }

    try {
      const response = await fetch(`/api/summarize/generate`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          summaryId: summaryId,
          userId: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete summary')
      }

      setSummaries(prev => prev.filter(summary => summary.id !== summaryId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete summary'
      setError(errorMessage)
      return false
    }
  }, [user?.id])

  const exportSummary = useCallback(async (
    summaryId: string, 
    format: 'pdf' | 'docx' | 'html' | 'markdown'
  ): Promise<string | null> => {
    if (!user?.id) {
      setError('Please log in to export summaries')
      return null
    }

    try {
      const response = await fetch('/api/summarize/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryId: summaryId,
          userId: user.id,
          format
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export summary')
      }

      const data = await response.json()
      return data.download_url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export summary'
      setError(errorMessage)
      return null
    }
  }, [user?.id])

  return {
    summaries,
    setSummaries,
    isLoading: loading,
    error,
    processingStatus,
    generateSummary,
    getSummary,
    updateSummary,
    deleteSummary,
    exportSummary,
    startPolling,
    stopPolling,
    clearError
  }
}

export default useSummarization