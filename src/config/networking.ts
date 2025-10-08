/**
 * Networking Module Configuration
 * Centralized configuration for the peer networking system
 */

import { NETWORKING_ENV_CONFIG, FEATURE_FLAGS } from './environment';

// API Configuration
export const API_CONFIG = {
  ENDPOINTS: {
    SUGGESTIONS: '/api/networking/peers/suggestions',
    PEER_SUGGESTIONS: '/api/networking/peers/suggestions',
    CONNECTIONS: '/api/networking/connections',
    GROUPS: '/api/networking/groups',
    NOTIFICATIONS: '/api/networking/notifications',
    PROFILE: '/api/networking/profile',
    MESSAGES: '/api/networking/messages',
    ACTIVITIES: '/api/networking/activities',
  },
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    SUGGESTIONS_LIMIT: NETWORKING_ENV_CONFIG.MAX_SUGGESTIONS || 10,
    CONNECTIONS_LIMIT: 20,
    GROUPS_LIMIT: 15,
    NOTIFICATIONS_LIMIT: 25,
    MESSAGES_LIMIT: 50,
  },
  TIMEOUTS: {
    DEFAULT: NETWORKING_ENV_CONFIG.API_TIMEOUT || 30000,
    SUGGESTIONS: 15000,
    CONNECTIONS: 10000,
    MESSAGES: 5000,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
} as const;

// Compatibility Algorithm Configuration
export const COMPATIBILITY_CONFIG = {
  FACTORS: {
    STUDY_STYLE: 0.3,
    LEARNING_GOALS: 0.25,
    AVAILABILITY: 0.2,
    EXPERIENCE_LEVEL: 0.15,
    SUBJECT_INTEREST: 0.1,
  },
  SCORING: {
    MIN_COMPATIBILITY_SCORE: NETWORKING_ENV_CONFIG.MIN_COMPATIBILITY_SCORE || 0,
    MAX_COMPATIBILITY_SCORE: 100,
    NEUTRAL_SCORE: 50,
    EXCELLENT_THRESHOLD: 85,
    GOOD_THRESHOLD: 70,
    FAIR_THRESHOLD: 50,
  },
  WEIGHTS: {
    EXACT_MATCH: 1.0,
    CLOSE_MATCH: 0.8,
    PARTIAL_MATCH: 0.6,
    WEAK_MATCH: 0.3,
    NO_MATCH: 0.0,
  },
} as const;

// Study Style Compatibility Matrix
export const STUDY_STYLE_MATRIX = {
  visual: { visual: 100, auditory: 60, kinesthetic: 70, reading: 80 },
  auditory: { visual: 60, auditory: 100, kinesthetic: 50, reading: 70 },
  kinesthetic: { visual: 70, auditory: 50, kinesthetic: 100, reading: 40 },
  reading: { visual: 80, auditory: 70, kinesthetic: 40, reading: 100 },
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  TABLES: {
    PROFILES: 'profiles',
    CONNECTIONS: 'connections',
    GROUPS: 'study_groups',
    MEMBERSHIPS: 'group_memberships',
    MESSAGES: 'messages',
    NOTIFICATIONS: 'notifications',
  },
  QUERY_LIMITS: {
    MAX_SUGGESTIONS: NETWORKING_ENV_CONFIG.MAX_SUGGESTIONS || 50,
    MAX_CONNECTIONS: 100,
    MAX_GROUPS_PER_USER: 10,
    MAX_MESSAGES_PER_FETCH: 50,
  },
  CACHE: {
    TTL: NETWORKING_ENV_CONFIG.CACHE_TTL || 300000, // 5 minutes
    SUGGESTIONS_TTL: 600000, // 10 minutes
    PROFILE_TTL: 1800000, // 30 minutes
  },
} as const;

