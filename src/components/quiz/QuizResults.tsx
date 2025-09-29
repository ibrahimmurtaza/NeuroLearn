'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Brain,
  BookOpen,
  BarChart3,
  RefreshCw,
  Share2,
  Download,
  Flag,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  PieChart
} from 'lucide-react';
import { 
  Quiz, 
  QuizAttempt, 
  QuizQuestion, 
  QuizAnswer,
  QuestionFeedback 
} from '@/types/quiz';

interface QuizResultsProps {
  quiz: Quiz;
  attempt: QuizAttempt | null;
  onRetakeQuiz?: () => void;
  onBackToQuizzes?: () => void;
}

interface QuestionResultProps {
  question: QuizQuestion;
  userAnswer: QuizAnswer | undefined;
  feedback: QuestionFeedback;
  questionNumber: number;
}

function QuestionResult({ question, userAnswer, feedback, questionNumber }: QuestionResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCorrect = feedback.is_correct;
  const showCorrectAnswer = !isCorrect;

  const renderUserAnswer = () => {
    switch (question.type) {
      case 'mcq':
        if (userAnswer?.selected !== undefined && question.options) {
          return question.options[userAnswer.selected] ?? 'No answer selected';
        }
        return 'No answer selected';
      
      case 'tf':
        if (userAnswer?.selected !== undefined) {
          return userAnswer.selected === 1 ? 'True' : 'False';
        }
        return 'No answer selected';
      
      case 'short_answer':
      case 'numeric':
      case 'fill_blank':
        return userAnswer?.answer_text || 'No answer provided';
      
      default:
        return 'No answer provided';
    }
  };

  const renderCorrectAnswer = () => {
    switch (question.type) {
      case 'mcq':
        if (question.correct_option_index !== undefined && question.options) {
          return question.options[question.correct_option_index] ?? feedback.correct_answer;
        }
        return feedback.correct_answer;
      
      case 'tf':
        return feedback.correct_answer || 'Answer not available';
      
      case 'short_answer':
      case 'numeric':
      case 'fill_blank':
        return feedback.correct_answer || question.answer_text || 'Answer not available';
      
      default:
        return feedback.correct_answer || 'Answer not available';
    }
  };

  const pointsEarned = isCorrect ? (question.points || 1) : 0;

  return (
    <Card className={`border-l-4 ${
      isCorrect ? 'border-l-green-500' : 'border-l-red-500'
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">
                Question {questionNumber}
              </span>
              <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs">
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Correct
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Incorrect
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {pointsEarned}/{question.points || 1} points
              </Badge>
            </div>
            <CardTitle className="text-base leading-relaxed">
              {question.prompt}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Answer</h4>
              <div className={`p-3 rounded-lg border ${
                isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-sm">{renderUserAnswer()}</p>
              </div>
            </div>
            
            {showCorrectAnswer && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Correct Answer</h4>
                <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                  <p className="text-sm">{renderCorrectAnswer()}</p>
                </div>
              </div>
            )}
          </div>
          
          {feedback.explanation && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Explanation
              </h4>
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                <p className="text-sm leading-relaxed">{feedback.explanation}</p>
              </div>
            </div>
          )}
          
          {feedback.hints && feedback.hints.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Hints for Improvement</h4>
              <ul className="space-y-1">
                {feedback.hints.map((hint, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function QuizResults({ quiz, attempt, onRetakeQuiz, onBackToQuizzes }: QuizResultsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Handle null attempt case
  if (!attempt) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              No Results Available
            </CardTitle>
            <CardDescription>
              Quiz results are not available at this time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {onRetakeQuiz && (
                <Button onClick={onRetakeQuiz} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Take Quiz
                </Button>
              )}
              {onBackToQuizzes && (
                <Button variant="outline" onClick={onBackToQuizzes}>
                  Back to Quizzes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safety checks for attempt data
  if (!attempt.feedback || !Array.isArray(attempt.feedback)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Invalid Results Data
            </CardTitle>
            <CardDescription>
              The quiz results data is incomplete or corrupted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {onRetakeQuiz && (
                <Button onClick={onRetakeQuiz} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Retake Quiz
                </Button>
              )}
              {onBackToQuizzes && (
                <Button variant="outline" onClick={onBackToQuizzes}>
                  Back to Quizzes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const percentage = Math.min(100, Math.round((attempt.score / attempt.totalPoints) * 100));
  const correctAnswers = attempt.feedback.filter(f => f.is_correct).length;
  const totalQuestions = quiz.questions?.length || 0;
  
  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 80) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 70) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Needs Improvement', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const performance = getPerformanceLevel(percentage);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getQuestionTypeStats = () => {
    const stats: Record<string, { correct: number; total: number }> = {};
    
    quiz.questions?.forEach((question, index) => {
      const type = question.type;
      if (!stats[type]) {
        stats[type] = { correct: 0, total: 0 };
      }
      stats[type].total++;
      if (attempt.feedback[index]?.is_correct) {
        stats[type].correct++;
      }
    });
    
    return stats;
  };

  const getDifficultyStats = () => {
    const stats: Record<string, { correct: number; total: number }> = {};
    
    quiz.questions?.forEach((question, index) => {
      const difficulty = question.difficulty;
      if (!stats[difficulty]) {
        stats[difficulty] = { correct: 0, total: 0 };
      }
      stats[difficulty].total++;
      if (attempt.feedback[index]?.is_correct) {
        stats[difficulty].correct++;
      }
    });
    
    return stats;
  };

  const questionTypeStats = getQuestionTypeStats();
  const difficultyStats = getDifficultyStats();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className={`w-8 h-8 ${performance.color}`} />
          <h1 className="text-3xl font-bold">Quiz Complete!</h1>
        </div>
        <p className="text-gray-600">{quiz.title}</p>
      </div>

      {/* Score Overview */}
      <Card className="text-center">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {percentage}%
              </div>
              <div className={`inline-flex items-center px-4 py-2 rounded-full ${performance.bgColor}`}>
                <span className={`font-medium ${performance.color}`}>
                  {performance.level}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {correctAnswers}/{totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {attempt.score}/{attempt.totalPoints}
                </div>
                <div className="text-sm text-gray-600">Points</div>
              </div>
              {attempt.timeSpent && (
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatTime(attempt.timeSpent)}
                  </div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
              )}
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {attempt.attemptNumber}
                </div>
                <div className="text-sm text-gray-600">Attempt</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Score</span>
                      <span>{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                  
                  {Object.entries(difficultyStats).map(([difficulty, stats]) => {
                    const difficultyPercentage = (stats.correct / stats.total) * 100;
                    return (
                      <div key={difficulty}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="capitalize">{difficulty} Questions</span>
                          <span>{stats.correct}/{stats.total} ({Math.round(difficultyPercentage)}%)</span>
                        </div>
                        <Progress value={difficultyPercentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(questionTypeStats).map(([type, stats]) => {
                    const typePercentage = (stats.correct / stats.total) * 100;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {stats.correct}/{stats.total}
                          </span>
                          <div className="w-16">
                            <Progress value={typePercentage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {attempt.feedback.some(f => f.explanation) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Key Explanations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attempt.feedback
                    .filter(f => f.explanation && !f.is_correct)
                    .slice(0, 3)
                    .map((feedback, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-sm">{feedback.explanation}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <div className="space-y-4">
            {quiz.questions?.map((question, index) => {
              // Handle answers as either array or object
              let userAnswer: QuizAnswer | undefined;
              if (Array.isArray(attempt.answers)) {
                userAnswer = attempt.answers.find(a => a.question_id === question.id);
              } else if (attempt.answers && typeof attempt.answers === 'object') {
                // Convert UserAnswer to QuizAnswer format
                const userAnswerData = (attempt.answers as any)[question.id];
                if (userAnswerData) {
                  userAnswer = {
                    question_id: question.id,
                    selected: userAnswerData.selectedOption,
                    answer_text: userAnswerData.textAnswer,
                    is_correct: attempt.feedback[index]?.is_correct || false,
                    time_taken_ms: 0,
                    confidence: userAnswerData.confidence
                  };
                }
              }
              
              return (
                <QuestionResult
                  key={question.id}
                  question={question}
                  userAnswer={userAnswer}
                  feedback={attempt.feedback[index]}
                  questionNumber={index + 1}
                />
              );
            }) || []}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Accuracy Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Accuracy Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Overall Accuracy</span>
                    <span className="font-medium">{((correctAnswers / totalQuestions) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Answers</span>
                    <span className="font-medium text-green-600">{correctAnswers}/{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Points Earned</span>
                    <span className="font-medium">{attempt.score}/{attempt.totalPoints}</span>
                  </div>
                  <Progress value={(correctAnswers / totalQuestions) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attempt.timeSpent ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Time</span>
                      <span className="font-medium">{formatTime(attempt.timeSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average per Question</span>
                      <span className="font-medium">
                        {formatTime(Math.round(attempt.timeSpent / totalQuestions))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficiency Score</span>
                      <span className="font-medium">
                        {quiz.time_limit ? 
                          Math.max(0, 100 - Math.round((attempt.timeSpent / (quiz.time_limit * 60)) * 100)) + '%' :
                          'N/A'
                        }
                      </span>
                    </div>
                    {quiz.time_limit && (
                      <div className="flex justify-between">
                        <span>Time Limit</span>
                        <span className="font-medium">{quiz.time_limit} minutes</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No timing data available</p>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Difficulty Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(difficultyStats).map(([difficulty, stats]) => (
                    <div key={difficulty} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize text-sm font-medium">{difficulty}</span>
                        <span className="text-xs text-gray-600">{stats.correct}/{stats.total}</span>
                      </div>
                      <Progress 
                        value={stats.total > 0 ? (stats.correct / stats.total) * 100 : 0} 
                        className="h-2" 
                      />
                      <div className="text-xs text-gray-500">
                        {stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0}% accuracy
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question Type Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(questionTypeStats).map(([type, stats]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize text-sm font-medium">{type.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-600">{stats.correct}/{stats.total}</span>
                      </div>
                      <Progress 
                        value={stats.total > 0 ? (stats.correct / stats.total) * 100 : 0} 
                        className="h-2" 
                      />
                      <div className="text-xs text-gray-500">
                        {stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0}% accuracy
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Strengths</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {Object.entries(difficultyStats)
                        .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) >= 0.8)
                        .map(([difficulty]) => difficulty)
                        .join(', ') || 'Keep practicing to identify strengths'}
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Areas for Improvement</div>
                    <div className="text-xs text-yellow-600 mt-1">
                      {Object.entries(difficultyStats)
                        .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.6)
                        .map(([difficulty]) => difficulty)
                        .join(', ') || 'Great job! No major areas of concern'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Based on {totalQuestions} questions answered
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confidence Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Confidence Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    Confidence vs Accuracy Correlation
                  </div>
                  {(() => {
                    const confidenceData = attempt.feedback
                      .map((f, i) => ({
                        confidence: attempt.answers[i]?.confidence || 0,
                        correct: f.is_correct
                      }))
                      .filter(d => d.confidence > 0);
                    
                    if (confidenceData.length === 0) {
                      return (
                        <div className="text-center py-4 text-gray-500">
                          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No confidence data available</p>
                        </div>
                      );
                    }

                    const avgConfidence = confidenceData.reduce((sum, d) => sum + d.confidence, 0) / confidenceData.length;
                    const correctHighConfidence = confidenceData.filter(d => d.confidence >= 80 && d.correct).length;
                    const totalHighConfidence = confidenceData.filter(d => d.confidence >= 80).length;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Average Confidence</span>
                          <span className="font-medium">{avgConfidence.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>High Confidence Accuracy</span>
                          <span className="font-medium">
                            {totalHighConfidence > 0 ? 
                              ((correctHighConfidence / totalHighConfidence) * 100).toFixed(1) + '%' : 
                              'N/A'
                            }
                          </span>
                        </div>
                        <Progress value={avgConfidence} className="h-2" />
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetakeQuiz && (
          <Button onClick={onRetakeQuiz} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retake Quiz
          </Button>
        )}
        
        <Button variant="outline" className="flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Share Results
        </Button>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
        
        {onBackToQuizzes && (
          <Button variant="outline" onClick={onBackToQuizzes}>
            Back to Quizzes
          </Button>
        )}
      </div>
    </div>
  );
}