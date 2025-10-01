'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  CheckSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock,
  Filter,
  Search,
  Target,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Indent
} from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  goal_id?: string;
  parent_task_id?: string;
  due_date?: string;
  estimated_duration?: number;
  actual_time_spent?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  goal?: Goal;
  parent_task?: {
    id: string;
    title: string;
  };
  subtasks?: {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    estimated_duration?: number;
    actual_time_spent?: number;
  }[];
}

// TaskCard component for hierarchical display
interface TaskCardProps {
  task: Task;
  subtasks: Task[];
  allTasks: Task[];
  isExpanded: boolean;
  onToggleExpansion: (taskId: string) => void;
  onStatusChange: (taskId: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onCreateSubtask: (task: Task) => void;
  onPromoteSubtask?: (task: Task) => void;
  isSubtask?: boolean;
  level?: number;
}

function TaskCard({ 
  task, 
  subtasks, 
  allTasks,
  isExpanded, 
  onToggleExpansion, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onCreateSubtask,
  onPromoteSubtask,
  isSubtask = false,
  level = 0
}: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (dueDate: string) => {
    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil < 0) return { status: 'overdue', color: 'destructive', text: `${Math.abs(daysUntil)} days overdue` };
    if (daysUntil === 0) return { status: 'today', color: 'destructive', text: 'Due today' };
    if (daysUntil === 1) return { status: 'tomorrow', color: 'default', text: 'Due tomorrow' };
    if (daysUntil <= 3) return { status: 'soon', color: 'secondary', text: `Due in ${daysUntil} days` };
    return { status: 'future', color: 'outline', text: `Due in ${daysUntil} days` };
  };

  const getTimeProgress = (estimatedDuration?: number, actualTimeSpent?: number) => {
    if (!estimatedDuration || !actualTimeSpent) return null;
    const percentage = Math.min((actualTimeSpent / estimatedDuration) * 100, 100);
    const isOverTime = actualTimeSpent > estimatedDuration;
    return { percentage, isOverTime, actualTimeSpent, estimatedDuration };
  };

  const getAverageCompletionTime = (taskTitle: string, allTasks: Task[]) => {
    // Find similar completed tasks based on title similarity or same category
    const similarTasks = allTasks.filter(t => 
      t.status === 'completed' && 
      t.actual_time_spent && 
      t.id !== task.id && (
        t.title.toLowerCase().includes(taskTitle.toLowerCase().split(' ')[0]) ||
        taskTitle.toLowerCase().includes(t.title.toLowerCase().split(' ')[0])
      )
    );
    
    if (similarTasks.length === 0) return null;
    
    const totalTime = similarTasks.reduce((sum, t) => sum + (t.actual_time_spent || 0), 0);
    const averageTime = totalTime / similarTasks.length;
    
    return {
      averageTime: Math.round(averageTime),
      sampleSize: similarTasks.length
    };
  };

  const hasSubtasks = subtasks && subtasks.length > 0;
  const marginLeft = level * 24; // 24px per level

  return (
    <div className="space-y-2">
      <Card 
        className={`hover:shadow-md transition-shadow ${
          task.status === 'completed' ? 'bg-green-50 border-green-200' : 
          task.status === 'in_progress' ? 'border-blue-200' : ''
        } ${isSubtask ? 'border-l-4 border-l-gray-300' : ''}`}
        style={{ marginLeft: `${marginLeft}px` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Expansion toggle for parent tasks with subtasks */}
            {!isSubtask && hasSubtasks && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleExpansion(task.id)}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            
            {/* Indent for subtasks without expansion button */}
            {isSubtask && <div className="w-6" />}
            
            {/* Task checkbox */}
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={(checked) => onStatusChange(task.id, checked as boolean)}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Task title with subtask indicator */}
                  <div className="flex items-center gap-2">
                    {isSubtask && <Indent className="w-4 h-4 text-gray-400" />}
                    <h3 className={`font-medium text-gray-900 ${
                      task.status === 'completed' ? 'line-through' : ''
                    }`}>
                      {task.title}
                    </h3>
                  </div>
                  
                  {/* Task description */}
                  {task.description && (
                    <p className={`text-sm text-gray-600 mt-1 ${
                      task.status === 'completed' ? 'line-through' : ''
                    }`}>
                      {task.description}
                    </p>
                  )}
                  
                  {/* Goal reference */}
                  {task.goal && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {task.goal.title}
                    </p>
                  )}
                  
