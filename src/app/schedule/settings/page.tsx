'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  User, 
  Bell, 
  Calendar, 
  Zap, 
  Palette, 
  Shield, 
  Download, 
  Upload, 
  Trash2, 
  Save, 
  RefreshCw, 
  Clock, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Moon, 
  Sun, 
  Monitor,
  Globe,
  Smartphone,
  Mail,
  Database,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface UserSettings {
  // General Settings
  timezone: string;
  date_format: string;
  time_format: string;
  week_start: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  
  // Productivity Settings
  work_hours_start: string;
  work_hours_end: string;
  break_duration: number;
  focus_session_duration: number;
  daily_goal_hours: number;
  productivity_tracking: boolean;
  
  // Notification Settings
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
  
  // Calendar Settings
  default_task_duration: number;
  auto_schedule_tasks: boolean;
  calendar_sync_frequency: number;
  show_completed_tasks: boolean;
  color_coding_enabled: boolean;
  
  // AI & Automation
  ai_suggestions_enabled: boolean;
  auto_subtask_generation: boolean;
  smart_scheduling: boolean;
  productivity_insights: boolean;
  auto_priority_adjustment: boolean;
  
  // Privacy & Security
  data_sharing_analytics: boolean;
  data_sharing_improvements: boolean;
  activity_logging: boolean;
  export_data_format: string;
}

interface ExportData {
  goals: any[];
  tasks: any[];
  productivity_patterns: any[];
  settings: UserSettings;
}

