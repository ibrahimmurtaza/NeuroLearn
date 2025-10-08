/**
 * Environment Configuration
 * Centralized environment variable handling for the NeuroLearn application
 */

// Database Configuration
export const DATABASE_CONFIG = {
  URL: process.env.DATABASE_URL || '',
  SUPABASE: {
    URL: process.env.SUPABASE_URL || '',
    ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
} as const;

// Networking Module Environment Configuration
export const NETWORKING_ENV_CONFIG = {
  API_TIMEOUT: parseInt(process.env.NETWORKING_API_TIMEOUT || '30000'),
  MAX_SUGGESTIONS: parseInt(process.env.NETWORKING_MAX_SUGGESTIONS || '50'),
  MIN_COMPATIBILITY_SCORE: parseInt(process.env.NETWORKING_MIN_COMPATIBILITY_SCORE || '70'),
  CACHE_TTL: parseInt(process.env.NETWORKING_CACHE_TTL || '300000'),
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AI_MATCHING: process.env.ENABLE_AI_MATCHING === 'true',
  ENABLE_ADVANCED_FILTERS: process.env.ENABLE_ADVANCED_FILTERS === 'true',
  ENABLE_REAL_TIME_CHAT: process.env.ENABLE_REAL_TIME_CHAT === 'true',
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS === 'true',
} as const;

// External Services Configuration
export const EXTERNAL_SERVICES_CONFIG = {
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
  },
  STRIPE: {
    PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  },
} as const;

// Email Configuration
export const EMAIL_CONFIG = {
  SMTP: {
    HOST: process.env.SMTP_HOST || '',
    PORT: parseInt(process.env.SMTP_PORT || '587'),
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
  },
} as const;

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID || '',
  MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN || '',
} as const;

// Development Configuration
export const DEV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEBUG: process.env.DEBUG === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;

// Environment Validation
export const validateEnvironment = () => {
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

// Environment-based configuration overrides
export const getEnvironmentConfig = () => {
  const isProduction = DEV_CONFIG.NODE_ENV === 'production';
  const isDevelopment = DEV_CONFIG.NODE_ENV === 'development';

  return {
    isProduction,
    isDevelopment,
    // Override networking config based on environment
    networking: {
      ...NETWORKING_ENV_CONFIG,
      API_TIMEOUT: isProduction ? 15000 : NETWORKING_ENV_CONFIG.API_TIMEOUT,
      MAX_SUGGESTIONS: isProduction ? 20 : NETWORKING_ENV_CONFIG.MAX_SUGGESTIONS,
    },
    // Override feature flags based on environment
    features: {
      ...FEATURE_FLAGS,
      ENABLE_AI_MATCHING: isProduction ? FEATURE_FLAGS.ENABLE_AI_MATCHING : true,
      ENABLE_REAL_TIME_CHAT: isProduction ? FEATURE_FLAGS.ENABLE_REAL_TIME_CHAT : true,
    },
  };
};

export default {
  DATABASE_CONFIG,
  AUTH_CONFIG,
  NETWORKING_ENV_CONFIG,
  FEATURE_FLAGS,
  EXTERNAL_SERVICES_CONFIG,
  EMAIL_CONFIG,
  ANALYTICS_CONFIG,
  DEV_CONFIG,
  validateEnvironment,
  getEnvironmentConfig,
};