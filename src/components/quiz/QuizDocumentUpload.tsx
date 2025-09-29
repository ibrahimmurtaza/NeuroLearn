'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  File
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedDocument {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  content_preview: string;
  chunk_count?: number;
  created_at: string;
}

interface QuizDocumentUploadProps {
  onDocumentUploaded?: (document: UploadedDocument) => void;
  onClose?: () => void;
  showAsModal?: boolean;
}

export default function QuizDocumentUpload({ 
  onDocumentUploaded, 
  onClose, 
  showAsModal = false 
}: QuizDocumentUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const allowedExtensions = ['.pdf', '.txt', '.md', '.docx'];

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size exceeds 10MB limit`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    } else {
      setError(null);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) {
      handleFileChange({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const uploadDocuments = async () => {
    if (!user || selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const uploadedDocs: UploadedDocument[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        
        formData.append('file', file);
        formData.append('user_id', user.id);
        formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('language', language);

        // Update progress
        setUploadProgress(((i + 0.5) / selectedFiles.length) * 100);

        const response = await fetch('/api/quiz-documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        const result = await response.json();
        
        const uploadedDoc: UploadedDocument = {
          id: result.document_id,
          title: result.title,
          file_name: file.name,
          file_size: file.size,
          content_preview: result.content_preview,
          chunk_count: result.chunk_count,
          created_at: new Date().toISOString()
        };

        uploadedDocs.push(uploadedDoc);
        
        // Notify parent component
        if (onDocumentUploaded) {
          onDocumentUploaded(uploadedDoc);
        }
      }

      setUploadProgress(100);
      setUploadedDocuments(uploadedDocs);
      setSuccess(`Successfully uploaded ${uploadedDocs.length} document(s)`);
      
      // Reset form
      setSelectedFiles([]);
      setTitle('');
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload documents');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Quiz Documents</h2>
        <p className="text-gray-600">
          Upload documents to create quizzes from your content
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={handleFileSelect}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              Click to select files or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, TXT, MD, DOCX (max 10MB each)
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedExtensions.join(',')}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Document Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Document Settings</CardTitle>
          <CardDescription>
            Configure settings for your uploaded documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a custom title or leave blank to use filename"
              disabled={isUploading}
            />
          </div>
          
          <div>
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Files ({selectedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium">Uploading and processing documents...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                Processing documents and generating embeddings for quiz creation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Uploaded */}
      {uploadedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Uploaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {doc.chunk_count} sections • {formatFileSize(doc.file_size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            {showAsModal ? 'Close' : 'Cancel'}
          </Button>
        )}
        <Button
          onClick={uploadDocuments}
          disabled={isUploading || selectedFiles.length === 0}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload {selectedFiles.length} Document{selectedFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Upload Quiz Documents</h2>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {content}
    </div>
  );
}