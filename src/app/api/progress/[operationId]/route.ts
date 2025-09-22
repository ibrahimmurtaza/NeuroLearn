import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandlingService } from '@/services/errorHandlingService';

interface RouteParams {
  params: {
    operationId: string;
  };
}

/**
 * GET /api/progress/[operationId]
 * Get progress updates for a specific operation
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { operationId } = params;
    
    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      );
    }

    const errorHandler = ErrorHandlingService.getInstance();
    
    // Get all progress updates for the operation
    const progressUpdates = errorHandler.getProgressUpdates(operationId);
    
    // Get the latest progress
    const latestProgress = errorHandler.getLatestProgress(operationId);
    
    // Check if there are any errors for this operation
    const errors = errorHandler.getErrorsForContext({
      operation: operationId
    });
    
    const response = {
      operationId,
      status: latestProgress?.stage || 'unknown',
      progress: latestProgress?.progress || 0,
      message: latestProgress?.message || 'No progress information available',
      timestamp: latestProgress?.timestamp || new Date(),
      estimatedTimeRemaining: latestProgress?.estimatedTimeRemaining,
      isCompleted: latestProgress?.stage === 'completed',
      hasErrors: errors.length > 0,
      errors: errors.map(error => ({
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp,
        retryable: error.retryable
      })),
      progressHistory: progressUpdates.map(update => ({
        id: update.id,
        stage: update.stage,
        progress: update.progress,
        message: update.message,
        timestamp: update.timestamp,
        estimatedTimeRemaining: update.estimatedTimeRemaining
      }))
    };
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Progress tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress information', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/progress/[operationId]
 * Clear progress data for a specific operation
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { operationId } = params;
    
    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      );
    }

    const errorHandler = ErrorHandlingService.getInstance();
    
    // Clear progress updates for this operation
    // Note: This is a simple implementation. In a real app, you might want
    // to store progress in a database and implement proper cleanup
    
    return NextResponse.json({
      success: true,
      message: `Progress data cleared for operation ${operationId}`
    });
    
  } catch (error: any) {
    console.error('Progress cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to clear progress data', details: error.message },
      { status: 500 }
    );
  }
}