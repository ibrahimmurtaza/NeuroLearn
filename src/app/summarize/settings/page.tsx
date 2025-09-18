'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  Info,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  Clock,
  FileText,
  Zap,
  Database,
  Cloud,
  Lock
} from 'lucide-react';

interface UserSettings {
  profile: {
    name: string;
    email: string;
    avatar?: string;
    timezone: string;
    language: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    defaultSummaryLength: 'short' | 'medium' | 'long';
    autoSave: boolean;
    soundEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    defaultLanguage: string;
    maxFileSize: number;
    retentionPeriod: number;
  };
  api: {
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    customEndpoint?: string;
    rateLimitPerMinute: number;
    timeoutSeconds: number;
  };
  export: {
    defaultFormat: 'pdf' | 'docx' | 'txt' | 'md';
    includeMetadata: boolean;
    includeTimestamps: boolean;
    watermark: boolean;
  };
}

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      name: user?.name || '',
      email: user?.email || '',
      timezone: 'UTC',
      language: 'en'
    },
    preferences: {
      theme: 'system',
      defaultSummaryLength: 'medium',
      autoSave: true,
      soundEnabled: true,
      emailNotifications: true,
      pushNotifications: false,
      defaultLanguage: 'en',
      maxFileSize: 50,
      retentionPeriod: 90
    },
    api: {
      rateLimitPerMinute: 60,
      timeoutSeconds: 30
    },
    export: {
      defaultFormat: 'pdf',
      includeMetadata: true,
      includeTimestamps: true,
      watermark: false
    }
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database }
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' }
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Simulate API call to load user settings
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const testApiConnection = async (provider: string) => {
    setTestingConnection(provider);
    
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, apiKey: settings.api[`${provider}Key` as keyof typeof settings.api] })
      });
      
      const result = await response.json();
      // Handle test result
      console.log(`${provider} connection test:`, result);
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error);
    } finally {
      setTestingConnection(null);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neurolearn-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(prev => ({ ...prev, ...importedSettings }));
      } catch (error) {
        console.error('Error importing settings:', error);
      }
    };
    reader.readAsText(file);
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      // Reset to default settings
      setSettings({
        profile: {
          name: user?.name || '',
          email: user?.email || '',
          timezone: 'UTC',
          language: 'en'
        },
        preferences: {
          theme: 'system',
          defaultSummaryLength: 'medium',
          autoSave: true,
          soundEnabled: true,
          emailNotifications: true,
          pushNotifications: false,
          defaultLanguage: 'en',
          maxFileSize: 50,
          retentionPeriod: 90
        },
        api: {
          rateLimitPerMinute: 60,
          timeoutSeconds: 30
        },
        export: {
          defaultFormat: 'pdf',
          includeMetadata: true,
          includeTimestamps: true,
          watermark: false
        }
      });
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={settings.profile.name}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              profile: { ...prev.profile, name: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={settings.profile.email}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              profile: { ...prev.profile, email: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={settings.profile.timezone}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              profile: { ...prev.profile, timezone: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={settings.profile.language}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              profile: { ...prev.profile, language: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSettings(prev => ({
                  ...prev,
                  preferences: { ...prev.preferences, theme: value as any }
                }))}
                className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  settings.preferences.theme === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Summary Length
          </label>
          <select
            value={settings.preferences.defaultSummaryLength}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              preferences: { ...prev.preferences, defaultSummaryLength: e.target.value as any }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="short">Short (1-2 paragraphs)</option>
            <option value="medium">Medium (3-5 paragraphs)</option>
            <option value="long">Long (6+ paragraphs)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max File Size (MB)
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={settings.preferences.maxFileSize}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              preferences: { ...prev.preferences, maxFileSize: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Retention (days)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={settings.preferences.retentionPeriod}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              preferences: { ...prev.preferences, retentionPeriod: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">General Preferences</h3>
        
        {[
          {
            key: 'autoSave',
            label: 'Auto-save summaries',
            description: 'Automatically save summaries as you work'
          },
          {
            key: 'soundEnabled',
            label: 'Sound notifications',
            description: 'Play sounds for notifications and alerts'
          }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                preferences: {
                  ...prev.preferences,
                  [key]: !prev.preferences[key as keyof typeof prev.preferences]
                }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.preferences[key as keyof typeof settings.preferences]
                  ? 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.preferences[key as keyof typeof settings.preferences]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          {
            key: 'emailNotifications',
            label: 'Email Notifications',
            description: 'Receive email updates about your summaries',
            icon: Mail
          },
          {
            key: 'pushNotifications',
            label: 'Push Notifications',
            description: 'Receive browser push notifications',
            icon: Smartphone
          }
        ].map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{label}</div>
                <div className="text-sm text-gray-500">{description}</div>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                preferences: {
                  ...prev.preferences,
                  [key]: !prev.preferences[key as keyof typeof prev.preferences]
                }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.preferences[key as keyof typeof settings.preferences]
                  ? 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.preferences[key as keyof typeof settings.preferences]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApiTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">API Key Security</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your API keys are encrypted and stored securely. They are only used to make requests to AI services.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {[
          { key: 'openaiKey', label: 'OpenAI API Key', provider: 'OpenAI' },
          { key: 'anthropicKey', label: 'Anthropic API Key', provider: 'Anthropic' },
          { key: 'geminiKey', label: 'Google Gemini API Key', provider: 'Google' }
        ].map(({ key, label, provider }) => (
          <div key={key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {label}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKeys ? 'text' : 'password'}
                  value={settings.api[key as keyof typeof settings.api] || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    api: { ...prev.api, [key]: e.target.value }
                  }))}
                  placeholder={`Enter your ${provider} API key`}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={() => testApiConnection(key.replace('Key', ''))}
                disabled={!settings.api[key as keyof typeof settings.api] || testingConnection === key.replace('Key', '')}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {testingConnection === key.replace('Key', '') ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rate Limit (requests/minute)
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={settings.api.rateLimitPerMinute}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, rateLimitPerMinute: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeout (seconds)
          </label>
          <input
            type="number"
            min="5"
            max="300"
            value={settings.api.timeoutSeconds}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              api: { ...prev.api, timeoutSeconds: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Export Format
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'pdf', label: 'PDF' },
            { value: 'docx', label: 'DOCX' },
            { value: 'txt', label: 'TXT' },
            { value: 'md', label: 'Markdown' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSettings(prev => ({
                ...prev,
                export: { ...prev.export, defaultFormat: value as any }
              }))}
              className={`p-3 border rounded-lg text-center transition-colors ${
                settings.export.defaultFormat === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
        
        {[
          {
            key: 'includeMetadata',
            label: 'Include metadata',
            description: 'Add creation date, file info, and other metadata'
          },
          {
            key: 'includeTimestamps',
            label: 'Include timestamps',
            description: 'Add timestamps for video and audio summaries'
          },
          {
            key: 'watermark',
            label: 'Add watermark',
            description: 'Include NeuroLearn watermark in exported files'
          }
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                export: {
                  ...prev.export,
                  [key]: !prev.export[key as keyof typeof prev.export]
                }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.export[key as keyof typeof settings.export]
                  ? 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.export[key as keyof typeof settings.export]
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Security Status</h3>
            <p className="text-sm text-blue-700 mt-1">
              Your account is secured with industry-standard encryption and security practices.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Two-Factor Authentication</div>
              <div className="text-sm text-gray-500">Add an extra layer of security to your account</div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Change Password</div>
              <div className="text-sm text-gray-500">Update your account password</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Change
            </button>
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Active Sessions</div>
              <div className="text-sm text-gray-500">Manage your active login sessions</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              View Sessions
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Data Management</h3>
            <p className="text-sm text-red-700 mt-1">
              These actions are permanent and cannot be undone. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Export All Data</div>
              <div className="text-sm text-gray-500">Download all your summaries and settings</div>
            </div>
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Data
            </button>
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Import Settings</div>
              <div className="text-sm text-gray-500">Import settings from a backup file</div>
            </div>
            <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-red-900">Delete All Data</div>
              <div className="text-sm text-red-700">Permanently delete all summaries and data</div>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'preferences': return renderPreferencesTab();
      case 'notifications': return renderNotificationsTab();
      case 'api': return renderApiTab();
      case 'export': return renderExportTab();
      case 'security': return renderSecurityTab();
      case 'data': return renderDataTab();
      default: return renderProfileTab();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your account preferences and application settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
              <nav className="space-y-1">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              {renderTabContent()}
              
              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={resetSettings}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {saveStatus === 'saved' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Check className="h-4 w-4" />
                        <span className="text-sm">Settings saved</span>
                      </div>
                    )}
                    
                    {saveStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-600">
                        <X className="h-4 w-4" />
                        <span className="text-sm">Error saving settings</span>
                      </div>
                    )}
                    
                    <button
                      onClick={saveSettings}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;