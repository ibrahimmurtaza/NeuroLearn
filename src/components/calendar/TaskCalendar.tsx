'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Clock, Target, AlertCircle, Check, X, MoreHorizontal, Trash2, Play, Pause, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const localizer = momentLocalizer(moment);

interface TaskEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedDuration?: number;
    actualDuration?: number;
    due_date?: string;
    goal?: {
      id: string;
      title: string;
      category: string;
    } | null;
  };
}

interface TaskCalendarProps {
  className?: string;
  defaultView?: View;
  height?: number;
}

export default function TaskCalendar({ className, height = 600 }: TaskCalendarProps) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // October 2025 (month is 0-indexed)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [deletingTasks, setDeletingTasks] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: null,
    taskTitle: ''
  });

  // Refs for stable state management
  const isMountedRef = useRef(true);
  const lastFetchParamsRef = useRef<string>('');
  const lastFetchTimeRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  const lastRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Reset mounted ref on each render to handle React StrictMode
  useEffect(() => {
    isMountedRef.current = true;
  });

  // Helper function to check if task is overdue
  const isTaskOverdue = useCallback((task: TaskEvent) => {
    if (task.resource.status === 'completed' || task.resource.status === 'cancelled') {
      return false;
    }
    
    const dueDate = task.resource.due_date ? new Date(task.resource.due_date) : task.end;
    const now = new Date();
    return dueDate < now;
  }, []);

  // Calculate date range based on current view - memoized to prevent re-renders
  const getDateRange = useCallback((date: Date, view: View) => {
    let start, end;
    
    if (view === Views.MONTH) {
      // For month view, calculate the full calendar grid range including overflow dates
      // Start from the first day of the week that contains the first day of the month
      const firstDayOfMonth = moment(date).startOf('month');
      start = firstDayOfMonth.clone().startOf('week');
      
      // End at the last day of the week that contains the last day of the month
      const lastDayOfMonth = moment(date).endOf('month');
      end = lastDayOfMonth.clone().endOf('week');
    } else {
      // For week and day views, use the standard range
      start = moment(date).startOf(view === Views.WEEK ? 'week' : 'day');
      end = moment(date).endOf(view === Views.WEEK ? 'week' : 'day');
    }
    
    // Debug logging to see what date ranges are being used
    console.log('TaskCalendar - Date range calculation:', {
      currentDate: date.toISOString(),
      view,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
    
    return { start: start.toDate(), end: end.toDate() };
  }, []);

  // Function to delete task
  const deleteTask = useCallback(async (taskId: string) => {
    if (deletingTasks.has(taskId)) return; // Prevent duplicate requests

    setDeletingTasks(prev => new Set(prev).add(taskId));

    // Optimistically remove from UI
    const originalEvents = [...events];
    setEvents(prevEvents => prevEvents.filter(event => event.resource.id !== taskId));

    try {
      const response = await fetch(`/api/schedule/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        // Rollback on failure
        setEvents(originalEvents);
        const error = await response.json();
        toast.error(error.error || 'Failed to delete task');
        return;
      }

      toast.success('Task deleted successfully', {
        description: 'The task has been permanently removed from your calendar.',
        duration: 4000,
      });
    } catch (error) {
      // Rollback on network error
      setEvents(originalEvents);
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task', {
        description: 'Please check your connection and try again.',
      });
    } finally {
      setDeletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      // Close confirmation dialog
      setDeleteConfirmation({
        isOpen: false,
        taskId: null,
        taskTitle: ''
      });
    }
  }, [events, deletingTasks]);

  // Function to open delete confirmation dialog
  const openDeleteConfirmation = useCallback((taskId: string, taskTitle: string) => {
    setDeleteConfirmation({
      isOpen: true,
      taskId,
      taskTitle
    });
  }, []);

  // Function to handle confirmed deletion
  const handleConfirmedDelete = useCallback(() => {
    if (deleteConfirmation.taskId) {
      deleteTask(deleteConfirmation.taskId);
    }
  }, [deleteConfirmation.taskId, deleteTask]);

  // Function to update task status
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    if (updatingTasks.has(taskId)) return; // Prevent duplicate requests

    setUpdatingTasks(prev => new Set(prev).add(taskId));
    
    // Optimistically update the UI
    const originalEvents = [...events];
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.resource.id === taskId 
          ? { ...event, resource: { ...event.resource, status: newStatus } }
          : event
      )
    );

    try {
      const response = await fetch(`/api/schedule/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        })
      });

      if (!response.ok) {
        // Rollback on failure
        setEvents(originalEvents);
        const error = await response.json();
        toast.error(error.error || 'Failed to update task status');
        return;
      }

      const statusMessages = {
        pending: 'Task marked as pending',
        in_progress: 'Task marked as in progress',
        completed: 'Task completed! 🎉',
        cancelled: 'Task cancelled'
      };

      toast.success(statusMessages[newStatus]);
    } catch (error) {
      // Rollback on network error
      setEvents(originalEvents);
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [events, updatingTasks]);

  // Simple debounce utility function
  const debounce = useCallback(<T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    }) as T;
  }, []);

  // Debounced fetch function to prevent excessive API calls
  const fetchCalendarTasks = useCallback(
    debounce(async (startDate?: Date, endDate?: Date, force = false) => {
      if (!isMountedRef.current) return;

      const { start, end } = startDate && endDate 
        ? { start: startDate, end: endDate }
        : getDateRange(currentDate, currentView);

      const params = new URLSearchParams({
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        include_completed: 'true'
      });

      const paramsString = params.toString();
      
      // Only prevent duplicate calls if they happen within a short time window
      const now = Date.now();
      const timeSinceLastFetch = now - (lastFetchTimeRef.current || 0);
      
      if (!force && lastFetchParamsRef.current === paramsString && timeSinceLastFetch < 30000) {
        return;
      }
      
      lastFetchParamsRef.current = paramsString;
      lastFetchTimeRef.current = now;

      try {
        setError(null);
        
        const response = await fetch(`/api/schedule/calendar/tasks?${paramsString}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!isMountedRef.current) return;
        
        const formattedEvents: TaskEvent[] = (data.events || []).map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: new Date(event.end),
          allDay: event.allDay || false,
          resource: event.resource
        }));

        setEvents(formattedEvents);
        
      } catch (err) {
        console.error('Error fetching tasks:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load tasks');
          toast.error('Failed to load calendar tasks');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, 300), // 300ms debounce
    [getDateRange, currentDate, currentView]
  );



  // Single useEffect for handling view and date changes
  useEffect(() => {
    if (!currentDate) return;
    
    setLoading(true);
    fetchCalendarTasks();
  }, [currentDate, currentView, fetchCalendarTasks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Enhanced event style getter with overdue indicators
  const eventStyleGetter = (event: TaskEvent) => {
    const { resource } = event;
    const { status, priority } = resource;
    const isUpdating = updatingTasks.has(resource.id);
    const isDeleting = deletingTasks.has(resource.id);
    const overdue = isTaskOverdue(event);

    let backgroundColor, borderColor, textColor;

    // Status-based styling with overdue indicators
    if (status === 'completed') {
      backgroundColor = '#6B7280'; // Gray-500
      borderColor = '#4B5563'; // Gray-600
      textColor = '#F9FAFB'; // Gray-50
    } else if (status === 'cancelled') {
      backgroundColor = '#9CA3AF'; // Gray-400
      borderColor = '#6B7280'; // Gray-500
      textColor = '#374151'; // Gray-700
    } else if (overdue) {
      // Overdue tasks get red styling regardless of priority
      backgroundColor = '#DC2626'; // Red-600
      borderColor = '#B91C1C'; // Red-700
      textColor = '#FFFFFF';
    } else {
      // Priority-based styling for active tasks
      switch (priority) {
        case 'urgent':
          backgroundColor = '#DC2626'; // Red-600
          borderColor = '#B91C1C'; // Red-700
          textColor = '#FFFFFF';
          break;
        case 'high':
          backgroundColor = '#EA580C'; // Orange-600
          borderColor = '#C2410C'; // Orange-700
          textColor = '#FFFFFF';
          break;
        case 'medium':
          backgroundColor = '#CA8A04'; // Yellow-600
          borderColor = '#A16207'; // Yellow-700
          textColor = '#FFFFFF';
          break;
        case 'low':
        default:
          backgroundColor = '#16A34A'; // Green-600
          borderColor = '#15803D'; // Green-700
          textColor = '#FFFFFF';
          break;
      }
    }

    // In-progress tasks get a blue accent
    if (status === 'in_progress' && !overdue) {
      backgroundColor = '#2563EB'; // Blue-600
      borderColor = '#1D4ED8'; // Blue-700
      textColor = '#FFFFFF';
    }

    return {
      style: {
        backgroundColor: isDeleting ? '#EF4444' : backgroundColor,
        borderColor: isDeleting ? '#DC2626' : borderColor,
        color: textColor,
        border: `2px solid ${isDeleting ? '#DC2626' : borderColor}`,
        borderRadius: '6px',
        opacity: status === 'completed' ? 0.8 : isDeleting ? 0.6 : 1,
        textDecoration: status === 'completed' ? 'line-through' : 'none',
        fontWeight: priority === 'urgent' || overdue ? 'bold' : 'normal',
        boxShadow: priority === 'urgent' || overdue 
          ? '0 2px 8px rgba(220, 38, 38, 0.4)' 
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-in-out',
        transform: isUpdating || isDeleting ? 'scale(0.98)' : 'scale(1)',
        filter: isUpdating || isDeleting ? 'brightness(0.9)' : 'brightness(1)',
        // Pulsing animation for overdue tasks
        animation: overdue && status !== 'completed' && status !== 'cancelled' 
          ? 'pulse 2s infinite' 
          : 'none',
      }
    };
  };

  // Enhanced custom event component with more controls
  const EventComponent = ({ event }: { event: TaskEvent }) => {
    const { resource } = event;
    const isUpdating = updatingTasks.has(resource.id);
    const isDeleting = deletingTasks.has(resource.id);
    const overdue = isTaskOverdue(event);
    const [showControls, setShowControls] = useState(false);

    const handleStatusChange = (e: React.MouseEvent, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
      e.stopPropagation();
      updateTaskStatus(resource.id, newStatus);
      setShowControls(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      openDeleteConfirmation(resource.id, resource.title);
      setShowControls(false);
    };

    return (
      <div 
        className="relative group h-full w-full"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="flex items-center justify-between h-full px-2 py-1">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex-1 truncate text-xs font-medium">
              {event.title}
              {overdue && (
                <span className="ml-1 text-xs">⚠️</span>
              )}
            </div>
            {resource.priority === 'urgent' && (
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
            )}
            {resource.status === 'in_progress' && (
              <Play className="w-3 h-3 flex-shrink-0" />
            )}
          </div>
          
          {/* Enhanced quick action buttons */}
          {showControls && !isUpdating && !isDeleting && (
            <div className="flex items-center gap-1 ml-1">
              {resource.status === 'pending' && (
                <button
                  onClick={(e) => handleStatusChange(e, 'in_progress')}
                  className="w-4 h-4 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                  title="Start task"
                >
                  <Play className="w-2 h-2 text-white" />
                </button>
              )}
              {resource.status === 'in_progress' && (
                <button
                  onClick={(e) => handleStatusChange(e, 'pending')}
                  className="w-4 h-4 bg-yellow-600 hover:bg-yellow-700 rounded-full flex items-center justify-center transition-colors"
                  title="Pause task"
                >
                  <Pause className="w-2 h-2 text-white" />
                </button>
              )}
              {resource.status !== 'completed' && (
                <button
                  onClick={(e) => handleStatusChange(e, 'completed')}
                  className="w-4 h-4 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors"
                  title="Mark as completed"
                >
                  <Check className="w-2.5 h-2.5 text-white" />
                </button>
              )}
              {resource.status === 'completed' && (
                <button
                  onClick={(e) => handleStatusChange(e, 'pending')}
                  className="w-4 h-4 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                  title="Mark as pending"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="w-4 h-4 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-2 h-2 text-white" />
              </button>
            </div>
          )}
          
          {(isUpdating || isDeleting) && (
            <div className="w-4 h-4 ml-1">
              <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: height }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading calendar tasks...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Task Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: height }}>
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => fetchCalendarTasks()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Task Calendar
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{events.length} tasks scheduled</span>
            <span>{events.filter(e => e.resource.status === 'completed').length} completed</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Hover over tasks to see quick actions
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="calendar-container">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={currentView}
            onView={(view) => {
              if (view !== currentView) {
                setCurrentView(view);
              }
            }}
            date={currentDate}
            onNavigate={(date) => {
              if (!currentDate || date.getTime() !== currentDate.getTime()) {
                console.log('TaskCalendar - Navigation triggered:', {
                  from: currentDate?.toISOString(),
                  to: date.toISOString()
                });
                // Clear events immediately to prevent flickering
                setEvents([]);
                setCurrentDate(date);
              }
            }}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            popup
            popupOffset={{ x: 30, y: 20 }}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            step={30}
            showMultiDayTimes
            tooltipAccessor={(event: TaskEvent) => {
              const { resource } = event;
              const statusEmoji = {
                pending: '⏳',
                in_progress: '🔄',
                completed: '✅',
                cancelled: '❌'
              };
              const priorityEmoji = {
                low: '🟢',
                medium: '🟡',
                high: '🟠',
                urgent: '🔴'
              };
              return `${statusEmoji[resource.status]} ${event.title}\n${priorityEmoji[resource.priority]} Priority: ${resource.priority}\nStatus: ${resource.status}${resource.estimatedDuration ? `\nDuration: ${resource.estimatedDuration}min` : ''}${resource.goal ? `\nGoal: ${resource.goal.title}` : ''}`;
            }}
          />
        </div>
        
        {/* Enhanced Legend with overdue indicators */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Calendar Legend</h3>
          
          {/* Priority Legend */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Priority Levels</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded border border-red-700"></div>
                <span className="text-xs text-gray-600">Urgent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-600 rounded border border-orange-700"></div>
                <span className="text-xs text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-600 rounded border border-yellow-700"></div>
                <span className="text-xs text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded border border-green-700"></div>
                <span className="text-xs text-gray-600">Low</span>
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Task Status</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded border border-blue-700"></div>
                <span className="text-xs text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded border border-gray-600 opacity-80"></div>
                <span className="text-xs text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-400 rounded border border-gray-500"></div>
                <span className="text-xs text-gray-600">Cancelled</span>
              </div>
            </div>
          </div>

          {/* Special Indicators */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Special Indicators</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded border border-red-700 animate-pulse"></div>
                <span className="text-xs text-gray-600">Overdue ⚠️</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-600" />
                <span className="text-xs text-gray-600">Urgent Priority</span>
              </div>
              <div className="flex items-center gap-1">
                <Play className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-gray-600">Active Task</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Guide */}
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-2">Quick Actions</h4>
            <p className="text-xs text-gray-500 mb-2">Hover over tasks to see action buttons:</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>▶️ Start/Resume</span>
              <span>⏸️ Pause</span>
              <span>✅ Complete</span>
              <span>🗑️ Delete</span>
              <span>↩️ Reopen</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Enhanced CSS Styles */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .rbc-event {
          border-radius: 6px !important;
          border: none !important;
          padding: 2px 6px !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          transition: all 0.2s ease-in-out !important;
        }
        
        .rbc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        
        .rbc-event-content {
          font-weight: 500 !important;
        }
        
        .rbc-today {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        
        .rbc-off-range-bg {
          background-color: #f8fafc !important;
        }
        
        .rbc-date-cell {
          padding: 8px !important;
          font-weight: 500 !important;
        }
        
        .rbc-header {
          padding: 12px 8px !important;
          font-weight: 600 !important;
          background-color: #f1f5f9 !important;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        
        .rbc-month-view {
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }
        
        .rbc-day-bg {
          border-right: 1px solid #f1f5f9 !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        
        .rbc-day-bg:hover {
          background-color: rgba(59, 130, 246, 0.05) !important;
        }

        /* Pulsing animation for overdue tasks */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }

        /* Loading spinner animation */
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Enhanced hover effects for task controls */
        .group:hover .group-hover\\:opacity-100 {
          opacity: 1 !important;
        }

        /* Smooth transitions for all interactive elements */
        button {
          transition: all 0.15s ease-in-out !important;
        }

        button:hover {
          transform: scale(1.05) !important;
        }

        button:active {
          transform: scale(0.95) !important;
        }
      `}</style>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmation({
            isOpen: false,
            taskId: null,
            taskTitle: ''
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
               <AlertTriangle className="h-5 w-5" />
               Delete Task
             </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete "{deleteConfirmation.taskTitle}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({
                isOpen: false,
                taskId: null,
                taskTitle: ''
              })}
              disabled={deleteConfirmation.taskId ? deletingTasks.has(deleteConfirmation.taskId) : false}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmedDelete}
              disabled={deleteConfirmation.taskId ? deletingTasks.has(deleteConfirmation.taskId) : false}
              className="flex items-center gap-2"
            >
              {deleteConfirmation.taskId && deletingTasks.has(deleteConfirmation.taskId) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};