'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Clock, 
  Target, 
  Plus, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Lightbulb,
  BookOpen,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  QuizGenerationPreferences, 
  QuizMode, 
  DifficultyLevel, 
  QuestionType,
  Quiz 
} from '@/types/quiz';

interface TopicQuizCreationProps {
  onQuizCreated?: (quiz: Quiz) => void;
}

export default function TopicQuizCreation({ onQuizCreated }: TopicQuizCreationProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [additionalTopics, setAdditionalTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Quiz preferences
  const [preferences, setPreferences] = useState<QuizGenerationPreferences>({
    num_questions: 10,
    question_types: ['mcq'] as QuestionType[],
    difficulty_range: {
      min: 2 as DifficultyLevel,
      max: 4 as DifficultyLevel
    },
    focus_topics: [],
    exclude_topics: [],
    time_limit: 30,
    mode: 'practice' as QuizMode
  });

  const addTopic = () => {
    if (newTopic.trim() && !additionalTopics.includes(newTopic.trim())) {
      setAdditionalTopics([...additionalTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setAdditionalTopics(additionalTopics.filter(t => t !== topicToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTopic();
    }
  };

  const generateTopicQuiz = async () => {
    if (!user) {
      setError('Please log in to generate a quiz');
      return;
    }

    // Validation
    if (!topic.trim()) {
      setError('Please enter a topic for your quiz');
      return;
    }

    if (topic.trim().length < 3) {
      setError('Topic must be at least 3 characters long');
      return;
    }

    if (topic.trim().length > 100) {
      setError('Topic must be less than 100 characters');
      return;
    }

    if (preferences.question_types.length === 0) {
      setError('Please select at least one question type');
      return;
    }

    if (preferences.num_questions < 1 || preferences.num_questions > 50) {
      setError('Number of questions must be between 1 and 50');
      return;
    }

    // Check for inappropriate content (basic validation)
    const inappropriateWords = ['test', 'example', 'sample']; // Add more as needed
    const topicLower = topic.toLowerCase();
    const hasInappropriate = inappropriateWords.some(word => topicLower.includes(word));
    
    if (hasInappropriate) {
      setError('Please provide a more specific and educational topic');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setGenerationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 15, 90));
      }, 800);

      const allTopics = [topic, ...additionalTopics].filter(t => t.trim());
      
      const requestBody = {
        user_id: user.id,
        topic: topic.trim(),
        additional_topics: additionalTopics.filter(t => t.trim().length > 0),
        preferences: {
          ...preferences,
          focus_topics: allTopics
        },
        custom_prompt: customPrompt.trim() || undefined
      };

      console.log('Sending request to generate quiz from topic:', requestBody);

      const response = await fetch('/api/quizzes/generate-from-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.quiz) {
        throw new Error('No quiz data received from server');
      }

      console.log('Quiz generated successfully:', result.quiz);
      
      // Reset form on success
      setTopic('');
      setAdditionalTopics([]);
      setCustomPrompt('');
      setPreferences({
        num_questions: 10,
        question_types: ['mcq'] as QuestionType[],
        difficulty_range: {
          min: 2 as DifficultyLevel,
          max: 4 as DifficultyLevel
        },
        focus_topics: [],
        exclude_topics: [],
        time_limit: 30,
        mode: 'practice' as QuizMode
      });
      
      if (result.success && onQuizCreated) {
        onQuizCreated(result.quiz);
      } else {
        throw new Error(result.error || 'Quiz generation failed');
      }

    } catch (err) {
      console.error('Error generating topic quiz:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz';
      setError(errorMessage);
      setGenerationProgress(0);
    } finally {
      setIsLoading(false);
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  const questionTypeOptions = [
    { value: 'mcq', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay' }
  ];

  const difficultyOptions = [
    { value: 1, label: 'Very Easy' },
    { value: 2, label: 'Easy' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Hard' },
    { value: 5, label: 'Very Hard' }
  ];

  const modeOptions = [
    { value: 'practice', label: 'Practice Mode' },
    { value: 'timed', label: 'Timed Quiz' },
    { value: 'exam', label: 'Exam Mode' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          Create Topic-Based Quiz
        </h1>
        <p className="text-gray-600">
          Generate personalized quizzes on any topic using AI
        </p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-medium">Generating your quiz...</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-gray-600">
                Creating questions based on your topic. This may take a few moments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="topic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="topic" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Topic & Content
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Quiz Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Main Topic
              </CardTitle>
              <CardDescription>
                Enter the primary topic you want to create a quiz about
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Quiz Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Machine Learning, World History, Biology..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-topics">Additional Topics (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="additional-topics"
                    placeholder="Add related topics..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <Button 
                    type="button" 
                    onClick={addTopic}
                    disabled={!newTopic.trim() || isLoading}
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {additionalTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {additionalTopics.map((addTopic, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {addTopic}
                        <button
                          onClick={() => removeTopic(addTopic)}
                          disabled={isLoading}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-prompt">Custom Instructions (Optional)</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Add specific instructions for question generation, focus areas, or style preferences..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Question Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="num-questions">Number of Questions</Label>
                  <Input
                    id="num-questions"
                    type="number"
                    min="1"
                    max="50"
                    value={preferences.num_questions}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      num_questions: parseInt(e.target.value) || 10
                    })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question Types</Label>
                  <div className="space-y-2">
                    {questionTypeOptions.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={option.value}
                          checked={preferences.question_types.includes(option.value as QuestionType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPreferences({
                                ...preferences,
                                question_types: [...preferences.question_types, option.value as QuestionType]
                              });
                            } else {
                              setPreferences({
                                ...preferences,
                                question_types: preferences.question_types.filter(t => t !== option.value)
                              });
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Label htmlFor={option.value}>{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Quiz Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty-min">Difficulty Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={preferences.difficulty_range.min.toString()}
                      onValueChange={(value) => setPreferences({
                        ...preferences,
                        difficulty_range: {
                          ...preferences.difficulty_range,
                          min: parseInt(value) as DifficultyLevel
                        }
                      })}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={preferences.difficulty_range.max.toString()}
                      onValueChange={(value) => setPreferences({
                        ...preferences,
                        difficulty_range: {
                          ...preferences.difficulty_range,
                          max: parseInt(value) as DifficultyLevel
                        }
                      })}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Max" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="5"
                    max="180"
                    value={preferences.time_limit || ''}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      time_limit: parseInt(e.target.value) || undefined
                    })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Quiz Mode</Label>
                  <Select
                    value={preferences.mode}
                    onValueChange={(value) => setPreferences({
                      ...preferences,
                      mode: value as QuizMode
                    })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button
          onClick={generateTopicQuiz}
          disabled={isLoading || !topic.trim() || preferences.question_types.length === 0}
          size="lg"
          className="px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </div>
    </div>
  );
}