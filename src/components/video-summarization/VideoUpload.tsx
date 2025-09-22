'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Link, FileVideo, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface VideoUploadProps {
  onVideoProcessed: () => void;
}

interface ProcessingStatus {
  stage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export function VideoUpload({ onVideoProcessed }: VideoUploadProps) {
  const { user } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    await processVideoFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
    },
    multiple: false
  });

  const processVideoFile = async (file: File) => {
    if (!user?.id) {
      toast.error('Please log in to process videos');
      return;
    }

    setStatus({ stage: 'uploading', progress: 10, message: 'Preparing upload...' });

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('userId', user.id);
      formData.append('options', JSON.stringify({
        length: 'medium',
        focus: 'general',
        language: 'en',
        include_timestamps: true
      }));

      setStatus({ stage: 'uploading', progress: 30, message: 'Uploading video...' });

      const response = await fetch('/api/summarize/video/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setStatus({ stage: 'processing', progress: 60, message: 'Processing video...' });

      const result = await response.json();
      
      setStatus({ stage: 'processing', progress: 90, message: 'Generating summary...' });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus({ 
        stage: 'completed', 
        progress: 100, 
        message: `Successfully processed: ${file.name}` 
      });
      
      toast.success('Video processed successfully!');
      onVideoProcessed();
      
      // Reset after 3 seconds
      setTimeout(() => {
        setStatus({ stage: 'idle', progress: 0, message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to process video');
    }
  };

  const processYouTubeUrl = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    if (!user?.id) {
      toast.error('Please log in to process videos');
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setStatus({ stage: 'processing', progress: 20, message: 'Fetching video information...' });

    try {
      const response = await fetch('/api/summarize/video/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          userId: user.id,
          options: {
            length: 'medium',
            focus: 'general',
            language: 'en',
            include_timestamps: true
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Processing failed');
      }

      setStatus({ stage: 'processing', progress: 60, message: 'Downloading and processing...' });

      const result = await response.json();
      
      setStatus({ stage: 'processing', progress: 90, message: 'Generating summary...' });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus({ 
        stage: 'completed', 
        progress: 100, 
        message: `Successfully processed: ${result.title || 'YouTube video'}` 
      });
      
      toast.success('YouTube video processed successfully!');
      onVideoProcessed();
      setYoutubeUrl('');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setStatus({ stage: 'idle', progress: 0, message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('YouTube processing error:', error);
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: 'Processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Failed to process YouTube video');
    }
  };

  const isProcessing = status.stage === 'uploading' || status.stage === 'processing';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="youtube">YouTube URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isProcessing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} disabled={isProcessing} />
            <FileVideo className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the video file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">Drag &amp; drop a video file here, or click to select</p>
                <p className="text-sm text-gray-500">Supports MP4, AVI, MOV, WMV, FLV, WebM (max 100MB)</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="youtube" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <div className="flex gap-2">
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isProcessing}
              />
              <Button 
                onClick={processYouTubeUrl} 
                disabled={isProcessing || !youtubeUrl.trim()}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                Process
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Processing Status */}
      {status.stage !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {status.stage === 'completed' && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {status.stage === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                {isProcessing && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                )}
                <span className="font-medium">{status.message}</span>
              </div>
              
              {status.stage !== 'error' && (
                <Progress value={status.progress} className="w-full" />
              )}
              
              {status.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{status.error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}