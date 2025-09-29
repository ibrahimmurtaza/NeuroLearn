'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Plus, 
  Play, 
  BarChart3, 
  BookOpen,
  Target,
  Clock,
  Trophy,
  Users,
  Zap,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import QuizCreation from '@/components/quiz/QuizCreation';
import QuizList from '@/components/quiz/QuizList';
import QuizAttempt from '@/components/quiz/QuizAttempt';
import QuizResults from '@/components/quiz/QuizResults';
import QuizStats from '@/components/quiz/QuizStats';
import QuizDocumentUpload from '@/components/quiz/QuizDocumentUpload';
import { Quiz, QuizAttempt as QuizAttemptType } from '@/types/quiz';

type ViewMode = 'overview' | 'create' | 'list' | 'attempt' | 'results' | 'stats' | 'upload';

export default function QuizPage() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttemptType | null>(null);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <Brain className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">
            Sign in to access quizzes
          </h2>
          <p className="text-gray-500">
            Create an account or sign in to start creating and taking personalized quizzes.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateQuiz = () => {
    setCurrentView('create');
  };

  const handleQuizCreated = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentView('list');
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentView('attempt');
  };

  const handleQuizCompleted = (attempt: QuizAttemptType) => {
    setCurrentAttempt(attempt);
    setCurrentView('results');
  };

  const handleViewResults = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    // In a real implementation, you'd fetch the latest attempt for this quiz
    setCurrentView('results');
  };

  const handleBackToList = () => {
    setSelectedQuiz(null);
    setCurrentAttempt(null);
    setCurrentView('list');
  };

  const handleBackToOverview = () => {
    setSelectedQuiz(null);
    setCurrentAttempt(null);
    setCurrentView('overview');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create':
        return (
          <QuizCreation
            onQuizCreated={handleQuizCreated}
            onCancel={handleBackToOverview}
          />
        );
      
      case 'list':
        return (
          <QuizList
            onCreateQuiz={handleCreateQuiz}
            onStartQuiz={handleStartQuiz}
            onViewResults={handleViewResults}
          />
        );
      
      case 'attempt':
        return selectedQuiz ? (
          <QuizAttempt
            quiz={selectedQuiz}
            onComplete={handleQuizCompleted}
            onExit={handleBackToList}
          />
        ) : null;
      
      case 'results':
        return (
          <QuizResults
            attempt={currentAttempt}
            quiz={selectedQuiz}
            onRetakeQuiz={() => selectedQuiz && handleStartQuiz(selectedQuiz)}
            onBackToList={handleBackToList}
          />
        );
      
      case 'stats':
        return <QuizStats />;
      
      case 'upload':
          return (
            <QuizDocumentUpload
              onDocumentUploaded={() => setCurrentView('create')}
            />
          );
      
      case 'overview':
      default:
        return (
          <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Brain className="w-12 h-12 text-blue-600" />
                <h1 className="text-4xl font-bold text-gray-900">NeuroLearn Quiz</h1>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Create personalized quizzes from your documents and track your learning progress with AI-powered insights.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCreateQuiz}>
                <CardContent className="p-6 text-center">
                  <Plus className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Create Quiz</h3>
                  <p className="text-gray-600 text-sm">Generate quizzes from your documents</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('list')}>
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">My Quizzes</h3>
                  <p className="text-gray-600 text-sm">Browse and take your quizzes</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('stats')}>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Statistics</h3>
                  <p className="text-gray-600 text-sm">Track your learning progress</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCurrentView('upload')}>
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-orange-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload Docs</h3>
                  <p className="text-gray-600 text-sm">Upload documents for quiz generation</p>
                </CardContent>
              </Card>
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-blue-600" />
                    AI-Powered Quiz Generation
                  </CardTitle>
                  <CardDescription>
                    Advanced features to enhance your learning experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Adaptive Difficulty</h4>
                      <p className="text-sm text-gray-600">Questions adjust to your performance level</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Multiple Modes</h4>
                      <p className="text-sm text-gray-600">Practice, assessment, and timed quiz modes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Instant Feedback</h4>
                      <p className="text-sm text-gray-600">Get explanations and hints for better understanding</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                    Progress Tracking
                  </CardTitle>
                  <CardDescription>
                    Monitor your learning journey with detailed analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Performance Analytics</h4>
                      <p className="text-sm text-gray-600">Detailed insights into your strengths and weaknesses</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Learning Streaks</h4>
                      <p className="text-sm text-gray-600">Build consistent study habits with streak tracking</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Knowledge Gaps</h4>
                      <p className="text-sm text-gray-600">Identify areas that need more focus</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Follow these steps to create your first quiz</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-600 font-bold text-lg">1</span>
                    </div>
                    <h4 className="font-medium mb-2">Upload Documents</h4>
                    <p className="text-sm text-gray-600">Upload your study materials or documents</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-green-600 font-bold text-lg">2</span>
                    </div>
                    <h4 className="font-medium mb-2">Generate Quiz</h4>
                    <p className="text-sm text-gray-600">AI creates personalized questions from your content</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-purple-600 font-bold text-lg">3</span>
                    </div>
                    <h4 className="font-medium mb-2">Start Learning</h4>
                    <p className="text-sm text-gray-600">Take quizzes and track your progress</p>
                  </div>
                </div>
                
                <div className="text-center mt-8">
                  <Button onClick={handleCreateQuiz} size="lg" className="px-8">
                    Create Your First Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      {currentView !== 'overview' && (
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBackToOverview}
                className="flex items-center gap-2"
              >
                <Brain className="w-5 h-5" />
                NeuroLearn Quiz
              </Button>
              
              <div className="flex items-center gap-4">
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('list')}
                  size="sm"
                >
                  My Quizzes
                </Button>
                <Button
                  variant={currentView === 'stats' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('stats')}
                  size="sm"
                >
                  Statistics
                </Button>
                <Button
                  variant={currentView === 'upload' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('upload')}
                  size="sm"
                >
                  Upload Docs
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-8">
        {renderCurrentView()}
      </main>
    </div>
  );
}