                  {/* Parent task reference for subtasks */}
                  {task.parent_task && (
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      <Indent className="w-3 h-3" />
                      Subtask of: {task.parent_task.title}
                    </p>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-1 ml-2">
                  {!isSubtask && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCreateSubtask(task)}
                      title="Add subtask"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(task)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {isSubtask && onPromoteSubtask && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPromoteSubtask(task)}
                      title="Promote to main task"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Task metadata badges */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                
                {/* Enhanced deadline display */}
                {task.due_date && (() => {
                  const deadlineInfo = getDeadlineStatus(task.due_date);
                  return (
                    <Badge variant={deadlineInfo.color as any} className={`
                      ${deadlineInfo.status === 'overdue' ? 'animate-pulse bg-red-100 text-red-800 border-red-300' : ''}
                      ${deadlineInfo.status === 'today' ? 'bg-orange-100 text-orange-800 border-orange-300' : ''}
                      ${deadlineInfo.status === 'tomorrow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                    `}>
                      <Calendar className="w-3 h-3 mr-1" />
                      {deadlineInfo.text}
                    </Badge>
                  );
                })()}
                
                {/* Time tracking and estimation */}
                {task.estimated_duration && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      Est: {task.estimated_duration}m
                    </Badge>
                    {/* Add actual time spent if available */}
                    {task.actual_time_spent && (
                      <Badge variant={task.actual_time_spent > task.estimated_duration ? 'destructive' : 'secondary'}>
                        <Clock className="w-3 h-3 mr-1" />
                        Spent: {task.actual_time_spent}m
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Time progress bar for tasks with both estimated and actual time */}
                {(() => {
                  const timeProgress = getTimeProgress(task.estimated_duration, task.actual_time_spent);
                  if (timeProgress) {
                    return (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-full px-2 py-1">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              timeProgress.isOverTime ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(timeProgress.percentage, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          timeProgress.isOverTime ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {Math.round(timeProgress.percentage)}%
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Average completion time for similar tasks */}
                {(() => {
                  const avgTime = getAverageCompletionTime(task.title, allTasks);
                  if (avgTime && task.status !== 'completed') {
                    return (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Avg: {avgTime.averageTime}m ({avgTime.sampleSize} similar)
                      </Badge>
                    );
                  }
                  return null;
                })()}
                
                {task.tags && task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {hasSubtasks && (
                  <Badge variant="outline">
                    {subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Render subtasks when expanded */}
      {!isSubtask && hasSubtasks && isExpanded && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <TaskCard
              key={subtask.id}
              task={subtask}
              subtasks={[]}
              allTasks={allTasks}
              isExpanded={false}
              onToggleExpansion={onToggleExpansion}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSubtask={onCreateSubtask}
              onPromoteSubtask={onPromoteSubtask}
              isSubtask={true}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isCreateSubtaskDialogOpen, setIsCreateSubtaskDialogOpen] = useState(false);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    goal_id: '',
    parent_task_id: '',
    due_date: '',
    estimated_duration: '',
    tags: '',
    generate_ai_subtasks: false,
    category: 'general'
  });

  useEffect(() => {
    fetchTasks();
    fetchGoals();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedule/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        toast.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/schedule/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskData = {
        ...formData,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        goal_id: formData.goal_id === 'no-goal' ? null : formData.goal_id || undefined,
        parent_task_id: formData.parent_task_id || undefined,
        generate_ai_subtasks: formData.generate_ai_subtasks && !formData.parent_task_id,
        category: formData.category
      };

      const response = await fetch('/api/schedule/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        toast.success('Task created successfully');
        setIsCreateDialogOpen(false);
        setIsCreateSubtaskDialogOpen(false);
        setParentTaskForSubtask(null);
        resetForm();
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const taskData = {
        ...formData,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        goal_id: formData.goal_id === 'no-goal' ? null : formData.goal_id || undefined,
        parent_task_id: formData.parent_task_id || undefined
      };

      const response = await fetch(`/api/schedule/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        toast.success('Task updated successfully');
        setIsEditDialogOpen(false);
        setSelectedTask(null);
        resetForm();
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    // Store the original tasks for potential rollback
    const originalTasks = [...tasks];
    
    // Optimistically remove the task from UI immediately
    const updatedTasks = tasks.filter(task => {
      // Remove the task and any of its subtasks
      if (task.id === taskId) return false;
      if (task.parent_task_id === taskId) return false;
      // Also remove from subtasks array if it's a nested subtask
      if (task.subtasks) {
        task.subtasks = task.subtasks.filter(subtask => subtask.id !== taskId);
      }
      return true;
    });
    
    setTasks(updatedTasks);
    toast.success('Task deleted successfully', { duration: 2000 });

    try {
      const response = await fetch(`/api/schedule/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Rollback on failure
        setTasks(originalTasks);
        const error = await response.json();
        toast.error(error.error || 'Failed to delete task - changes reverted');
      }
    } catch (error) {
      // Rollback on network error
      setTasks(originalTasks);
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task - changes reverted');
    }
  };

  const handleTaskStatusChange = async (taskId: string, completed: boolean) => {
    const newStatus = completed ? 'completed' : 'pending';
    
    // Store original tasks for potential rollback
    const originalTasks = [...tasks];
    
    // Optimistically update the task status in UI immediately
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: newStatus as any };
      }
      // Also update in subtasks if it's a nested subtask
      if (task.subtasks) {
        task.subtasks = task.subtasks.map(subtask => 
          subtask.id === taskId ? { ...subtask, status: newStatus as any } : subtask
        );
      }
      return task;
    });
    
    setTasks(updatedTasks);
    toast.success(`Task marked as ${newStatus}`, { duration: 2000 });

    try {
      const response = await fetch(`/api/schedule/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        // Rollback on failure
        setTasks(originalTasks);
        const error = await response.json();
        toast.error(error.error || 'Failed to update task status - changes reverted');
      }
    } catch (error) {
      // Rollback on network error
      setTasks(originalTasks);
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status - changes reverted');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      goal_id: '',
      parent_task_id: '',
      due_date: '',
      estimated_duration: '',
      tags: '',
      generate_ai_subtasks: false,
      category: 'general'
    });
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const openCreateSubtaskDialog = (parentTask: Task) => {
    setParentTaskForSubtask(parentTask);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      goal_id: parentTask.goal_id || '',
      parent_task_id: parentTask.id,
      due_date: '',
      estimated_duration: '',
      tags: ''
    });
    setIsCreateSubtaskDialogOpen(true);
  };

  const convertToSubtask = async (task: Task, parentTask: Task) => {
    try {
      const response = await fetch(`/api/schedule/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parent_task_id: parentTask.id,
          goal_id: parentTask.goal_id 
        })
      });

      if (response.ok) {
        toast.success('Task converted to subtask successfully');
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to convert task');
      }
    } catch (error) {
      console.error('Error converting task:', error);
      toast.error('Failed to convert task');
    }
  };

  const promoteSubtask = async (task: Task) => {
    try {
      const response = await fetch(`/api/schedule/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_task_id: null })
      });

      if (response.ok) {
        toast.success('Subtask promoted to main task successfully');
        fetchTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to promote subtask');
      }
    } catch (error) {
      console.error('Error promoting subtask:', error);
      toast.error('Failed to promote subtask');
    }
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      goal_id: task.goal_id || 'no-goal',
      parent_task_id: task.parent_task_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      estimated_duration: task.estimated_duration?.toString() || '',
      tags: task.tags?.join(', ') || ''
    });
    setIsEditDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesGoal = goalFilter === 'all' || 
                        (goalFilter === 'no-goal' && !task.goal_id) || 
                        task.goal_id === goalFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesGoal;
  });

  // Separate parent tasks and subtasks
  const parentTasks = filteredTasks.filter(task => !task.parent_task_id);
  const subtasks = filteredTasks.filter(task => task.parent_task_id);

  // Create a map of subtasks by parent task ID
  const subtasksByParent = subtasks.reduce((acc, subtask) => {
    if (!acc[subtask.parent_task_id!]) {
      acc[subtask.parent_task_id!] = [];
    }
    acc[subtask.parent_task_id!].push(subtask);
    return acc;
  }, {} as Record<string, Task[]>);

  // Group parent tasks by status for better organization
  const groupedTasks = {
    pending: parentTasks.filter(task => task.status === 'pending'),
    in_progress: parentTasks.filter(task => task.status === 'in_progress'),
    completed: parentTasks.filter(task => task.status === 'completed'),
    cancelled: parentTasks.filter(task => task.status === 'cancelled')
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Manager</h1>
          <p className="text-gray-600 mt-1">Organize and track your tasks with an intuitive checklist interface</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to your schedule
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the task"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goal">Goal *</Label>
                  <Select value={formData.goal_id} onValueChange={(value) => setFormData({ ...formData, goal_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="parent_task">Parent Task (Optional)</Label>
                <Select value={formData.parent_task_id || ''} onValueChange={(value) => setFormData({ ...formData, parent_task_id: value || null })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent task (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent task</SelectItem>
                    {tasks.filter(task => task.goal_id === formData.goal_id && !task.parent_task_id).map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_duration">Duration (minutes)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="work, urgent, meeting (comma-separated)"
                />
              </div>
              
              {/* AI Subtask Generation Options */}
              {!formData.parent_task_id && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="generate_ai_subtasks"
                      checked={formData.generate_ai_subtasks}
                      onChange={(e) => setFormData({ ...formData, generate_ai_subtasks: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="generate_ai_subtasks" className="text-sm font-medium text-blue-900">
                      Generate AI Subtasks
                    </Label>
                  </div>
                  <p className="text-xs text-blue-700">
                    Automatically create detailed subtasks with step-by-step guides using AI
                  </p>
                  
                  {formData.generate_ai_subtasks && (
                    <div>
                      <Label htmlFor="category">Task Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="study">Study</SelectItem>
                          <SelectItem value="health">Health & Fitness</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="personal">Personal Development</SelectItem>
                          <SelectItem value="home">Home & Family</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={goalFilter} onValueChange={setGoalFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Goal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Goals</SelectItem>
            <SelectItem value="no-goal">No Goal</SelectItem>
            {goals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{groupedTasks.pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{groupedTasks.in_progress.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{groupedTasks.completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{filteredTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-6">
          {/* Pending Tasks */}
          {groupedTasks.pending.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Tasks ({groupedTasks.pending.length})
              </h2>
              <div className="space-y-2">
                {groupedTasks.pending.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subtasks={subtasksByParent[task.id] || []}
                    allTasks={tasks}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpansion={toggleTaskExpansion}
                    onStatusChange={handleTaskStatusChange}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteTask}
                    onCreateSubtask={openCreateSubtaskDialog}
                    onPromoteSubtask={promoteSubtask}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tasks */}
          {groupedTasks.in_progress.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                In Progress ({groupedTasks.in_progress.length})
              </h2>
              <div className="space-y-2">
                {groupedTasks.in_progress.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subtasks={subtasksByParent[task.id] || []}
                    allTasks={tasks}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpansion={toggleTaskExpansion}
                    onStatusChange={handleTaskStatusChange}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteTask}
                    onCreateSubtask={openCreateSubtaskDialog}
                    onPromoteSubtask={promoteSubtask}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {groupedTasks.completed.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Completed ({groupedTasks.completed.length})
              </h2>
              <div className="space-y-2">
                {groupedTasks.completed.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    subtasks={subtasksByParent[task.id] || []}
                    allTasks={tasks}
                    isExpanded={expandedTasks.has(task.id)}
                    onToggleExpansion={toggleTaskExpansion}
                    onStatusChange={handleTaskStatusChange}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteTask}
                    onCreateSubtask={openCreateSubtaskDialog}
                    onPromoteSubtask={promoteSubtask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || goalFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first task to get started'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      )}

      {/* Create Subtask Dialog */}
      <Dialog open={isCreateSubtaskDialogOpen} onOpenChange={setIsCreateSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Subtask</DialogTitle>
            <DialogDescription>
              Add a subtask to {parentTaskForSubtask?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label htmlFor="subtask-title">Title *</Label>
              <Input
                id="subtask-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter subtask title"
                required
              />
            </div>
            <div>
              <Label htmlFor="subtask-description">Description</Label>
              <Textarea
                id="subtask-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the subtask"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subtask-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subtask-duration">Duration (minutes)</Label>
                <Input
                  id="subtask-duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="subtask-due_date">Due Date</Label>
              <Input
                id="subtask-due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subtask-tags">Tags</Label>
              <Input
                id="subtask-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="work, urgent, meeting (comma-separated)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateSubtaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Subtask
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update your task details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the task"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-goal">Goal</Label>
                <Select value={formData.goal_id} onValueChange={(value) => setFormData({ ...formData, goal_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-goal">No goal</SelectItem>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-parent_task">Parent Task (Optional)</Label>
              <Select value={formData.parent_task_id || ''} onValueChange={(value) => setFormData({ ...formData, parent_task_id: value || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent task (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent task</SelectItem>
                  {tasks.filter(task => task.goal_id === formData.goal_id && !task.parent_task_id && task.id !== selectedTask?.id).map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-due_date">Due Date</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-estimated_duration">Duration (minutes)</Label>
                <Input
                  id="edit-estimated_duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="work, urgent, meeting (comma-separated)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}