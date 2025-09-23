'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Download, 
  Volume2,
  AlertCircle,
  FileText,
  List,
  Lightbulb,
  Headphones
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface AudioSummary {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  duration: number;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  transcript?: string;
}

interface AudioSummaryDetailProps {
  audio: AudioSummary;
  onBack: () => void;
  onAudioUpdate?: (updatedAudio: AudioSummary) => void;
}

export function AudioSummaryDetail({ audio, onBack, onAudioUpdate }: AudioSummaryDetailProps) {
  const [audioData, setAudioData] = useState<AudioSummary>(audio);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we don't have transcript data, fetch the full audio details
    if (!audioData.transcript) {
      fetchAudioDetails();
    }
  }, [audio.id]);

  const fetchAudioDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/summarize/audio/${audio.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audio details');
      }
      
      const data = await response.json();
      setAudioData(data.audio);
      
      if (onAudioUpdate) {
        onAudioUpdate(data.audio);
      }
    } catch (error) {
      console.error('Error fetching audio details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio details');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadTranscript = () => {
    if (!audioData.transcript) return;
    
    const content = audioData.transcript;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  const downloadSummary = () => {
    const summaryData = {
      title: audioData.title,
      summary: audioData.summary,
      key_points: audioData.key_points,
      duration: audioData.duration,
      file_size: audioData.file_size,
      file_type: audioData.file_type,
      created_at: audioData.created_at
    };
    
    const content = JSON.stringify(summaryData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{audioData.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(audioData.created_at), { addSuffix: true })}
            </span>
            {audioData.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(audioData.duration)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {formatFileSize(audioData.file_size)}
            </span>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {audioData.file_type.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSummary}>
            <Download className="h-4 w-4 mr-2" />
            Download Summary
          </Button>
          {audioData.transcript && (
            <Button variant="outline" onClick={downloadTranscript}>
              <Download className="h-4 w-4 mr-2" />
              Download Transcript
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {audioData.summary && (
            <Card>
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{audioData.summary}</p>
              </CardContent>
            </Card>
          )}

          {audioData.key_points && audioData.key_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {audioData.key_points.map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchAudioDetails}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : audioData.transcript ? (
            <Card>
              <CardHeader>
                <CardTitle>Audio Transcript</CardTitle>
                <CardDescription>
                  Full transcript of the audio content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {audioData.transcript}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Transcript not available
                  </h3>
                  <p className="text-gray-600">
                    The transcript for this audio is not yet available or failed to process.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audio Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <p className="text-gray-900">{audioData.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Format</label>
                  <p className="text-gray-900">{audioData.file_type.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-gray-900">
                    {audioData.duration ? formatDuration(audioData.duration) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">File Size</label>
                  <p className="text-gray-900">{formatFileSize(audioData.file_size)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-gray-900">
                    {new Date(audioData.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-gray-900">
                    {new Date(audioData.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Audio ID</label>
                  <p className="text-gray-900 font-mono text-sm">{audioData.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}