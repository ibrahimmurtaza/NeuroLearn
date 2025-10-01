'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Brain,
  Timer,
  Award,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { ANALYTICS_CONFIG, getInsightThresholds, getAnalyticsPeriods } from '@/constants/analytics';

interface AnalyticsData {
  overview: {
    total_tasks: number;
    completed_tasks: number;
    completion_rate: number;
    total_goals: number;
    active_goals: number;
    average_focus_time: number;
    productivity_score: number;
  };
  patterns: {
    daily_productivity: Array<{
      day: string;
      productivity_score: number;
      tasks_completed: number;
      focus_time: number;
    }>;
    peak_hours: Array<{
      hour: number;
      productivity_score: number;
      task_count: number;
    }>;
    focus_sessions: Array<{
      date: string;
      duration: number;
      quality_score: number;
    }>;
  };
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    target_date: string;
    status: string;
    category: string;
  }>;
  tasks: {
    by_priority: Array<{
      priority: string;
      count: number;
      completed: number;
    }>;
    by_category: Array<{
      category: string;
      count: number;
      time_spent: number;
    }>;
    completion_trend: Array<{
      date: string;
      completed: number;
      created: number;
    }>;
  };
  weekly_progress: Array<{
    week: string;
    goals_completed: number;
    tasks_completed: number;
    focus_hours: number;
    productivity_score: number;
  }>;
}

const COLORS = ANALYTICS_CONFIG.CHART_COLORS;

const PIE_COLORS = [
  COLORS.PRIMARY, 
  COLORS.SECONDARY, 
  COLORS.ACCENT, 
  COLORS.PURPLE, 
  COLORS.PINK, 
  COLORS.INDIGO
];

