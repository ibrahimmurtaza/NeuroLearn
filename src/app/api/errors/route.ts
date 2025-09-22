import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';

/**
 * GET /api/errors
 * Get errors with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const videoId = searchParams.get('videoId');
    const operation = searchParams.get('operation');
    const type = searchParams.get('type') as ErrorType;
    const severity = searchParams.get('severity') as ErrorSeverity;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const errorHandler = ErrorHandlingService.getInstance();
    
    // Build context filter
    const contextFilter: any = {};
    if (userId) contextFilter.userId = userId;
    if (videoId) contextFilter.videoId = videoId;
    if (operation) contextFilter.operation = operation;
    
    // Get errors for context
    let errors = errorHandler.getErrorsForContext(contextFilter);
    
    // Apply additional filters
    if (type) {
      errors = errors.filter(error => error.type === type);
    }
    
    if (severity) {
      errors = errors.filter(error => error.severity === severity);
    }
    
    // Sort by timestamp (newest first)
    errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    const paginatedErrors = errors.slice(offset, offset + limit);
    
    // Format response
    const formattedErrors = paginatedErrors.map(error => ({
      id: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
      retryable: error.retryable,
      retryCount: error.retryCount,
      maxRetries: error.maxRetries,
      details: error.details
    }));
    
    const response = {
      errors: formattedErrors,
      pagination: {
        total: errors.length,
        limit,
        offset,
        hasMore: offset + limit < errors.length
      },
      filters: {
        userId,
        videoId,
        operation,
        type,
        severity
      },
      summary: {
        totalErrors: errors.length,
        errorsByType: getErrorCountByType(errors),
        errorsBySeverity: getErrorCountBySeverity(errors),
        retryableErrors: errors.filter(e => e.retryable).length,
        recentErrors: errors.filter(e => 
          Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
        ).length
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Error retrieval failed:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve errors', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/errors
 * Create a new error (for testing or external reporting)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      message,
      severity = ErrorSeverity.MEDIUM,
      context,
      details,
      retryable
    } = body;
    
    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      );
    }
    
    // Validate error type
    if (!Object.values(ErrorType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid error type', validTypes: Object.values(ErrorType) },
        { status: 400 }
      );
    }
    
    // Validate severity
    if (!Object.values(ErrorSeverity).includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity level', validSeverities: Object.values(ErrorSeverity) },
        { status: 400 }
      );
    }
    
    const errorHandler = ErrorHandlingService.getInstance();
    
    const createdError = errorHandler.createError(type, message, {
      severity,
      context,
      details,
      retryable
    });
    
    return NextResponse.json({
      success: true,
      error: {
        id: createdError.id,
        type: createdError.type,
        severity: createdError.severity,
        message: createdError.message,
        timestamp: createdError.timestamp,
        context: createdError.context,
        retryable: createdError.retryable
      }
    });
    
  } catch (error: any) {
    console.error('Error creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/errors
 * Clean up old errors
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const maxAge = parseInt(searchParams.get('maxAge') || '86400000'); // 24 hours default
    
    const errorHandler = ErrorHandlingService.getInstance();
    errorHandler.cleanup(maxAge);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up errors older than ${maxAge}ms`
    });
    
  } catch (error: any) {
    console.error('Error cleanup failed:', error);
    return NextResponse.json(
      { error: 'Failed to clean up errors', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to count errors by type
 */
function getErrorCountByType(errors: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const error of errors) {
    counts[error.type] = (counts[error.type] || 0) + 1;
  }
  
  return counts;
}

/**
 * Helper function to count errors by severity
 */
function getErrorCountBySeverity(errors: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const error of errors) {
    counts[error.severity] = (counts[error.severity] || 0) + 1;
  }
  
  return counts;
}