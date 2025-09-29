'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  Trophy, 
  Target, 
  Clock, 
  Brain, 
  Calendar,
  Award,
  Zap,
  BookOpen,
  Users,
  Star,
  Activity,
  PieChart,
  LineChart,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface QuizStats {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number; // in minutes
  streakDays: number;
  completionRate: number;
  improvementRate: number;
  lastAttemptDate: string;
  totalCorrectAnswers: number;
  totalQuestions: number;
}

interface PerformanceByDifficulty {
  easy: { attempts: number; averageScore: number; bestScore: number };
  medium: { attempts: number; averageScore: number; bestScore: number };
  hard: { attempts: number; averageScore: number; bestScore: number };
}

interface PerformanceByMode {
  practice: { attempts: number; averageScore: number };
  assessment: { attempts: number; averageScore: number };
  timed: { attempts: number; averageScore: number };
}

interface RecentAttempt {
  id: string;
  quizTitle: string;
  score: number;
  percentage: number;
  completedAt: string;
  timeSpent: number;
  difficulty: string;
  mode: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: 'score' | 'streak' | 'completion' | 'improvement';
}

interface QuizStatsProps {
  className?: string;
}

export default function QuizStats({ className }: QuizStatsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [performanceByDifficulty, setPerformanceByDifficulty] = useState<PerformanceByDifficulty | null>(null);
  const [performanceByMode, setPerformanceByMode] = useState<PerformanceByMode | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/user/quiz-stats?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch quiz statistics');
      
      const data = await response.json();
      setStats(data.stats);
      setPerformanceByDifficulty(data.performanceByDifficulty);
      setPerformanceByMode(data.performanceByMode);
      setRecentAttempts(data.recentAttempts || []);
      setAchievements(data.achievements || []);
    } catch (err) {
      setError('Failed to load quiz statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 80) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 70) return { level: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getAchievementIcon = (category: string) => {
    switch (category) {
      case 'score': return <Trophy className="w-5 h-5" />;
      case 'streak': return <Zap className="w-5 h-5" />;
      case 'completion': return <Target className="w-5 h-5" />;
      case 'improvement': return <TrendingUp className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className={`max-w-6xl mx-auto p-6 space-y-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`max-w-6xl mx-auto p-6 ${className}`}>
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Statistics Available</h3>
          <p className="text-gray-500">Complete some quizzes to see your performance statistics.</p>
        </div>
      </div>
    );
  }

  const performanceLevel = getPerformanceLevel(stats.averageScore);

  return (
    <div className={`max-w-6xl mx-auto p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Quiz Statistics
          </h1>
          <p className="text-gray-600 mt-1">Track your learning progress and performance</p>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold">{stats.totalAttempts}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</p>
                <Badge className={`${performanceLevel.bgColor} ${performanceLevel.color} text-xs mt-1`}>
                  {performanceLevel.level}
                </Badge>
              </div>
              <Target className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Best Score</p>
                <p className="text-2xl font-bold">{stats.bestScore}%</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Completion Rate</span>
                    <span>{stats.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.completionRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Accuracy Rate</span>
                    <span>{((stats.totalCorrectAnswers / stats.totalQuestions) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(stats.totalCorrectAnswers / stats.totalQuestions) * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Time Spent</span>
                    </div>
                    <p className="text-lg font-semibold">{formatTime(stats.totalTimeSpent)}</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600">Current Streak</span>
                    </div>
                    <p className="text-lg font-semibold">{stats.streakDays} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparative Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Comparative Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    Top {Math.ceil((1 - stats.averageScore / 100) * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    Your performance ranking
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">vs Average User</span>
                    <Badge className={stats.averageScore >= 75 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {stats.averageScore >= 75 ? '+' : ''}{(stats.averageScore - 65).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Personal Best</span>
                    <span className="font-medium text-purple-600">{stats.bestScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Consistency Score</span>
                    <span className="font-medium">
                      {Math.max(0, 100 - Math.abs(stats.averageScore - stats.bestScore)).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historical Progress */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Historical Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {stats.improvementRate > 0 ? '+' : ''}{stats.improvementRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">30-Day Improvement</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {Math.round(stats.totalAttempts / Math.max(1, stats.streakDays))}
                    </div>
                    <div className="text-sm text-gray-600">Avg Attempts/Day</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {Math.round(stats.totalTimeSpent / Math.max(1, stats.totalAttempts))}m
                    </div>
                    <div className="text-sm text-gray-600">Avg Time/Quiz</div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Progress Milestones</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.totalAttempts >= 10 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Complete 10 quizzes</span>
                      </div>
                      <span className="text-xs text-gray-500">{stats.totalAttempts}/10</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.averageScore >= 80 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Achieve 80% average score</span>
                      </div>
                      <span className="text-xs text-gray-500">{stats.averageScore.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.streakDays >= 7 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">Maintain 7-day streak</span>
                      </div>
                      <span className="text-xs text-gray-500">{stats.streakDays}/7 days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Improvement Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Learning Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Learning Velocity</span>
                    <Badge className={stats.improvementRate > 5 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {stats.improvementRate > 5 ? 'Fast' : stats.improvementRate > 0 ? 'Steady' : 'Stable'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Knowledge Retention</span>
                    <span className="font-medium">
                      {Math.min(100, stats.completionRate + (stats.averageScore * 0.3)).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Engagement Level</span>
                    <span className="font-medium">
                      {stats.streakDays > 7 ? 'High' : stats.streakDays > 3 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Questions Answered</span>
                    <span className="font-medium">{stats.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Correct Answers</span>
                    <span className="font-medium text-green-600">{stats.totalCorrectAnswers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Activity</span>
                    <span className="font-medium">{formatDate(stats.lastAttemptDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance by Difficulty */}
            {performanceByDifficulty && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Performance by Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(performanceByDifficulty).map(([difficulty, data]) => (
                    <div key={difficulty} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium">{difficulty}</span>
                        <span className="text-sm text-gray-600">
                          {data.attempts} attempts
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average: {data.averageScore.toFixed(1)}%</span>
                        <span>Best: {data.bestScore}%</span>
                      </div>
                      <Progress value={data.averageScore} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Performance by Mode */}
            {performanceByMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Performance by Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(performanceByMode).map(([mode, data]) => (
                    <div key={mode} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium">{mode}</span>
                        <span className="text-sm text-gray-600">
                          {data.attempts} attempts
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Score</span>
                        <span>{data.averageScore.toFixed(1)}%</span>
                      </div>
                      <Progress value={data.averageScore} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Quiz Attempts
              </CardTitle>
              <CardDescription>Your latest quiz performances</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No recent attempts found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{attempt.quizTitle}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="capitalize">{attempt.difficulty}</span>
                          <span className="capitalize">{attempt.mode}</span>
                          <span>{formatTime(attempt.timeSpent)}</span>
                          <span>{formatDate(attempt.completedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{attempt.percentage}%</div>
                        <div className="text-sm text-gray-600">{attempt.score} points</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Achievements
              </CardTitle>
              <CardDescription>Your learning milestones and accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              {achievements.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No achievements unlocked yet</p>
                  <p className="text-sm text-gray-400 mt-1">Keep taking quizzes to earn achievements!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getAchievementIcon(achievement.category)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Unlocked {formatDate(achievement.unlockedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}