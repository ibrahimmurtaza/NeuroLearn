'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle, 
  AlertCircle,
  Brain,
  BookOpen,
  Timer,
  Save,
  Send
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Quiz, 
  QuizQuestion, 
  QuizAttempt as QuizAttemptType,
  QuestionType,
  UserAnswer 
} from '@/types/quiz';

interface QuizAttemptProps {
  quiz: Quiz;
  onComplete?: (attempt: QuizAttemptType) => void;
  onExit?: () => void;
}

export default function QuizAttempt({ quiz, onComplete, onExit }: QuizAttemptProps) {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    quiz.time_limit ? quiz.time_limit * 60 : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  const currentQuestion = quiz.questions?.[currentQuestionIndex];
  const totalQuestions = quiz.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save effect
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (Object.keys(answers).length > 0) {
        autoSaveProgress();
      }
    }, 5000); // Auto-save every 5 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [answers]);

  const autoSaveProgress = async () => {
    if (!user) return;

    try {
      setAutoSaveStatus('saving');
      await fetch(`/api/quizzes/${quiz.id}/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          answers,
          currentQuestionIndex,
          timeRemaining
        }),
      });
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    } catch (err) {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  };

  const handleAnswerChange = (questionId: string, answer: UserAnswer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    setError(null);
  };

  const handleMultipleChoice = (questionId: string, optionIndex: number) => {
    handleAnswerChange(questionId, {
      type: 'multiple_choice',
      selectedOption: optionIndex,
      confidence: 1
    });
  };

  const handleTrueFalse = (questionId: string, value: boolean) => {
    handleAnswerChange(questionId, {
      type: 'true_false',
      booleanAnswer: value,
      confidence: 1
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    handleAnswerChange(questionId, {
      type: currentQuestion.type === 'short_answer' ? 'short_answer' : 'essay',
      textAnswer: text,
      confidence: 1
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!user) return;

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions?.filter(q => !answers[q.id]) || [];
    if (unansweredQuestions.length > 0 && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Transform UserAnswer objects to QuizAnswer format
      const transformedAnswers = Object.entries(answers).map(([questionId, userAnswer]) => {
        const baseAnswer = {
          question_id: questionId,
          time_taken_ms: 0 // Default time taken
        };

        switch (userAnswer.type) {
          case 'multiple_choice':
            return {
              ...baseAnswer,
              selected: userAnswer.selectedOption
            };
          case 'true_false':
            return {
              ...baseAnswer,
              selected: userAnswer.booleanAnswer ? 1 : 0
            };
          case 'short_answer':
          case 'essay':
            return {
              ...baseAnswer,
              answer_text: userAnswer.textAnswer || ''
            };
          default:
            return baseAnswer;
        }
      });

      const response = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          answers: transformedAnswers,
          time_taken: quiz.time_limit ? (quiz.time_limit * 60 - (timeRemaining || 0)) : 0
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit quiz');
      }

      const result = await response.json();
      
      if (onComplete) {
        // Create attempt object with the data structure expected by QuizResults
        const attemptData = {
          id: result.attempt_id,
          score: result.score,
          percentage: result.percentage,
          totalPoints: quiz.questions?.length || 0, // Total questions as total points
          feedback: result.feedback,
          answers: answers, // Include the answers object
          quiz_id: quiz.id,
          user_id: user.id,
          status: 'completed' as const,
          completed_at: new Date().toISOString()
        };
        onComplete(attemptData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: QuizQuestion) => {
    const answer = answers[question.id];

    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  answer?.selectedOption === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleMultipleChoice(question.id, index)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    answer?.selectedOption === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answer?.selectedOption === index && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-700">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'tf':
        return (
          <div className="space-y-3">
            {[true, false].map((value) => (
              <div
                key={value.toString()}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  answer?.booleanAnswer === value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTrueFalse(question.id, value)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    answer?.booleanAnswer === value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answer?.booleanAnswer === value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-medium">
                    {value ? 'True' : 'False'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'short_answer':
        return (
          <div>
            <Input
              placeholder="Enter your answer..."
              value={answer?.textAnswer || ''}
              onChange={(e) => handleTextAnswer(question.id, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case 'essay':
        return (
          <div>
            <textarea
              placeholder="Write your essay answer here..."
              value={answer?.textAnswer || ''}
              onChange={(e) => handleTextAnswer(question.id, e.target.value)}
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            {quiz.title}
          </h1>
          <p className="text-gray-600 mt-1">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {autoSaveStatus && (
            <div className="flex items-center gap-2 text-sm">
              {autoSaveStatus === 'saving' && (
                <>
                  <Save className="w-4 h-4 animate-pulse text-blue-500" />
                  <span className="text-blue-600">Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Save failed</span>
                </>
              )}
            </div>
          )}
          
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono font-medium">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          
          <Button variant="outline" onClick={onExit}>
            Exit Quiz
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress: {answeredCount}/{totalQuestions} answered</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2">
        {quiz.questions?.map((_, index) => (
          <button
            key={index}
            onClick={() => navigateToQuestion(index)}
            className={`w-10 h-10 rounded-lg border-2 font-medium transition-colors relative ${
              index === currentQuestionIndex
                ? 'border-blue-500 bg-blue-500 text-white'
                : answers[quiz.questions?.[index]?.id]
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            {index + 1}
            {quiz.questions?.[index]?.id && flaggedQuestions.has(quiz.questions?.[index]?.id) && (
              <Flag className="w-3 h-3 absolute -top-1 -right-1 text-orange-500 fill-current" />
            )}
          </button>
        )) || []}
      </div>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  {currentQuestion?.type?.replace('_', ' ') || 'Unknown'}
                </Badge>
                <Badge variant="outline">
                  {currentQuestion?.difficulty || 'Unknown'}
                </Badge>
                {currentQuestion?.points && (
                  <Badge variant="outline">
                    {currentQuestion.points} points
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => currentQuestion?.id && toggleFlag(currentQuestion.id)}
              className={currentQuestion?.id && flaggedQuestions.has(currentQuestion.id) ? 'text-orange-600' : ''}
              disabled={!currentQuestion?.id}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-lg leading-relaxed">{currentQuestion?.prompt || 'Question not available'}</p>
          </div>
          
          {currentQuestion && renderQuestion(currentQuestion)}
        </CardContent>
      </Card>

      {/* Navigation and Submit */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Submit Quiz?</CardTitle>
              <CardDescription>
                You have {totalQuestions - answeredCount} unanswered questions. 
                Are you sure you want to submit?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}