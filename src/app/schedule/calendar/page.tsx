'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Link,
  Unlink,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import LazyTaskCalendar from '@/components/LazyTaskCalendar';
import { createClient } from '@/lib/supabase';

interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook';
  external_calendar_id: string;
  calendar_name?: string;
  is_active: boolean;
  last_sync?: string;
  sync_errors?: any[];
  created_at: string;
  auth_tokens?: any;
  sync_settings?: any;
}

interface SyncStats {
  total_events: number;
  synced_tasks: number;
  last_sync: string;
  sync_frequency: string;
}

const supabase = createClient();

export default function CalendarIntegration() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    connectionId: string | null;
    calendarName: string;
  }>({
    isOpen: false,
    connectionId: null,
    calendarName: ''
  });
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook'>('google');
  const isFetchingRef = useRef(false);

  useEffect(() => {
    fetchConnections();
    
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'oauth_not_configured') {
      toast.error(
        'Google OAuth credentials not configured. Please set up your Google OAuth credentials in the environment variables before connecting your calendar.',
        { duration: 8000 }
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'oauth_failed') {
      toast.error('OAuth authentication failed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'no_code') {
      toast.error('Authorization code not received. Please try connecting again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'callback_failed') {
      toast.error('OAuth callback failed. Please check your configuration and try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Remove the separate fetchSyncStats useEffect since we now fetch stats in parallel

  const fetchConnections = async () => {
    if (isFetchingRef.current) {
      console.log('Calendar Page - fetchConnections already in progress, skipping duplicate call');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      console.log('Calendar Page - Starting fetchConnections...');
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Calendar Page - Auth check:', { 
        hasUser: !!user, 
        userId: user?.id, 
        authError: authError?.message 
      });
      
      if (authError || !user) {
        console.warn('Calendar Page - User not authenticated, redirecting to login');
        toast.error('Please log in to view your calendar connections');
        window.location.href = '/auth/login?redirect=/schedule/calendar';
        return;
      }
      
      console.log('Calendar Page - Making API request to /api/schedule/calendar');
      
      // Fetch connections and sync stats in parallel
      const [connectionsResponse, syncStatsResponse] = await Promise.allSettled([
        fetch('/api/schedule/calendar'),
        fetch('/api/schedule/calendar/sync-stats')
      ]);

      // Process connections
      if (connectionsResponse.status === 'fulfilled' && connectionsResponse.value.ok) {
        const connectionsData = await connectionsResponse.value.json();
        console.log('Calendar Page - API response data:', connectionsData);
        setConnections(connectionsData.connections || []);
        console.log('Calendar Page - Connections set:', connectionsData.connections?.length || 0);
      } else {
        const errorData = connectionsResponse.status === 'fulfilled' 
          ? await connectionsResponse.value.json().catch(() => ({ error: 'Unknown error' }))
          : { error: 'Request failed' };
        console.error('Calendar Page - API error:', {
          status: connectionsResponse.status === 'fulfilled' ? connectionsResponse.value.status : 'rejected',
          statusText: connectionsResponse.status === 'fulfilled' ? connectionsResponse.value.statusText : 'Request rejected',
          errorData
        });
        
        if (connectionsResponse.status === 'fulfilled' && connectionsResponse.value.status === 401) {
          console.warn('Calendar Page - 401 Unauthorized, redirecting to login');
          toast.error('Your session has expired. Please log in again.');
          window.location.href = '/auth/login?redirect=/schedule/calendar';
          return;
        } else {
          toast.error(`Failed to fetch calendar connections: ${errorData.error || 'Unknown error'}`);
        }
      }

      // Process sync stats if available
      if (syncStatsResponse.status === 'fulfilled' && syncStatsResponse.value.ok) {
        const syncData = await syncStatsResponse.value.json();
        setSyncStats(syncData.stats);
      }
    } catch (error) {
      console.error('Calendar Page - Error fetching connections:', error);
      toast.error('Failed to fetch calendar connections. Please check your connection and try again.');
    } finally {
      console.log('Calendar Page - Setting loading to false');
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const fetchSyncStats = async () => {
    try {
      if (connections.length === 0) {
        setSyncStats(null);
        return;
      }

      const activeConnection = connections.find(conn => conn.is_active) || connections[0];
      if (!activeConnection) {
        setSyncStats(null);
        return;
      }

      const response = await fetch(`/api/schedule/calendar/sync?connection_id=${activeConnection.id}`);
      if (response.ok) {
        const data = await response.json();
        setSyncStats({
          total_events: data.recent_tasks?.length || 0,
          synced_tasks: data.recent_tasks?.filter((task: any) => task.status === 'completed').length || 0,
          last_sync: data.sync_status?.last_sync || 'Never',
          sync_frequency: data.sync_status?.sync_settings?.sync_frequency || 'manual'
        });
      }
    } catch (error) {
      console.error('Error fetching sync stats:', error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      if (selectedProvider === 'google') {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        
        if (!clientId || 
            clientId.includes('your-google-client-id') ||
            clientId === 'your-google-client-id.apps.googleusercontent.com') {
          
          toast.error('Google OAuth credentials not configured. Please set up your Google OAuth credentials in the environment variables.');
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error('Please log in to connect your calendar.');
          return;
        }

        const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/google/callback`);
        const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly');
        const state = encodeURIComponent(JSON.stringify({ 
          provider: 'google',
          userId: user.id 
        }));
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${redirectUri}&` +
          `scope=${scope}&` +
          `response_type=code&` +
          `access_type=offline&` +
          `prompt=consent&` +
          `state=${state}`;
        
        window.location.href = authUrl;
      } else {
        toast.error('Outlook integration is not yet implemented. Please use Google Calendar.');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Failed to connect calendar');
    }
  };

  const handleDisconnectCalendar = async (connectionId: string) => {
    setDeleting(connectionId);

    try {
      const response = await fetch(`/api/schedule/calendar/${connectionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Calendar disconnected successfully', {
          description: 'Your calendar has been safely disconnected and will no longer sync.',
          duration: 4000,
        });
        fetchConnections();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to disconnect calendar', {
          description: 'Please check your connection and try again.',
        });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar', {
        description: 'A network error occurred. Please try again.',
      });
    } finally {
      setDeleting(null);
      setDeleteConfirmation({
        isOpen: false,
        connectionId: null,
        calendarName: ''
      });
    }
  };

  const openDeleteConfirmation = (connectionId: string, calendarName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      connectionId,
      calendarName
    });
  };

  const handleConfirmedDelete = () => {
    if (deleteConfirmation.connectionId) {
      handleDisconnectCalendar(deleteConfirmation.connectionId);
    }
  };

  const handleSyncCalendar = async (connectionId: string, syncType: 'full' | 'tasks_only' | 'events_only' = 'full') => {
    try {
      setSyncing(connectionId);
      
      const response = await fetch('/api/schedule/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connection_id: connectionId,
          sync_type: syncType
        })
      });

      if (response.ok) {
        toast.success('Calendar sync completed successfully');
        fetchConnections();
        fetchSyncStats();
      } else {
        const error = await response.json();
        
        if (error.error === 'Google OAuth credentials not configured') {
          toast.error(
            'Google OAuth credentials not configured. Please set up your Google OAuth credentials in the environment variables.',
            { duration: 6000 }
          );
        } else {
          toast.error(error.message || error.error || 'Failed to sync calendar');
        }
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleConnection = async (connectionId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/schedule/calendar/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        toast.success(`Calendar ${isActive ? 'activated' : 'deactivated'}`);
        fetchConnections();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update connection status');
      }
    } catch (error) {
      console.error('Error toggling connection:', error);
      toast.error('Failed to update connection status');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔗';
      case 'outlook':
        return '📧';
      default:
        return '📅';
    }
  };

  const getStatusColor = (connection: CalendarConnection) => {
    if (!connection.is_active) return 'bg-gray-100 text-gray-800';
    if (connection.sync_errors && connection.sync_errors.length > 0) return 'bg-red-100 text-red-800';
    if (connection.last_sync) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusIcon = (connection: CalendarConnection) => {
    if (!connection.is_active) return <Unlink className="w-4 h-4 text-gray-500" />;
    if (connection.sync_errors && connection.sync_errors.length > 0) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (connection.last_sync) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <Clock className="w-4 h-4 text-blue-500" />;
  };

  const getStatusText = (connection: CalendarConnection) => {
    if (!connection.is_active) return 'Disconnected';
    if (connection.sync_errors && connection.sync_errors.length > 0) return 'Error';
    if (connection.last_sync) return 'Connected';
    return 'Connecting';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar Integration</h1>
          <p className="text-gray-600 mt-1">Connect your calendars to sync events and tasks seamlessly</p>
        </div>
        <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Connect Calendar</DialogTitle>
              <DialogDescription>
                Choose a calendar provider to connect with your schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Calendar Provider</Label>
                <Select value={selectedProvider} onValueChange={(value: 'google' | 'outlook') => setSelectedProvider(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">
                      <div className="flex items-center gap-2">
                        <span>🔗</span>
                        Google Calendar
                      </div>
                    </SelectItem>
                    <SelectItem value="outlook">
                      <div className="flex items-center gap-2">
                        <span>📧</span>
                        Outlook Calendar
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Sync your calendar events with tasks</li>
                  <li>• Automatic scheduling suggestions</li>
                  <li>• Real-time availability updates</li>
                  <li>• Cross-platform synchronization</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConnectCalendar}>
                  <Link className="w-4 h-4 mr-2" />
                  Connect {selectedProvider === 'google' ? 'Google' : 'Outlook'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sync Statistics */}
      {syncStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold">{syncStats.total_events}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Synced Tasks</p>
                  <p className="text-2xl font-bold">{syncStats.synced_tasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Last Sync</p>
                  <p className="text-sm font-medium">
                    {syncStats.last_sync ? new Date(syncStats.last_sync).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Sync Frequency</p>
                  <p className="text-sm font-medium">{syncStats.sync_frequency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connected Calendars - Fixed conditional rendering */}
      <div>
        {connections.length > 0 && (
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Calendars</h2>
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : connections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <Card key={connection.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(connection.provider)}</span>
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {connection.provider} Calendar
                        </CardTitle>
                        <CardDescription>{connection.external_calendar_id}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connection)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {connection.calendar_name && (
                    <p className="text-sm text-gray-600">
                      Calendar: {connection.calendar_name}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(connection)}>
                      {getStatusText(connection)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${connection.id}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`active-${connection.id}`}
                        checked={connection.is_active}
                        onCheckedChange={(checked) => handleToggleConnection(connection.id, checked)}
                      />
                    </div>
                  </div>

                  {connection.last_sync && (
                    <p className="text-xs text-gray-500">
                      Last synced: {new Date(connection.last_sync).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncCalendar(connection.id)}
                      disabled={syncing === connection.id || !connection.is_active}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                      {syncing === connection.id ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteConfirmation(connection.id, connection.calendar_name || `${connection.provider} Calendar`)}
                      disabled={deleting === connection.id}
                      className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors duration-200 group"
                      title="Disconnect calendar"
                    >
                      {deleting === connection.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 group-hover:text-red-600" />
                      )}
                    </Button>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600 mb-2">Quick Sync Options:</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-6 px-2"
                        onClick={() => handleSyncCalendar(connection.id, 'tasks_only')}
                        disabled={syncing === connection.id || !connection.is_active}
                      >
                        Tasks Only
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-6 px-2"
                        onClick={() => handleSyncCalendar(connection.id, 'events_only')}
                        disabled={syncing === connection.id || !connection.is_active}
                      >
                        Events Only
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calendars connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your Google or Outlook calendar to sync events and tasks automatically
            </p>
            <Button onClick={() => setIsConnectDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Calendar
            </Button>
          </div>
        )}
      </div>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Integration Benefits
          </CardTitle>
          <CardDescription>
            Maximize your productivity with calendar integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Automatic Synchronization</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Real-time event updates</li>
                <li>• Task deadline integration</li>
                <li>• Conflict detection and resolution</li>
                <li>• Cross-platform availability</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Smart Scheduling</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• AI-powered time slot suggestions</li>
                <li>• Buffer time management</li>
                <li>• Meeting preparation reminders</li>
                <li>• Productivity pattern analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sync Settings
          </CardTitle>
          <CardDescription>
            Configure how your calendars sync with NeuroLearn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-sync frequency</Label>
                <p className="text-xs text-gray-600">How often to sync calendar data</p>
              </div>
              <Select defaultValue="15min">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5min">Every 5 minutes</SelectItem>
                  <SelectItem value="15min">Every 15 minutes</SelectItem>
                  <SelectItem value="30min">Every 30 minutes</SelectItem>
                  <SelectItem value="1hour">Every hour</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Create tasks from events</Label>
                <p className="text-xs text-gray-600">Automatically create tasks for calendar events</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Block time for tasks</Label>
                <p className="text-xs text-gray-600">Reserve calendar time for scheduled tasks</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Sync notifications</Label>
                <p className="text-xs text-gray-600">Get notified when sync completes or fails</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedded Task Calendar - Always rendered at the same position */}
      <LazyTaskCalendar className="w-full" height={700} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => 
        setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Disconnect Calendar
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to disconnect <strong>{deleteConfirmation.calendarName}</strong>? 
              This will stop syncing events and tasks from this calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">This action cannot be undone</p>
                <ul className="text-xs space-y-1">
                  <li>• All synced events will remain in your calendar</li>
                  <li>• Future events will not sync automatically</li>
                  <li>• You can reconnect this calendar later</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmation({ isOpen: false, connectionId: null, calendarName: '' })}
              disabled={deleting !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmedDelete}
              disabled={deleting !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect Calendar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}