import { useState, useCallback, useEffect } from 'react'
import { Document, DocumentType, ProcessingStatus, Folder } from '@/types/summarization'

interface UploadOptions {
  folderId?: string
  tags?: string[]
  language?: string
  autoProcess?: boolean
}

interface UseDocumentsReturn {
  documents: Document[]
  folders: Folder[]
  loading: boolean
  uploading: boolean
  error: string | null
  uploadProgress: number
  uploadDocument: (file: File, options?: UploadOptions) => Promise<Document | null>
  getDocument: (documentId: string) => Promise<Document | null>
  updateDocument: (documentId: string, updates: Partial<Document>) => Promise<boolean>
  deleteDocument: (documentId: string) => Promise<boolean>
  moveDocument: (documentId: string, folderId: string | null) => Promise<boolean>
  createFolder: (name: string, parentId?: string) => Promise<Folder | null>
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<boolean>
  deleteFolder: (folderId: string) => Promise<boolean>
  searchDocuments: (query: string, filters?: DocumentFilters) => Promise<Document[]>
  getDocumentsByFolder: (folderId: string | null) => Document[]
  refreshDocuments: () => Promise<void>
  clearError: () => void
}

interface DocumentFilters {
  type?: DocumentType
  status?: ProcessingStatus
  dateFrom?: Date
  dateTo?: Date
  tags?: string[]
  language?: string
}

export function useDocuments(): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refreshDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [documentsResponse, foldersResponse] = await Promise.all([
        fetch('/api/summarize/upload'),
        fetch('/api/summarize/folders')
      ])

      if (!documentsResponse.ok || !foldersResponse.ok) {
        throw new Error('Failed to fetch documents and folders')
      }

      const [documentsData, foldersData] = await Promise.all([
        documentsResponse.json(),
        foldersResponse.json()
      ])

      setDocuments(documentsData.documents || [])
      setFolders(foldersData.folders || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load documents'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshDocuments()
  }, [])

  const uploadDocument = useCallback(async (
    file: File, 
    options: UploadOptions = {}
  ): Promise<Document | null> => {
    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      if (options.folderId) {
        formData.append('folder_id', options.folderId)
      }
      if (options.tags) {
        formData.append('tags', JSON.stringify(options.tags))
      }
      if (options.language) {
        formData.append('language', options.language)
      }
      if (options.autoProcess !== undefined) {
        formData.append('auto_process', options.autoProcess.toString())
      }

      const xhr = new XMLHttpRequest()
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        })

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText)
              const document = data.document
              setDocuments(prev => [document, ...prev])
              resolve(document)
            } catch (parseError) {
              reject(new Error('Failed to parse response'))
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText)
              reject(new Error(errorData.error || 'Upload failed'))
            } catch {
              reject(new Error('Upload failed'))
            }
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.open('POST', '/api/summarize/upload')
        xhr.send(formData)
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [])

  const getDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    try {
      const response = await fetch(`/api/summarize/upload?document_id=${documentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch document')
      }

      const data = await response.json()
      return data.document
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document'
      setError(errorMessage)
      return null
    }
  }, [])

  const updateDocument = useCallback(async (
    documentId: string, 
    updates: Partial<Document>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update document')
      }

      const data = await response.json()
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, ...data.document } : doc
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document_id: documentId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document'
      setError(errorMessage)
      return false
    }
  }, [])

  const moveDocument = useCallback(async (
    documentId: string, 
    folderId: string | null
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/upload', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          folder_id: folderId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to move document')
      }

      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, folder_id: folderId } : doc
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move document'
      setError(errorMessage)
      return false
    }
  }, [])

  const createFolder = useCallback(async (
    name: string, 
    parentId?: string
  ): Promise<Folder | null> => {
    try {
      const response = await fetch('/api/summarize/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          parent_id: parentId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create folder')
      }

      const data = await response.json()
      const folder = data.folder
      setFolders(prev => [...prev, folder])
      return folder
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder'
      setError(errorMessage)
      return null
    }
  }, [])

  const updateFolder = useCallback(async (
    folderId: string, 
    updates: Partial<Folder>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/folders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder_id: folderId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update folder')
      }

      const data = await response.json()
      setFolders(prev => prev.map(folder => 
        folder.id === folderId ? { ...folder, ...data.folder } : folder
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update folder'
      setError(errorMessage)
      return false
    }
  }, [])

  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/summarize/folders', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder_id: folderId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete folder')
      }

      setFolders(prev => prev.filter(folder => folder.id !== folderId))
      // Move documents in deleted folder to root
      setDocuments(prev => prev.map(doc => 
        doc.folder_id === folderId ? { ...doc, folder_id: null } : doc
      ))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder'
      setError(errorMessage)
      return false
    }
  }, [])

  const searchDocuments = useCallback(async (
    query: string, 
    filters: DocumentFilters = {}
  ): Promise<Document[]> => {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { date_from: filters.dateFrom.toISOString() }),
        ...(filters.dateTo && { date_to: filters.dateTo.toISOString() }),
        ...(filters.tags && { tags: JSON.stringify(filters.tags) }),
        ...(filters.language && { language: filters.language })
      })

      const response = await fetch(`/api/summarize/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      return data.documents || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      return []
    }
  }, [])

  const getDocumentsByFolder = useCallback((folderId: string | null): Document[] => {
    return documents.filter(doc => doc.folder_id === folderId)
  }, [documents])

  return {
    documents,
    folders,
    loading,
    uploading,
    error,
    uploadProgress,
    uploadDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    moveDocument,
    createFolder,
    updateFolder,
    deleteFolder,
    searchDocuments,
    getDocumentsByFolder,
    refreshDocuments,
    clearError
  }
}

export default useDocuments