// UI Configuration
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: {
      BLUE: {
        50: 'bg-blue-50',
        100: 'bg-blue-100',
        500: 'blue-500',
        600: 'bg-blue-600',
        700: 'bg-blue-700',
        800: 'text-blue-800',
        TEXT: 'text-blue-600',
      },
      GRAY: {
        50: 'bg-gray-50',
        100: 'bg-gray-100',
        200: 'border-gray-200',
        300: 'bg-gray-300',
        400: 'text-gray-400',
        500: 'text-gray-500',
        600: 'text-gray-600',
        700: 'text-gray-700',
        900: 'text-gray-900',
      },
      GREEN: {
        100: 'bg-green-100',
        500: 'text-green-500',
        600: 'bg-green-600',
        700: 'bg-green-700',
        800: 'text-green-800',
      },
      RED: {
        100: 'bg-red-100',
        500: 'text-red-500',
        600: 'bg-red-600',
        700: 'bg-red-700',
        800: 'text-red-800',
        TEXT: 'text-red-600',
      },
      YELLOW: {
        500: 'text-yellow-500',
        600: 'text-yellow-600',
      },
      PURPLE: {
        100: 'bg-purple-100',
        600: 'text-purple-600',
      },
    },
    GRADIENTS: {
      BLUE_INDIGO: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      BLUE_PURPLE: 'bg-gradient-to-br from-blue-500 to-purple-600',
    },
    HOVER: {
      RED: 'hover:bg-red-100 hover:text-red-600',
      GRAY: 'hover:bg-gray-200',
      BLUE: 'hover:bg-blue-700',
      GREEN: 'hover:bg-green-700',
      GRAY_LIGHT: 'hover:bg-gray-50',
    },
    BORDERS: {
      GRAY_100: 'border-gray-100',
      GRAY_300: 'border-gray-300',
    },
    FOCUS: {
      BLUE: 'focus:ring-blue-500 focus:border-transparent',
    },
    DISABLED: {
      OPACITY: 'disabled:opacity-50',
      CURSOR: 'disabled:cursor-not-allowed',
    },
  },
  SIZES: {
    ICON: {
      SMALL: 'h-4 w-4',
      MEDIUM: 'h-5 w-5',
      LARGE: 'h-6 w-6',
    },
    AVATAR: {
      SMALL: 'h-8 w-8',
      MEDIUM: 'h-12 w-12',
      LARGE: 'h-16 w-16',
    },
    SKELETON: {
      HEIGHT: 'h-8',
      WIDTH: 'w-1/4',
      MARGIN: 'mb-6',
    },
  },
  SPACING: {
    CONTAINER_MAX_WIDTH: 'max-w-6xl',
    CARD_PADDING: 'p-6',
    SECTION_MARGIN: 'mb-6',
    ITEM_SPACING: 'space-y-4',
  },
  ANIMATIONS: {
    TRANSITION: 'transition-colors',
    PULSE: 'animate-pulse',
  },
} as const;

// Text Configuration
export const TEXT_CONFIG = {
  TITLES: {
    NETWORKING_DASHBOARD: 'Networking Dashboard',
    CONNECTIONS: 'Connections',
    DISCOVER_PEERS: 'Discover Peers',
    STUDY_GROUPS: 'Study Groups',
    NOTIFICATIONS: 'Notifications',
  },
  DESCRIPTIONS: {
    NETWORKING_DASHBOARD: 'Connect with peers, join study groups, and build your learning network',
    DISCOVER_PEERS: 'Find study partners with AI-powered matching',
    STUDY_GROUPS: 'Join collaborative learning groups or create your own',
  },
  LABELS: {
    CONNECTIONS: 'Connections',
    GROUPS: 'Groups',
    MEMBERS: 'members',
    CREATED: 'Created',
    JOINED: 'Joined',
    CREATED_BY: 'Created by',
    GROUP_NAME: 'Group Name',
    DESCRIPTION: 'Description',
    SUBJECT: 'Subject',
    PRIVACY_LEVEL: 'Privacy Level',
    MAX_MEMBERS: 'Max Members',
    COMPATIBILITY_UNKNOWN: 'Unknown',
    COMPATIBILITY_EXCELLENT: 'Excellent Match',
    COMPATIBILITY_GOOD: 'Good Match',
    COMPATIBILITY_FAIR: 'Fair Match',
    COMPATIBILITY_LOW: 'Low Match',
  },
  ACTIONS: {
    CONNECT: 'Connect',
    MESSAGE: 'Message',
    DISCOVER_PEERS: 'Discover Peers',
    JOIN_GROUP: 'Join Group',
    LEAVE_GROUP: 'Leave Group',
    CREATE_GROUP: 'Create Group',
    CREATE_FIRST_GROUP: 'Create First Group',
    VIEW_GROUP: 'View Group',
    CHAT: 'Chat',
    SEND: 'Send',
    SEARCH: 'Search',
    CANCEL: 'Cancel',
    CREATING: 'Creating...',
    JOINING: 'Joining...',
    CONNECTING: 'Connecting...',
    CONNECTION_SENT: 'Connection sent',
    CLEAR_FILTERS: 'Clear Filters',
    REFRESH: 'Refresh',
  },
  MESSAGES: {
    NO_CONNECTIONS: 'You haven\'t made any connections yet',
    NO_CONNECTIONS_FOUND: 'No connections found',
    NO_GROUPS_FOUND: 'No study groups found',
    NO_GROUPS_AVAILABLE: 'No study groups available yet',
    NO_GROUPS_MATCH_FILTER: 'No groups match your current filter',
    GROUP_FULL: 'Full',
    GROUP_NOT_FOUND: 'Group not found',
    GROUP_NOT_FOUND_DESCRIPTION: 'The group you\'re looking for doesn\'t exist or has been removed.',
    NO_MESSAGES: 'No messages yet. Start the conversation!',
    SETTINGS_COMING_SOON: 'Group settings coming soon',
    NO_PEERS_FOUND: 'No peers found',
    TRY_DIFFERENT_FILTERS: 'Try adjusting your filters or search terms to find more peers.',
    NO_PEERS_AVAILABLE: 'No peers available at the moment. Check back later for new study partners!',
  },
  PLACEHOLDERS: {
    SEARCH_PEERS: 'Search by name, skills, or interests...',
    SEARCH_GROUPS: 'Search groups by name, subject, or description...',
    TYPE_MESSAGE: 'Type your message...',
    GROUP_NAME: 'e.g., Machine Learning Study Group',
    GROUP_DESCRIPTION: 'Describe what your group will focus on...',
    SUBJECT: 'e.g., Computer Science, Mathematics',
  },
  FILTERS: {
    ALL: 'All',
    ALL_GROUPS: 'All Groups',
    MY_GROUPS: 'My Groups',
    PUBLIC: 'Public',
    PRIVATE: 'Private',
    ACTIVE: 'Active',
    PENDING: 'Pending',
    SENT: 'Sent',
    RECEIVED: 'Received',
  },
  OPTIONS: {
    ANY_LEVEL: 'Any Level',
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    EVENING: 'Evening',
    WEEKEND: 'Weekend',
    PUBLIC: 'Public - Anyone can join',
    PRIVATE: 'Private - Approval required',
    READ: 'Read',
    UNREAD: 'Unread',
  },
  NOTIFICATION_TYPES: {
    CONNECTION_REQUEST: 'Connection Requests',
    CONNECTION_ACCEPTED: 'Connection Accepted',
    GROUP_INVITATION: 'Group Invitations',
    GROUP_JOINED: 'Group Joined',
    MESSAGE: 'Messages',
    STUDY_SESSION: 'Study Sessions',
  },
  TABS: {
    MESSAGES: 'Messages',
    MEMBERS: 'Members',
    SETTINGS: 'Settings',
  },
  STATUS: {
    NO_RESULTS: 'No Results Found',
    LOADING: 'Loading...',
    ERROR: 'Something went wrong',
    SUCCESS: 'Success',
    CONNECTING: 'Connecting...',
    CONNECTED: 'Connected',
    DISCONNECTED: 'Disconnected',
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    AWAY: 'Away',
  },
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  TYPES: {
    CONNECTION_REQUEST: 'connection_request',
    CONNECTION_ACCEPTED: 'connection_accepted',
    GROUP_INVITATION: 'group_invitation',
    GROUP_JOINED: 'group_joined',
    MESSAGE: 'message',
    STUDY_SESSION: 'study_session',
  },
  PRIORITIES: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
  DELIVERY: {
    IMMEDIATE: 0,
    DELAYED: 300000, // 5 minutes
    BATCH: 3600000, // 1 hour
  },
  SETTINGS: {
    ENABLED: FEATURE_FLAGS.ENABLE_NOTIFICATIONS,
    SOUND_ENABLED: true,
    PUSH_ENABLED: true,
    EMAIL_ENABLED: true,
  },
} as const;

