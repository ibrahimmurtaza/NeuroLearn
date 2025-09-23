'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Calendar, 
  Clock, 
  Headphones, 
  Trash2, 
  Eye, 
  AlertCircle,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

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
}

interface AudioSummaryListProps {
  onAudioSelect: (audio: AudioSummary) => void;
  refreshTrigger: number;
}

interface FilterOptions {
  search: string;
  sortBy: 'created_at' | 'title' | 'duration';
  sortOrder: 'asc' | 'desc';
}

export function AudioSummaryList({ onAudioSelect, refreshTrigger }: AudioSummaryListProps) {
  const { user } = useAuth();
  const [audios, setAudios] = useState<AudioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchAudios();
  }, [refreshTrigger]);

  const fetchAudios = async () => {
    if (!user?.id) {
      setError('Please log in to view your audio summaries');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/summarize/audio/list?userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio summaries');
      }

      const data = await response.json();
      setAudios(data.audios || []);
    } catch (error) {
      console.error('Error fetching audio summaries:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio summaries');
    } finally {
      setLoading(false);
    }
  };

  const deleteAudio = async (audioId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/summarize/audio/${audioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete audio summary');
      }

      setAudios(prev => prev.filter(a => a.id !== audioId));
      toast.success('Audio summary deleted successfully');
    } catch (error) {
      console.error('Error deleting audio summary:', error);
      toast.error('Failed to delete audio summary');
    }
  };

  const filteredAudios = audios.filter(audio => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!audio.title.toLowerCase().includes(searchLower) &&
          !audio.summary?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    const { sortBy, sortOrder } = filters;
    let comparison = 0;

    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'duration':
        comparison = (a.duration || 0) - (b.duration || 0);
        break;
      case 'created_at':
      default:
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAudios}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search audio summaries..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ 
                ...prev, 
                sortBy: sortBy as any, 
                sortOrder: sortOrder as any 
              }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="duration-desc">Longest First</option>
            <option value="duration-asc">Shortest First</option>
          </select>
        </div>
      </div>

      {/* Audio List */}
      {filteredAudios.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Headphones className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {audios.length === 0 ? 'No audio summaries yet' : 'No audio summaries match your filters'}
              </h3>
              <p className="text-gray-600">
                {audios.length === 0 
                  ? 'Upload an audio file to get started'
                  : 'Try adjusting your search criteria'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAudios.map((audio) => (
            <Card key={audio.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-purple-600" />
                      {audio.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(audio.created_at), { addSuffix: true })}
                      </span>
                      {audio.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(audio.duration)}
                        </span>
                      )}
                      {audio.file_type && (
                        <Badge variant="secondary" className="text-xs">
                          {audio.file_type.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {audio.summary && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {audio.summary}
                  </p>
                )}
                
                {audio.key_points && audio.key_points.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Key Points:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {audio.key_points.slice(0, 3).map((point: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="line-clamp-1">{point}</span>
                        </li>
                      ))}
                      {audio.key_points.length > 3 && (
                        <li className="text-xs text-gray-500">
                          +{audio.key_points.length - 3} more points
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                
                {audio.file_size && (
                  <div className="text-xs text-gray-500 mb-4">
                    File size: {formatFileSize(audio.file_size)}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onAudioSelect(audio)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAudio(audio.id, audio.title)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Results count */}
      {filteredAudios.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {filteredAudios.length} of {audios.length} audio summaries
        </div>
      )}
    </div>
  );
}