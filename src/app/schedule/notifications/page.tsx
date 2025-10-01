'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Clock, 
  Calendar, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Plus, 
  Settings, 
  Filter, 
  MoreVertical,
  Eye,
  EyeOff,
  Archive,
  Star,
  StarOff,
  Zap,
  Timer,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Notification {
  id: string;
  type: 'task_reminder' | 'goal_deadline' | 'productivity_alert' | 'system' | 'achievement';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  scheduled_for?: string;
  created_at: string;
  action_url?: string;
  metadata?: {
    task_id?: string;
    goal_id?: string;
    [key: string]: any;
  };
}

interface NotificationSettings {
  task_reminders: boolean;
  goal_deadlines: boolean;
  productivity_alerts: boolean;
  achievement_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_advance_time: number;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: 'task_reminder' as const,
    title: '',
    message: '',
    priority: 'medium' as const,
    scheduled_for: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, [filter, typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const response = await fetch(`/api/schedule/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        toast.error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      // In a real implementation, this would fetch user notification settings
      setSettings({
        task_reminders: true,
        goal_deadlines: true,
        productivity_alerts: true,
        achievement_notifications: true,
        email_notifications: false,
        push_notifications: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        reminder_advance_time: 15
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleCreateNotification = async () => {
    try {
      const response = await fetch('/api/schedule/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification)
      });

      if (response.ok) {
        toast.success('Notification created successfully');
        setIsCreateDialogOpen(false);
        setNewNotification({
          type: 'task_reminder',
          title: '',
          message: '',
          priority: 'medium',
          scheduled_for: ''
        });
        fetchNotifications();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to create notification');
    }
  };

  const handleNotificationAction = async (notificationId: string, action: 'mark_read' | 'mark_unread' | 'archive' | 'delete') => {
    try {
      const response = await fetch('/api/schedule/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notification_ids: [notificationId],
          action 
        })
      });

      if (response.ok) {
        const actionMessages = {
          mark_read: 'Notification marked as read',
          mark_unread: 'Notification marked as unread',
          archive: 'Notification archived',
          delete: 'Notification deleted'
        };
        toast.success(actionMessages[action]);
        fetchNotifications();
      } else {
        toast.error('Failed to update notification');
      }
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'archive' | 'delete') => {
    const selectedIds = notifications
      .filter(n => n.status === 'unread')
      .map(n => n.id);
    
    if (selectedIds.length === 0) {
      toast.info('No unread notifications to update');
      return;
    }

    try {
      const response = await fetch('/api/schedule/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notification_ids: selectedIds,
          action 
        })
      });

      if (response.ok) {
        toast.success(`${selectedIds.length} notifications updated`);
        fetchNotifications();
      } else {
        toast.error('Failed to update notifications');
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notifications');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      // In a real implementation, this would update user settings
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_reminder': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'goal_deadline': return <Target className="w-5 h-5 text-orange-500" />;
      case 'productivity_alert': return <Zap className="w-5 h-5 text-purple-500" />;
      case 'achievement': return <Star className="w-5 h-5 text-yellow-500" />;
      case 'system': return <Info className="w-5 h-5 text-gray-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task_reminder': return 'Task Reminder';
      case 'goal_deadline': return 'Goal Deadline';
      case 'productivity_alert': return 'Productivity Alert';
      case 'achievement': return 'Achievement';
      case 'system': return 'System';
      default: return type;
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Notification Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Manage your reminders, alerts, and notifications</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Custom Reminder</DialogTitle>
                <DialogDescription>
                  Set up a custom notification or reminder
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={newNotification.type} 
                    onValueChange={(value: any) => setNewNotification(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task_reminder">Task Reminder</SelectItem>
                      <SelectItem value="goal_deadline">Goal Deadline</SelectItem>
                      <SelectItem value="productivity_alert">Productivity Alert</SelectItem>
                      <SelectItem value="system">System Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newNotification.title}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter notification title"
                  />
                </div>
                
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter notification message"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select 
                      value={newNotification.priority} 
                      onValueChange={(value: any) => setNewNotification(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Schedule For</Label>
                    <Input
                      type="datetime-local"
                      value={newNotification.scheduled_for}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, scheduled_for: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateNotification}>
                    Create Reminder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
                <DialogDescription>
                  Configure your notification preferences
                </DialogDescription>
              </DialogHeader>
              {settings && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Task Reminders</Label>
                          <p className="text-xs text-gray-600">Get notified about upcoming tasks</p>
                        </div>
                        <Switch
                          checked={settings.task_reminders}
                          onCheckedChange={(checked) => handleUpdateSettings({ task_reminders: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Goal Deadlines</Label>
                          <p className="text-xs text-gray-600">Alerts for approaching goal deadlines</p>
                        </div>
                        <Switch
                          checked={settings.goal_deadlines}
                          onCheckedChange={(checked) => handleUpdateSettings({ goal_deadlines: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Productivity Alerts</Label>
                          <p className="text-xs text-gray-600">Insights about your productivity patterns</p>
                        </div>
                        <Switch
                          checked={settings.productivity_alerts}
                          onCheckedChange={(checked) => handleUpdateSettings({ productivity_alerts: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Achievement Notifications</Label>
                          <p className="text-xs text-gray-600">Celebrate your accomplishments</p>
                        </div>
                        <Switch
                          checked={settings.achievement_notifications}
                          onCheckedChange={(checked) => handleUpdateSettings({ achievement_notifications: checked })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Push Notifications</Label>
                          <p className="text-xs text-gray-600">Browser notifications</p>
                        </div>
                        <Switch
                          checked={settings.push_notifications}
                          onCheckedChange={(checked) => handleUpdateSettings({ push_notifications: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-xs text-gray-600">Send notifications to your email</p>
                        </div>
                        <Switch
                          checked={settings.email_notifications}
                          onCheckedChange={(checked) => handleUpdateSettings({ email_notifications: checked })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Quiet Hours</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Quiet Hours</Label>
                          <p className="text-xs text-gray-600">Pause notifications during specified hours</p>
                        </div>
                        <Switch
                          checked={settings.quiet_hours_enabled}
                          onCheckedChange={(checked) => handleUpdateSettings({ quiet_hours_enabled: checked })}
                        />
                      </div>
                      
                      {settings.quiet_hours_enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={settings.quiet_hours_start}
                              onChange={(e) => handleUpdateSettings({ quiet_hours_start: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={settings.quiet_hours_end}
                              onChange={(e) => handleUpdateSettings({ quiet_hours_end: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Reminder Advance Time (minutes)</Label>
                    <p className="text-xs text-gray-600 mb-2">How early to remind you before deadlines</p>
                    <Select 
                      value={settings.reminder_advance_time.toString()} 
                      onValueChange={(value) => handleUpdateSettings({ reminder_advance_time: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="1440">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread ({unreadCount})</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task_reminder">Task Reminders</SelectItem>
              <SelectItem value="goal_deadline">Goal Deadlines</SelectItem>
              <SelectItem value="productivity_alert">Productivity Alerts</SelectItem>
              <SelectItem value="achievement">Achievements</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {unreadCount > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('mark_read')}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
              <Archive className="w-4 h-4 mr-2" />
              Archive All
            </Button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md ${
                notification.status === 'unread' ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${
                          notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                        {notification.scheduled_for && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Scheduled: {new Date(notification.scheduled_for).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {notification.action_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={notification.action_url}>View</a>
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {notification.status === 'unread' ? (
                          <DropdownMenuItem onClick={() => handleNotificationAction(notification.id, 'mark_read')}>
                            <Eye className="w-4 h-4 mr-2" />
                            Mark as Read
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleNotificationAction(notification.id, 'mark_unread')}>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Mark as Unread
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleNotificationAction(notification.id, 'archive')}>
                          <Archive className="w-4 h-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleNotificationAction(notification.id, 'delete')}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'You\'re all caught up! New notifications will appear here.' 
              : `No ${filter} notifications found. Try changing the filter.`
            }
          </p>
          {filter === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Reminder
            </Button>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BellOff className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.status === 'archived').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.scheduled_for && new Date(n.scheduled_for) > new Date()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}