// Default Values
export const DEFAULTS = {
  PROFILE_COMPLETENESS_MULTIPLIER: 2,
  SAME_TIMEZONE_SCORE: 100,
  TIMEZONE_COMPATIBILITY_SCORE: 70,
  MAX_GROUP_MEMBERS: 50,
  MIN_GROUP_MEMBERS: 2,
  LOADING_SKELETON_ITEMS: 6,
  DEBOUNCE_DELAY: 300,
  SEARCH_MIN_LENGTH: 2,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_GROUP_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

// Feature Flags Integration
export const NETWORKING_FEATURES = {
  AI_MATCHING: FEATURE_FLAGS.ENABLE_AI_MATCHING,
  ADVANCED_FILTERS: FEATURE_FLAGS.ENABLE_ADVANCED_FILTERS,
  REAL_TIME_CHAT: FEATURE_FLAGS.ENABLE_REAL_TIME_CHAT,
  NOTIFICATIONS: FEATURE_FLAGS.ENABLE_NOTIFICATIONS,
} as const;

// Match Keywords for AI-powered suggestions
export const MATCH_KEYWORDS = {
  STUDY_STYLES: ['visual', 'auditory', 'kinesthetic', 'reading', 'writing'],
  SUBJECTS: ['mathematics', 'science', 'computer science', 'engineering', 'business', 'arts', 'languages'],
  GOALS: ['exam preparation', 'skill building', 'career development', 'academic research', 'certification'],
  AVAILABILITY: ['morning', 'afternoon', 'evening', 'weekend', 'weekday', 'flexible'],
  EXPERIENCE: ['beginner', 'intermediate', 'advanced', 'expert', 'professional'],
} as const;

export default {
  API_CONFIG,
  COMPATIBILITY_CONFIG,
  STUDY_STYLE_MATRIX,
  DATABASE_CONFIG,
  UI_CONFIG,
  TEXT_CONFIG,
  NOTIFICATION_CONFIG,
  DEFAULTS,
  NETWORKING_FEATURES,
  MATCH_KEYWORDS,
};