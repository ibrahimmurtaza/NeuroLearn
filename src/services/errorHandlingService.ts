export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  CRITICAL = 'CRITICAL',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ProcessingError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: Date;
  context?: {
    userId?: string;
    videoId?: string;
    operation?: string;
    stage?: string;
  };
  stack?: string;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface ProgressUpdate {
  id: string;
  stage: string;
  progress: number; // 0-100
  message: string;
  timestamp: Date;
  estimatedTimeRemaining?: number; // seconds
  context?: {
    userId?: string;
    videoId?: string;
    operation?: string;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errors: Map<string, ProcessingError> = new Map();
  private progressUpdates: Map<string, ProgressUpdate[]> = new Map();
  private retryConfig: RetryConfig;

  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.EXTERNAL_API_ERROR,
        ErrorType.STORAGE_ERROR,
        ErrorType.RATE_LIMIT_ERROR
      ]
    };
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Create and log an error
   */
  createError(
    type: ErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity;
      details?: any;
      context?: ProcessingError['context'];
      originalError?: Error;
      retryable?: boolean;
    } = {}
  ): ProcessingError {
    const {
      severity = ErrorSeverity.MEDIUM,
      details,
      context,
      originalError,
      retryable = this.retryConfig.retryableErrors.includes(type)
    } = options;

    const error: ProcessingError = {
      id: this.generateId(),
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      context,
      stack: originalError?.stack,
      retryable,
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries
    };

    this.errors.set(error.id, error);
    this.logError(error);

    return error;
  }

  /**
   * Update progress for an operation
   */
  updateProgress(
    operationId: string,
    stage: string,
    progress: number,
    message: string,
    options: {
      estimatedTimeRemaining?: number;
      context?: ProgressUpdate['context'];
    } = {}
  ): ProgressUpdate {
    const { estimatedTimeRemaining, context } = options;

    const update: ProgressUpdate = {
      id: this.generateId(),
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      timestamp: new Date(),
      estimatedTimeRemaining,
      context
    };

    if (!this.progressUpdates.has(operationId)) {
      this.progressUpdates.set(operationId, []);
    }

    const updates = this.progressUpdates.get(operationId)!;
    updates.push(update);

    // Keep only last 50 updates per operation
    if (updates.length > 50) {
      updates.splice(0, updates.length - 50);
    }

    this.logProgress(update);

    return update;
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      userId?: string;
      videoId?: string;
    },
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    let lastError: ProcessingError | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const errorType = this.classifyError(error);
        const processingError = this.createError(errorType, error.message, {
          severity: this.getSeverityForError(errorType),
          details: { attempt, maxRetries: config.maxRetries },
          context: {
            userId: context.userId,
            videoId: context.videoId,
            operation: context.operationName
          },
          originalError: error,
          retryable: config.retryableErrors.includes(errorType)
        });

        lastError = processingError;

        // Don't retry if error is not retryable or we've reached max retries
        if (!processingError.retryable || attempt >= config.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        console.log(`Retrying operation ${context.operationName} in ${delay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
        await this.sleep(delay);
      }
    }

    throw new Error(`Operation ${context.operationName} failed after ${config.maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Wrap async operation with progress tracking
   */
  async executeWithProgress<T>(
    operationId: string,
    operation: (updateProgress: (stage: string, progress: number, message: string) => void) => Promise<T>,
    context: {
      userId?: string;
      videoId?: string;
      operation?: string;
    } = {}
  ): Promise<T> {
    const updateProgress = (stage: string, progress: number, message: string) => {
      this.updateProgress(operationId, stage, progress, message, { context });
    };

    try {
      updateProgress('started', 0, 'Operation started');
      const result = await operation(updateProgress);
      updateProgress('completed', 100, 'Operation completed successfully');
      return result;
    } catch (error: any) {
      const processingError = this.createError(
        this.classifyError(error),
        error.message,
        {
          context: {
            ...context,
            operation: context.operation || 'unknown'
          },
          originalError: error
        }
      );
      
      updateProgress('error', 0, `Operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get progress updates for an operation
   */
  getProgressUpdates(operationId: string): ProgressUpdate[] {
    return this.progressUpdates.get(operationId) || [];
  }

  /**
   * Get latest progress for an operation
   */
  getLatestProgress(operationId: string): ProgressUpdate | null {
    const updates = this.progressUpdates.get(operationId);
    return updates && updates.length > 0 ? updates[updates.length - 1] : null;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ProcessingError | null {
    return this.errors.get(errorId) || null;
  }

  /**
   * Get all errors for a context
   */
  getErrorsForContext(context: Partial<ProcessingError['context']>): ProcessingError[] {
    return Array.from(this.errors.values()).filter(error => {
      if (!error.context) return false;
      
      return Object.entries(context || {}).every(([key, value]) => {
        return error.context![key as keyof ProcessingError['context']] === value;
      });
    });
  }

  /**
   * Clear old errors and progress updates
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoff = new Date(Date.now() - maxAge);
    
    // Clean up errors
    for (const [id, error] of Array.from(this.errors.entries())) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
      }
    }
    
    // Clean up progress updates
    for (const [operationId, updates] of Array.from(this.progressUpdates.entries())) {
      const filteredUpdates = updates.filter((update: ProgressUpdate) => update.timestamp >= cutoff);
      if (filteredUpdates.length === 0) {
        this.progressUpdates.delete(operationId);
      } else {
        this.progressUpdates.set(operationId, filteredUpdates);
      }
    }
  }

  /**
   * Classify error type based on error object
   */
  private classifyError(error: any): ErrorType {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    // Network errors
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || code.includes('enotfound') ||
        code.includes('econnrefused')) {
      return ErrorType.NETWORK_ERROR;
    }
    
    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests') ||
        error.status === 429) {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    
    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') ||
        error.status === 401 || error.status === 403) {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    
    // File errors
    if (message.includes('file') || message.includes('enoent') ||
        code.includes('enoent')) {
      return ErrorType.FILE_ERROR;
    }
    
    // Database errors
    if (message.includes('database') || message.includes('sql') ||
        message.includes('postgres') || code.startsWith('23')) {
      return ErrorType.DATABASE_ERROR;
    }
    
    // Storage errors
    if (message.includes('storage') || message.includes('bucket') ||
        message.includes('upload')) {
      return ErrorType.STORAGE_ERROR;
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        error.status === 400) {
      return ErrorType.VALIDATION_ERROR;
    }
    
    // External API errors
    if (message.includes('api') || message.includes('openai') ||
        message.includes('youtube') || (error.status >= 500 && error.status < 600)) {
      return ErrorType.EXTERNAL_API_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Get severity for error type
   */
  private getSeverityForError(errorType: ErrorType): ErrorSeverity {
    switch (errorType) {
      case ErrorType.CRITICAL:
      case ErrorType.DATABASE_ERROR:
        return ErrorSeverity.CRITICAL;
      
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.STORAGE_ERROR:
      case ErrorType.EXTERNAL_API_ERROR:
        return ErrorSeverity.HIGH;
      
      case ErrorType.PROCESSING_ERROR:
      case ErrorType.FILE_ERROR:
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.MEDIUM;
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.RATE_LIMIT_ERROR:
        return ErrorSeverity.LOW;
      
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Log error to console and potentially external service
   */
  private logError(error: ProcessingError): void {
    const logLevel = this.getLogLevelForSeverity(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    
    console[logLevel](logMessage, {
      id: error.id,
      severity: error.severity,
      context: error.context,
      details: error.details,
      timestamp: error.timestamp
    });
    
    // In production, you might want to send critical errors to an external service
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Send to error tracking service (e.g., Sentry, Rollbar)
    }
  }

  /**
   * Log progress update
   */
  private logProgress(update: ProgressUpdate): void {
    console.log(`[PROGRESS] ${update.stage}: ${update.progress}% - ${update.message}`, {
      id: update.id,
      context: update.context,
      timestamp: update.timestamp
    });
  }

  /**
   * Get console log level for severity
   */
  private getLogLevelForSeverity(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ErrorHandlingService };
export default ErrorHandlingService;