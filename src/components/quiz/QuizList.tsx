'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Clock, 
  Target, 
  BookOpen, 
  Brain, 
  Play, 
  BarChart3,
  Calendar,
  Users,
  Trophy,
  Plus,
  SortAsc,
  SortDesc,
  Grid,
  List,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Quiz, QuizMode, DifficultyLevel } from '@/types/quiz';

interface QuizListProps {
  onCreateQuiz?: () => void;
  onStartQuiz?: (quiz: Quiz) => void;
  onViewResults?: (quiz: Quiz) => void;
}

interface QuizWithStats extends Quiz {
  attemptCount?: number;
  bestScore?: number;
  lastAttempt?: string;
  averageScore?: number;
}

type SortOption = 'created_at' | 'title' | 'difficulty' | 'question_count' | 'best_score';
type ViewMode = 'grid' | 'list';

export default function QuizList({ onCreateQuiz, onStartQuiz, onViewResults }: QuizListProps) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizWithStats[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<QuizWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [selectedMode, setSelectedMode] = useState<QuizMode | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    filterAndSortQuizzes();
  }, [quizzes, searchTerm, selectedDifficulty, selectedMode, sortBy, sortOrder]);

  const fetchQuizzes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/quizzes?userId=${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError('Failed to load quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortQuizzes = () => {
    let filtered = [...quizzes];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(quiz => quiz.difficulty === selectedDifficulty);
    }

    // Apply mode filter
    if (selectedMode !== 'all') {
      filtered = filtered.filter(quiz => quiz.mode === selectedMode);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          aValue = difficultyOrder[a.difficulty];
          bValue = difficultyOrder[b.difficulty];
          break;
        case 'question_count':
          aValue = a.questions.length;
          bValue = b.questions.length;
          break;
        case 'best_score':
          aValue = a.bestScore || 0;
          bValue = b.bestScore || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredQuizzes(filtered);
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('desc');
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeIcon = (mode: QuizMode) => {
    switch (mode) {
      case 'practice': return <BookOpen className="w-4 h-4" />;
      case 'assessment': return <Target className="w-4 h-4" />;
      case 'timed': return <Clock className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const QuizCard = ({ quiz }: { quiz: QuizWithStats }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
            {quiz.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {quiz.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {getModeIcon(quiz.mode)}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge className={getDifficultyColor(quiz.difficulty)}>
            {quiz.difficulty}
          </Badge>
          <Badge variant="outline">
            {quiz.questions?.length || quiz.metadata?.total_questions || 0} questions
          </Badge>
          {quiz.time_limit && (
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              {quiz.time_limit}m
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          {(quiz.attemptCount || quiz.bestScore !== undefined) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {quiz.attemptCount && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span>{quiz.attemptCount} attempts</span>
                </div>
              )}
              {quiz.bestScore !== undefined && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span>Best: {quiz.bestScore}%</span>
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            Created {formatDate(quiz.created_at)}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => onStartQuiz?.(quiz)}
              className="flex-1"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Quiz
            </Button>
            {quiz.attemptCount && quiz.attemptCount > 0 && (
              <Button
                variant="outline"
                onClick={() => onViewResults?.(quiz)}
                size="sm"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuizListItem = ({ quiz }: { quiz: QuizWithStats }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{quiz.title}</h3>
                {quiz.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-1">
                    {quiz.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{quiz.questions?.length || quiz.metadata?.total_questions || 0} questions</span>
                  <span className="capitalize">{quiz.difficulty}</span>
                  <span className="capitalize">{quiz.mode}</span>
                  {quiz.time_limit && <span>{quiz.time_limit}m</span>}
                  <span>{formatDate(quiz.created_at)}</span>
                </div>
              </div>
              
              {(quiz.attemptCount || quiz.bestScore !== undefined) && (
                <div className="text-right text-sm">
                  {quiz.bestScore !== undefined && (
                    <div className="font-medium text-green-600">
                      Best: {quiz.bestScore}%
                    </div>
                  )}
                  {quiz.attemptCount && (
                    <div className="text-gray-500">
                      {quiz.attemptCount} attempts
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button
              onClick={() => onStartQuiz?.(quiz)}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            {quiz.attemptCount && quiz.attemptCount > 0 && (
              <Button
                variant="outline"
                onClick={() => onViewResults?.(quiz)}
                size="sm"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            My Quizzes
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'es' : ''} available
          </p>
        </div>
        
        {onCreateQuiz && (
          <Button onClick={onCreateQuiz} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Quiz
          </Button>
        )}
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel | 'all')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Mode</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value as QuizMode | 'all')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Modes</option>
                    <option value="practice">Practice</option>
                    <option value="assessment">Assessment</option>
                    <option value="timed">Timed</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="flex-1 p-2 border rounded-md"
                    >
                      <option value="created_at">Date Created</option>
                      <option value="title">Title</option>
                      <option value="difficulty">Difficulty</option>
                      <option value="question_count">Questions</option>
                      <option value="best_score">Best Score</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quiz List */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {quizzes.length === 0 ? 'No quizzes yet' : 'No quizzes match your filters'}
          </h3>
          <p className="text-gray-500 mb-6">
            {quizzes.length === 0 
              ? 'Create your first quiz to get started with personalized learning.'
              : 'Try adjusting your search terms or filters.'
            }
          </p>
          {quizzes.length === 0 && onCreateQuiz && (
            <Button onClick={onCreateQuiz} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Quiz
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredQuizzes.map((quiz) => (
            viewMode === 'grid' ? (
              <QuizCard key={quiz.id} quiz={quiz} />
            ) : (
              <QuizListItem key={quiz.id} quiz={quiz} />
            )
          ))}
        </div>
      )}
    </div>
  );
}