export default function ScheduleSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch user settings from API
      // For now, we'll use default settings
      setSettings({
        // General Settings
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        week_start: 'monday',
        language: 'en',
        theme: 'system',
        
        // Productivity Settings
        work_hours_start: '09:00',
        work_hours_end: '17:00',
        break_duration: 15,
        focus_session_duration: 25,
        daily_goal_hours: 8,
        productivity_tracking: true,
        
        // Notification Settings
        task_reminders: true,
        goal_deadlines: true,
        productivity_alerts: true,
        achievement_notifications: true,
        email_notifications: false,
        push_notifications: true,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        reminder_advance_time: 15,
        
        // Calendar Settings
        default_task_duration: 30,
        auto_schedule_tasks: false,
        calendar_sync_frequency: 15,
        show_completed_tasks: true,
        color_coding_enabled: true,
        
        // AI & Automation
        ai_suggestions_enabled: true,
        auto_subtask_generation: true,
        smart_scheduling: false,
        productivity_insights: true,
        auto_priority_adjustment: false,
        
        // Privacy & Security
        data_sharing_analytics: false,
        data_sharing_improvements: true,
        activity_logging: true,
        export_data_format: 'json'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };
      
      // In a real implementation, this would save to API
      // const response = await fetch('/api/schedule/settings', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newSettings)
      // });
      
      setSettings(updatedSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      // In a real implementation, this would fetch all user data
      const exportData: ExportData = {
        goals: [], // Would fetch from API
        tasks: [], // Would fetch from API
        productivity_patterns: [], // Would fetch from API
        settings: settings!
      };
      
      const dataStr = exportFormat === 'json' 
        ? JSON.stringify(exportData, null, 2)
        : convertToCSV(exportData);
      
      const dataBlob = new Blob([dataStr], { 
        type: exportFormat === 'json' ? 'application/json' : 'text/csv' 
      });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `neurolearn-schedule-data.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const handleImportData = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      
      // Validate and import data
      if (data.settings) {
        await updateSettings(data.settings);
      }
      
      // In a real implementation, would also import goals, tasks, etc.
      
      toast.success('Data imported successfully');
      setIsImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import data. Please check the file format.');
    }
  };

  const handleResetSettings = async () => {
    try {
      // Reset to default settings
      await fetchSettings();
      toast.success('Settings reset to defaults');
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const convertToCSV = (data: ExportData): string => {
    // Simple CSV conversion for settings
    const headers = Object.keys(data.settings).join(',');
    const values = Object.values(data.settings).join(',');
    return `${headers}\n${values}`;
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'system': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Settings</h3>
          <p className="text-gray-600 mb-6">There was an error loading your settings.</p>
          <Button onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
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
            <Settings className="w-8 h-8" />
            Settings & Preferences
          </h1>
          <p className="text-gray-600 mt-1">Customize your Smart Schedule Planner experience</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Your Data</DialogTitle>
                <DialogDescription>
                  Download your goals, tasks, and settings for backup or transfer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON (Recommended)</SelectItem>
                      <SelectItem value="csv">CSV (Settings only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Your Data</DialogTitle>
                <DialogDescription>
                  Upload a previously exported JSON file to restore your data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select File</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImportData} disabled={!importFile}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Productivity
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AI & Automation
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Regional & Language Settings
              </CardTitle>
              <CardDescription>
                Configure your location, language, and display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Timezone</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => updateSettings({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Language</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => updateSettings({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Date Format</Label>
                  <Select 
                    value={settings.date_format} 
                    onValueChange={(value) => updateSettings({ date_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="MMM DD, YYYY">MMM DD, YYYY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Time Format</Label>
                  <Select 
                    value={settings.time_format} 
                    onValueChange={(value) => updateSettings({ time_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Week Starts On</Label>
                  <Select 
                    value={settings.week_start} 
                    onValueChange={(value) => updateSettings({ week_start: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Theme</Label>
                  <Select 
                    value={settings.theme} 
                    onValueChange={(value: any) => updateSettings({ theme: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Productivity Settings */}
        <TabsContent value="productivity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Work Hours & Focus Sessions
              </CardTitle>
              <CardDescription>
                Set your work schedule and productivity preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Work Hours Start</Label>
                  <Input
                    type="time"
                    value={settings.work_hours_start}
                    onChange={(e) => updateSettings({ work_hours_start: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Work Hours End</Label>
                  <Input
                    type="time"
                    value={settings.work_hours_end}
                    onChange={(e) => updateSettings({ work_hours_end: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Focus Session Duration (minutes)</Label>
                  <Select 
                    value={settings.focus_session_duration.toString()} 
                    onValueChange={(value) => updateSettings({ focus_session_duration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="25">25 minutes (Pomodoro)</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Break Duration (minutes)</Label>
                  <Select 
                    value={settings.break_duration.toString()} 
                    onValueChange={(value) => updateSettings({ break_duration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Daily Goal (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="16"
                    value={settings.daily_goal_hours}
                    onChange={(e) => updateSettings({ daily_goal_hours: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Productivity Tracking</Label>
                  <p className="text-xs text-gray-600">Track time spent on tasks and analyze patterns</p>
                </div>
                <Switch
                  checked={settings.productivity_tracking}
                  onCheckedChange={(checked) => updateSettings({ productivity_tracking: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Control when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Task Reminders</Label>
                    <p className="text-xs text-gray-600">Get notified about upcoming tasks</p>
                  </div>
                  <Switch
                    checked={settings.task_reminders}
                    onCheckedChange={(checked) => updateSettings({ task_reminders: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Goal Deadlines</Label>
                    <p className="text-xs text-gray-600">Alerts for approaching goal deadlines</p>
                  </div>
                  <Switch
                    checked={settings.goal_deadlines}
                    onCheckedChange={(checked) => updateSettings({ goal_deadlines: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Productivity Alerts</Label>
                    <p className="text-xs text-gray-600">Insights about your productivity patterns</p>
                  </div>
                  <Switch
                    checked={settings.productivity_alerts}
                    onCheckedChange={(checked) => updateSettings({ productivity_alerts: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Achievement Notifications</Label>
                    <p className="text-xs text-gray-600">Celebrate your accomplishments</p>
                  </div>
                  <Switch
                    checked={settings.achievement_notifications}
                    onCheckedChange={(checked) => updateSettings({ achievement_notifications: checked })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Delivery Methods</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <div>
                      <Label>Push Notifications</Label>
                      <p className="text-xs text-gray-600">Browser notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) => updateSettings({ push_notifications: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-gray-600">Send notifications to your email</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Quiet Hours</Label>
                    <p className="text-xs text-gray-600">Pause notifications during specified hours</p>
                  </div>
                  <Switch
                    checked={settings.quiet_hours_enabled}
                    onCheckedChange={(checked) => updateSettings({ quiet_hours_enabled: checked })}
                  />
                </div>
                
                {settings.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={settings.quiet_hours_start}
                        onChange={(e) => updateSettings({ quiet_hours_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={settings.quiet_hours_end}
                        onChange={(e) => updateSettings({ quiet_hours_end: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <Label>Reminder Advance Time</Label>
                  <p className="text-xs text-gray-600 mb-2">How early to remind you before deadlines</p>
                  <Select 
                    value={settings.reminder_advance_time.toString()} 
                    onValueChange={(value) => updateSettings({ reminder_advance_time: parseInt(value) })}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Settings */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Integration
              </CardTitle>
              <CardDescription>
                Configure how tasks and events are displayed and synchronized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Default Task Duration (minutes)</Label>
                  <Select 
                    value={settings.default_task_duration.toString()} 
                    onValueChange={(value) => updateSettings({ default_task_duration: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Calendar Sync Frequency (minutes)</Label>
                  <Select 
                    value={settings.calendar_sync_frequency.toString()} 
                    onValueChange={(value) => updateSettings({ calendar_sync_frequency: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Schedule Tasks</Label>
                    <p className="text-xs text-gray-600">Automatically find time slots for new tasks</p>
                  </div>
                  <Switch
                    checked={settings.auto_schedule_tasks}
                    onCheckedChange={(checked) => updateSettings({ auto_schedule_tasks: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Completed Tasks</Label>
                    <p className="text-xs text-gray-600">Display completed tasks in calendar view</p>
                  </div>
                  <Switch
                    checked={settings.show_completed_tasks}
                    onCheckedChange={(checked) => updateSettings({ show_completed_tasks: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Color Coding</Label>
                    <p className="text-xs text-gray-600">Use colors to categorize tasks and goals</p>
                  </div>
                  <Switch
                    checked={settings.color_coding_enabled}
                    onCheckedChange={(checked) => updateSettings({ color_coding_enabled: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI & Automation Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI & Automation Features
              </CardTitle>
              <CardDescription>
                Configure intelligent features and automation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>AI Suggestions</Label>
                    <p className="text-xs text-gray-600">Get intelligent recommendations for task management</p>
                  </div>
                  <Switch
                    checked={settings.ai_suggestions_enabled}
                    onCheckedChange={(checked) => updateSettings({ ai_suggestions_enabled: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Subtask Generation</Label>
                    <p className="text-xs text-gray-600">Automatically break down complex goals into subtasks</p>
                  </div>
                  <Switch
                    checked={settings.auto_subtask_generation}
                    onCheckedChange={(checked) => updateSettings({ auto_subtask_generation: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Smart Scheduling</Label>
                    <p className="text-xs text-gray-600">AI-powered optimal time slot suggestions</p>
                  </div>
                  <Switch
                    checked={settings.smart_scheduling}
                    onCheckedChange={(checked) => updateSettings({ smart_scheduling: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Productivity Insights</Label>
                    <p className="text-xs text-gray-600">AI analysis of your productivity patterns</p>
                  </div>
                  <Switch
                    checked={settings.productivity_insights}
                    onCheckedChange={(checked) => updateSettings({ productivity_insights: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Priority Adjustment</Label>
                    <p className="text-xs text-gray-600">Automatically adjust task priorities based on deadlines</p>
                  </div>
                  <Switch
                    checked={settings.auto_priority_adjustment}
                    onCheckedChange={(checked) => updateSettings({ auto_priority_adjustment: checked })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">AI Features Notice</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      AI features use your task and productivity data to provide personalized recommendations. 
                      All processing is done securely and your data remains private.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Security Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Data Management
              </CardTitle>
              <CardDescription>
                Control your data sharing preferences and manage your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Analytics Data Sharing</Label>
                    <p className="text-xs text-gray-600">Share anonymized usage data to improve the service</p>
                  </div>
                  <Switch
                    checked={settings.data_sharing_analytics}
                    onCheckedChange={(checked) => updateSettings({ data_sharing_analytics: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Product Improvement Data</Label>
                    <p className="text-xs text-gray-600">Help improve features with usage insights</p>
                  </div>
                  <Switch
                    checked={settings.data_sharing_improvements}
                    onCheckedChange={(checked) => updateSettings({ data_sharing_improvements: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activity Logging</Label>
                    <p className="text-xs text-gray-600">Keep detailed logs of your actions for troubleshooting</p>
                  </div>
                  <Switch
                    checked={settings.activity_logging}
                    onCheckedChange={(checked) => updateSettings({ activity_logging: checked })}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Management
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                  
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 hover:text-red-700">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset All Settings</DialogTitle>
                        <DialogDescription>
                          This will reset all your preferences to default values. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleResetSettings}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reset Settings
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Data Retention Policy</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Your data is stored securely and you can export or delete it at any time. 
                      Inactive accounts are automatically cleaned up after 2 years of inactivity.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => toast.success('Settings saved!')} disabled={saving}>
          {saving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}