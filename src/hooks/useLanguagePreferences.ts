'use client';

import { useState, useEffect, useCallback } from 'react';
import { TranslationMode } from '../types/translation';

interface UserPreferences {
  preferredLanguage: string;
  autoTranslate: boolean;
  translationMode: TranslationMode;
  showConfidence: boolean;
}

interface UseLanguagePreferencesReturn {
  // State
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredLanguage: 'en',
  autoTranslate: false,
  translationMode: 'side-by-side',
  showConfidence: true
};

const STORAGE_KEY = 'neurolearn_translation_preferences';

export function useLanguagePreferences(): UseLanguagePreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage as fallback
  const loadLocalPreferences = useCallback((): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load local preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }, []);

  // Save preferences to localStorage
  const saveLocalPreferences = useCallback((prefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save local preferences:', error);
    }
  }, []);

  // Fetch preferences from API
  const fetchPreferences = useCallback(async (): Promise<UserPreferences> => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, use local preferences
          return loadLocalPreferences();
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.preferences || DEFAULT_PREFERENCES;
    } catch (error) {
      console.warn('Failed to fetch preferences from API:', error);
      // Fallback to local preferences
      return loadLocalPreferences();
    }
  }, [loadLocalPreferences]);

  // Save preferences to API
  const savePreferences = useCallback(async (prefs: UserPreferences): Promise<void> => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, save locally only
          saveLocalPreferences(prefs);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Also save locally as backup
      saveLocalPreferences(prefs);
    } catch (error) {
      console.warn('Failed to save preferences to API:', error);
      // Fallback to local storage
      saveLocalPreferences(prefs);
      throw error;
    }
  }, [saveLocalPreferences]);

  // Update a single preference
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> => {
    setError(null);
    
    const newPreferences = { ...preferences, [key]: value };
    
    // Optimistically update local state
    setPreferences(newPreferences);
    
    try {
      await savePreferences(newPreferences);
    } catch (error) {
      // Revert on error
      setPreferences(preferences);
      setError(error instanceof Error ? error.message : 'Failed to update preference');
      throw error;
    }
  }, [preferences, savePreferences]);

  // Update multiple preferences
  const updatePreferences = useCallback(async (
    updates: Partial<UserPreferences>
  ): Promise<void> => {
    setError(null);
    
    const newPreferences = { ...preferences, ...updates };
    
    // Optimistically update local state
    setPreferences(newPreferences);
    
    try {
      await savePreferences(newPreferences);
    } catch (error) {
      // Revert on error
      setPreferences(preferences);
      setError(error instanceof Error ? error.message : 'Failed to update preferences');
      throw error;
    }
  }, [preferences, savePreferences]);

  // Refresh preferences from API
  const refreshPreferences = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const freshPreferences = await fetchPreferences();
      setPreferences(freshPreferences);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh preferences');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPreferences]);

  // Reset to default preferences
  const resetToDefaults = useCallback(async (): Promise<void> => {
    setError(null);
    
    // Optimistically update local state
    setPreferences(DEFAULT_PREFERENCES);
    
    try {
      await savePreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset preferences');
      throw error;
    }
  }, [savePreferences]);

  // Load initial preferences
  useEffect(() => {
    let mounted = true;
    
    const loadInitialPreferences = async () => {
      try {
        const initialPreferences = await fetchPreferences();
        if (mounted) {
          setPreferences(initialPreferences);
        }
      } catch (error) {
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load preferences');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialPreferences();
    
    return () => {
      mounted = false;
    };
  }, [fetchPreferences]);

  // Auto-save preferences when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveLocalPreferences(preferences);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [preferences, saveLocalPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updatePreferences,
    refreshPreferences,
    resetToDefaults
  };
}