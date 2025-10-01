// Analytics Configuration Constants
export const ANALYTICS_CONFIG = {
  // Completion rate thresholds
  COMPLETION_RATE: {
    EXCELLENT_THRESHOLD: 80, // Above this is considered excellent
    POOR_THRESHOLD: 60,      // Below this needs improvement
  },
  
  // Focus time thresholds (in minutes)
  FOCUS_TIME: {
    GOOD_SESSION_THRESHOLD: 120, // Above this is considered a good focus session
  },
  
  // Productivity score configuration
  PRODUCTIVITY_SCORE: {
    DEFAULT: 75,    // Default score when no data available
    MAX: 100,       // Maximum possible score
    MIN: 0,         // Minimum possible score
  },
  
  // Data analysis periods
  ANALYSIS_PERIODS: {
    RECENT_DAYS: 7,     // Days to consider for recent trend analysis
    COMPARISON_DAYS: 14, // Days to look back for comparison
    WEEKLY_DAYS: 7,     // Days in a week for weekly analysis
  },
  
  // UI Display limits
  DISPLAY_LIMITS: {
    MAX_GOALS_SHOWN: 5,     // Maximum goals to show in the goals section
    MAX_INSIGHTS: 3,        // Maximum insights to display
    CHART_OUTER_RADIUS: 80, // Default outer radius for pie charts
  },
  
  // Chart colors
  CHART_COLORS: {
    PRIMARY: '#3b82f6',
    SECONDARY: '#10b981',
    ACCENT: '#f59e0b',
    DANGER: '#ef4444',
    PURPLE: '#8b5cf6',
    PINK: '#ec4899',
    INDIGO: '#6366f1',
    TEAL: '#14b8a6',
  },
  
  // Insight types
  INSIGHT_TYPES: {
    SUCCESS: 'success',
    WARNING: 'warning',
    INFO: 'info',
  },
  
  // Time periods for analytics
  TIME_PERIODS: {
    SEVEN_DAYS: '7d',
    THIRTY_DAYS: '30d',
    NINETY_DAYS: '90d',
  },
  
  // Analytics types
  ANALYTICS_TYPES: {
    OVERVIEW: 'overview',
    PATTERNS: 'patterns',
    GOALS: 'goals',
    TASKS: 'tasks',
  },
} as const;

// Helper functions for analytics calculations
export const calculateProductivityScore = (
  completionRate: number,
  averageFocusTime: number,
  taskCount: number
): number => {
  // Base score from completion rate (0-40 points)
  const completionScore = (completionRate / 100) * 40;
  
  // Focus time score (0-30 points)
  const focusScore = Math.min((averageFocusTime / ANALYTICS_CONFIG.FOCUS_TIME.GOOD_SESSION_THRESHOLD) * 30, 30);
  
  // Task volume score (0-30 points)
  const volumeScore = Math.min((taskCount / 10) * 30, 30);
  
  return Math.round(completionScore + focusScore + volumeScore);
};

export const getInsightThresholds = () => ({
  excellentCompletion: ANALYTICS_CONFIG.COMPLETION_RATE.EXCELLENT_THRESHOLD,
  poorCompletion: ANALYTICS_CONFIG.COMPLETION_RATE.POOR_THRESHOLD,
  goodFocusTime: ANALYTICS_CONFIG.FOCUS_TIME.GOOD_SESSION_THRESHOLD,
});

export const getAnalyticsPeriods = () => ({
  recent: ANALYTICS_CONFIG.ANALYSIS_PERIODS.RECENT_DAYS,
  comparison: ANALYTICS_CONFIG.ANALYSIS_PERIODS.COMPARISON_DAYS,
  weekly: ANALYTICS_CONFIG.ANALYSIS_PERIODS.WEEKLY_DAYS,
});