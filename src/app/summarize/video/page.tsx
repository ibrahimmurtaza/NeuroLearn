'use client';

import { useState } from 'react';
import { VideoUpload } from '@/components/video-summarization/VideoUpload';
import { VideoSummaryList } from '@/components/video-summarization/VideoSummaryList';
import { VideoSummaryDetail } from '@/components/video-summarization/VideoSummaryDetail';
import { VideoSummary } from '@/types/video-summarization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Upload, List, Settings } from 'lucide-react';

export default function VideoSummarizationPage() {
  const [selectedVideo, setSelectedVideo] = useState<VideoSummary | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleVideoProcessed = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleVideoSelect = (video: VideoSummary) => {
    setSelectedVideo(video);
  };

  const handleBackToList = () => {
    setSelectedVideo(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleVideoUpdate = (updatedVideo: VideoSummary) => {
    setSelectedVideo(updatedVideo);
  };

  if (selectedVideo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <VideoSummaryDetail 
          video={selectedVideo} 
          onBack={handleBackToList}
          onVideoUpdate={handleVideoUpdate}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Video className="h-8 w-8 text-blue-600" />
          Video Summarization
        </h1>
        <p className="text-lg text-gray-600">
          Upload videos or provide YouTube URLs to generate AI-powered summaries with key insights and timestamps.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload &amp; Process
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Video Library
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Process New Video</CardTitle>
              <CardDescription>
                Upload a video file or provide a YouTube URL to generate an AI summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoUpload onVideoProcessed={handleVideoProcessed} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Video Summaries</CardTitle>
              <CardDescription>
                Browse and manage your processed video summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoSummaryList 
                onVideoSelect={handleVideoSelect}
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Summarization Settings</CardTitle>
              <CardDescription>
                Configure default options for video processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Settings panel coming soon. Currently using default options:
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Summary Length: Medium</li>
                  <li>Focus: General</li>
                  <li>Language: English</li>
                  <li>Include Timestamps: Yes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}