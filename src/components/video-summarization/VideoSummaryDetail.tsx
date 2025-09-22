'use client';

import { useState, useEffect } from 'react';
import { VideoSummary, TranscriptSegment, VideoFrame } from '@/types/video-summarization';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Download, 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  List,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface VideoSummaryDetailProps {
  video: VideoSummary;
  onBack: () => void;
  onVideoUpdate?: (updatedVideo: VideoSummary) => void;
}

interface TranscriptData {
  success: boolean;
  transcript: TranscriptSegment[];
  totalSegments: number;
  totalDuration: number;
  hasMore?: boolean;
}



interface FrameData {
  frames: VideoFrame[];
}

export function VideoSummaryDetail({ video, onBack, onVideoUpdate }: VideoSummaryDetailProps) {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [frames, setFrames] = useState<FrameData | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [framesError, setFramesError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (video?.processing_status === 'processing') {
      const interval = setInterval(async () => {
        try {
          // Fetch updated video data instead of reloading the page
          const response = await fetch(`/api/summarize/video/${video.id}`);
          if (response.ok) {
            const updatedVideo = await response.json();
            if (onVideoUpdate) {
              onVideoUpdate(updatedVideo);
            }
          }
        } catch (error) {
          console.error('Error fetching video update:', error);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [video?.processing_status, video.id, onVideoUpdate]);

  useEffect(() => {
    if (video.processing_status === 'completed') {
      fetchTranscript();
      fetchFrames();
    }
  }, [video.id]);

  const fetchTranscript = async () => {
    try {
      setLoadingTranscript(true);
      setTranscriptError(null);
      
      const response = await fetch(`/api/summarize/video/transcript?videoId=${video.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      
      const data = await response.json();
      setTranscript(data);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      setTranscriptError(error instanceof Error ? error.message : 'Failed to load transcript');
    } finally {
      setLoadingTranscript(false);
    }
  };

  const fetchFrames = async () => {
    try {
      setLoadingFrames(true);
      setFramesError(null);
      
      const response = await fetch(`/api/summarize/video/frames?videoId=${video.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch frames');
      }
      
      const data = await response.json();
      setFrames(data);
    } catch (error) {
      console.error('Error fetching frames:', error);
      setFramesError(error instanceof Error ? error.message : 'Failed to load frames');
    } finally {
      setLoadingFrames(false);
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

  const formatTimestamp = (seconds: number) => {
    // Handle invalid or undefined values
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestampWithMilliseconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const getRelativeTimestamp = (seconds: number) => {
    const totalDuration = video.duration || 0;
    const percentage = totalDuration > 0 ? (seconds / totalDuration) * 100 : 0;
    return {
      formatted: formatTimestamp(seconds),
      percentage: Math.round(percentage),
      relative: `${Math.round(percentage)}% through video`
    };
  };

  const jumpToTime = (seconds: number) => {
    setCurrentTime(seconds);
    // In a real implementation, this would control video playback
    toast.info(`Jumped to ${formatTimestamp(seconds)}`);
  };

  const downloadTranscript = () => {
    if (!transcript || !transcript.transcript) return;
    
    const content = transcript.transcript.map(segment => 
      `[${formatTimestamp(segment.startTime)}] ${segment.text}`
    ).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Transcript downloaded');
  };

  const downloadSummary = () => {
    const summaryData = {
      title: video.title,
      description: video.description,
      summary: video.summary,
      key_points: video.key_points,
      duration: video.duration,
      created_at: video.created_at
    };
    
    const content = JSON.stringify(summaryData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </span>
            {video.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </span>
            )}
            {getStatusBadge(video.processing_status)}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSummary}>
            <Download className="h-4 w-4 mr-2" />
            Download Summary
          </Button>
          {transcript && (
            <Button variant="outline" onClick={downloadTranscript}>
              <Download className="h-4 w-4 mr-2" />
              Download Transcript
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="frames" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Key Frames
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {video.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{video.description}</p>
              </CardContent>
            </Card>
          )}

          {video.summary && (
            <Card>
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{video.summary}</p>
              </CardContent>
            </Card>
          )}

          {video.key_points && video.key_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {video.key_points.map((point: string, index: number) => (
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

          {/* Tags removed as not in current schema */}
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="space-y-6">
          {loadingTranscript ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : transcriptError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {transcriptError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchTranscript}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : transcript ? (
            <Card>
              <CardHeader>
                <CardTitle>Video Transcript</CardTitle>
                <CardDescription>
                  Click on any timestamp to jump to that moment in the video
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {transcript.transcript && transcript.transcript.map((segment, index) => (
                    <div key={index} className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => jumpToTime(segment.startTime)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm flex-shrink-0 min-w-[60px] text-left"
                      >
                        {formatTimestamp(segment.startTime)}
                      </button>
                      <p className="text-gray-700 leading-relaxed">{segment.text}</p>
                    </div>
                  ))}
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
                    The transcript for this video is not yet available or failed to process.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Frames Tab */}
        <TabsContent value="frames" className="space-y-6">
          {loadingFrames ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="aspect-video w-full mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : framesError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {framesError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchFrames}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : frames && frames.frames.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {frames.frames.map((frame, index) => {
                const frameUrl = frame.frameUrl || frame.frame_url;
                
                return (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative aspect-video">
                        {frameUrl ? (
                          <Image
                            src={frameUrl}
                            alt={`Frame at ${formatTimestamp(frame.timestamp)}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <button
                          onClick={() => jumpToTime(frame.timestamp)}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {formatTimestamp(frame.timestamp)}
                        </button>
                        {frame.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {frame.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No key frames available
                  </h3>
                  <p className="text-gray-600">
                    Key frames for this video are not yet available or failed to process.
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
              <CardTitle>Video Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <p className="text-gray-900">{video.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">{getStatusBadge(video.processing_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-gray-900">
                    {video.duration ? formatDuration(video.duration) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-gray-900">
                    {new Date(video.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-gray-900">
                    {new Date(video.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Video ID</label>
                  <p className="text-gray-900 font-mono text-sm">{video.id}</p>
                </div>
              </div>
              
              {video.video_url && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Video URL</label>
                  <a 
                    href={video.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline block mt-1"
                  >
                    {video.video_url}
                  </a>
                </div>
              )}
              
              {video.thumbnail_url && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Thumbnail</label>
                  <div className="mt-2">
                    <Image
                      src={video.thumbnail_url}
                      alt={`Thumbnail for ${video.title}`}
                      width={320}
                      height={180}
                      className="rounded-lg border"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}