export default function ProductivityAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedType, setSelectedType] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedType]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/schedule/analytics?period=${selectedPeriod}&type=${selectedType}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      } else {
        toast.error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getProductivityTrend = () => {
    if (!analyticsData?.patterns.daily_productivity) return null;
    
    const periods = getAnalyticsPeriods();
    const recent = analyticsData.patterns.daily_productivity.slice(-periods.recent);
    const average = recent.reduce((sum, day) => sum + day.productivity_score, 0) / recent.length;
    const previous = analyticsData.patterns.daily_productivity.slice(-periods.comparison, -periods.recent);
    const previousAverage = previous.reduce((sum, day) => sum + day.productivity_score, 0) / previous.length;
    
    const trend = average > previousAverage ? 'up' : 'down';
    const change = Math.abs(((average - previousAverage) / previousAverage) * 100);
    
    return { trend, change: change.toFixed(1) };
  };

  const getInsights = () => {
    if (!analyticsData) return [];
    
    const insights = [];
    const { overview, patterns } = analyticsData;
    const thresholds = getInsightThresholds();
    
    // Completion rate insight
    if (overview.completion_rate > thresholds.excellentCompletion) {
      insights.push({
        type: ANALYTICS_CONFIG.INSIGHT_TYPES.SUCCESS,
        title: 'Excellent Completion Rate',
        description: `You're completing ${overview.completion_rate}% of your tasks. Keep up the great work!`,
        icon: <Award className="w-5 h-5" />
      });
    } else if (overview.completion_rate < thresholds.poorCompletion) {
      insights.push({
        type: ANALYTICS_CONFIG.INSIGHT_TYPES.WARNING,
        title: 'Room for Improvement',
        description: `Your completion rate is ${overview.completion_rate}%. Consider breaking tasks into smaller chunks.`,
        icon: <Lightbulb className="w-5 h-5" />
      });
    }
    
    // Peak hours insight
    if (patterns.peak_hours.length > 0) {
      const peakHour = patterns.peak_hours.reduce((max, hour) => 
        hour.productivity_score > max.productivity_score ? hour : max
      );
      insights.push({
        type: ANALYTICS_CONFIG.INSIGHT_TYPES.INFO,
        title: 'Peak Productivity Hour',
        description: `You're most productive at ${peakHour.hour}:00. Schedule important tasks during this time.`,
        icon: <Zap className="w-5 h-5" />
      });
    }
    
    // Focus time insight
    if (overview.average_focus_time > thresholds.goodFocusTime) {
      insights.push({
        type: ANALYTICS_CONFIG.INSIGHT_TYPES.SUCCESS,
        title: 'Great Focus Sessions',
        description: `Your average focus time is ${Math.round(overview.average_focus_time)} minutes. Excellent concentration!`,
        icon: <Brain className="w-5 h-5" />
      });
    }
    
    return insights.slice(0, ANALYTICS_CONFIG.DISPLAY_LIMITS.MAX_INSIGHTS);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
          <p className="text-gray-600">Complete some tasks and goals to see your productivity insights</p>
        </div>
      </div>
    );
  }

  const productivityTrend = getProductivityTrend();
  const insights = getInsights();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productivity Analytics</h1>
          <p className="text-gray-600 mt-1">Track your progress and discover productivity patterns</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANALYTICS_CONFIG.TIME_PERIODS.SEVEN_DAYS}>Last 7 days</SelectItem>
              <SelectItem value={ANALYTICS_CONFIG.TIME_PERIODS.THIRTY_DAYS}>Last 30 days</SelectItem>
              <SelectItem value={ANALYTICS_CONFIG.TIME_PERIODS.NINETY_DAYS}>Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{analyticsData.overview.completion_rate}%</p>
                {productivityTrend && (
                  <div className="flex items-center gap-1 mt-1">
                    {productivityTrend.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${productivityTrend.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {productivityTrend.change}%
                    </span>
                  </div>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold">{analyticsData.overview.active_goals}</p>
                <p className="text-xs text-gray-500 mt-1">
                  of {analyticsData.overview.total_goals} total
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Focus Time</p>
                <p className="text-2xl font-bold">{Math.round(analyticsData.overview.average_focus_time)}m</p>
                <p className="text-xs text-gray-500 mt-1">per session</p>
              </div>
              <Timer className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productivity Score</p>
                <p className="text-2xl font-bold">{analyticsData.overview.productivity_score}</p>
                <Progress 
                  value={analyticsData.overview.productivity_score} 
                  className="mt-2 h-2" 
                />
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className={`border-l-4 ${
              insight.type === 'success' ? 'border-l-green-500 bg-green-50' :
              insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
              'border-l-blue-500 bg-blue-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    insight.type === 'success' ? 'bg-green-100 text-green-600' :
                    insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {insight.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue={ANALYTICS_CONFIG.ANALYTICS_TYPES.PATTERNS} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value={ANALYTICS_CONFIG.ANALYTICS_TYPES.PATTERNS}>Patterns</TabsTrigger>
          <TabsTrigger value={ANALYTICS_CONFIG.ANALYTICS_TYPES.GOALS}>Goals</TabsTrigger>
          <TabsTrigger value={ANALYTICS_CONFIG.ANALYTICS_TYPES.TASKS}>Tasks</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        {/* Patterns Tab */}
        <TabsContent value={ANALYTICS_CONFIG.ANALYTICS_TYPES.PATTERNS} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Productivity */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Productivity Trend</CardTitle>
                <CardDescription>Your productivity score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.patterns.daily_productivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="productivity_score" 
                      stroke={COLORS.primary} 
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Peak Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Productivity Hours</CardTitle>
                <CardDescription>When you're most productive during the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.patterns.peak_hours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                    <YAxis />
                    <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                    <Bar dataKey="productivity_score" fill={COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Focus Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Focus Session Quality</CardTitle>
              <CardDescription>Duration and quality of your focus sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.patterns.focus_sessions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="duration" fill={COLORS.accent} name="Duration (min)" />
                  <Line yAxisId="right" type="monotone" dataKey="quality_score" stroke={COLORS.purple} name="Quality Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value={ANALYTICS_CONFIG.ANALYTICS_TYPES.GOALS} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Goals Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Goal Progress</CardTitle>
                <CardDescription>Current status of your active goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsData.goals.slice(0, ANALYTICS_CONFIG.DISPLAY_LIMITS.MAX_GOALS_SHOWN).map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{goal.title}</p>
                        <p className="text-xs text-gray-500">{goal.category}</p>
                      </div>
                      <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                        {goal.progress}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Goal Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Goals by Category</CardTitle>
                <CardDescription>Distribution of your goals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.goals.reduce((acc, goal) => {
                        const existing = acc.find(item => item.category === goal.category);
                        if (existing) {
                          existing.count++;
                        } else {
                          acc.push({ category: goal.category, count: 1 });
                        }
                        return acc;
                      }, [] as Array<{category: string, count: number}>)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={ANALYTICS_CONFIG.DISPLAY_LIMITS.CHART_OUTER_RADIUS}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.goals.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value={ANALYTICS_CONFIG.ANALYTICS_TYPES.TASKS} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tasks by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Tasks by Priority</CardTitle>
                <CardDescription>Completion rate across different priorities</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.tasks.by_priority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill={COLORS.primary} name="Total" />
                    <Bar dataKey="completed" fill={COLORS.secondary} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Completion Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trend</CardTitle>
                <CardDescription>Tasks created vs completed over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.tasks.completion_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke={COLORS.accent} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke={COLORS.secondary} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Time by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Time Spent by Category</CardTitle>
              <CardDescription>How you allocate your time across different task categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.tasks.by_category}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time_spent" fill={COLORS.purple} name="Hours Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Tab */}
        <TabsContent value="weekly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress Overview</CardTitle>
              <CardDescription>Your weekly performance across all metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.weekly_progress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="goals_completed" stroke={COLORS.primary} name="Goals Completed" />
                  <Line yAxisId="left" type="monotone" dataKey="tasks_completed" stroke={COLORS.secondary} name="Tasks Completed" />
                  <Line yAxisId="right" type="monotone" dataKey="focus_hours" stroke={COLORS.accent} name="Focus Hours" />
                  <Line yAxisId="right" type="monotone" dataKey="productivity_score" stroke={COLORS.purple} name="Productivity Score" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}