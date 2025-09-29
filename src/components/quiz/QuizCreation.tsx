'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Settings, 
  Brain, 
  Clock, 
  Target, 
  FileText, 
  Plus, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import QuizDocumentUpload from './QuizDocumentUpload';
import TopicQuizCreation from './TopicQuizCreation';
import { 
  QuizGenerationPreferences, 
  QuizMode, 
  DifficultyLevel, 
  QuestionType,
  Quiz 
} from '@/types/quiz';

interface Document {
  id: string;
  title: string;
  content_preview: string;
  created_at: string;
  chunk_count?: number;
}

interface QuizCreationProps {
  onQuizCreated?: (quiz: Quiz) => void;
}

export default function QuizCreation({ onQuizCreated }: QuizCreationProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<QuizGenerationPreferences>({
    questionCount: 10,
    difficulty: 'medium',
    questionTypes: ['multiple_choice'],
    mode: 'practice',
    timeLimit: null,
    includeExplanations: true,
    adaptiveDifficulty: false,
    focusAreas: []
  });
  const [focusArea, setFocusArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await fetch('/api/quiz-documents');
      if (!response.ok) throw new Error('Failed to fetch quiz documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError('Failed to load quiz documents. Please try again.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDocumentUploaded = (document: any) => {
    // Add the newly uploaded document to the documents list
    setDocuments(prev => [document, ...prev]);
    setSelectedDocuments(prev => [...prev, document.id]);
  };

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleQuestionTypeToggle = (type: QuestionType) => {
    setPreferences(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const addFocusArea = () => {
    if (focusArea.trim() && !preferences.focusAreas.includes(focusArea.trim())) {
      setPreferences(prev => ({
        ...prev,
        focusAreas: [...prev.focusAreas, focusArea.trim()]
      }));
      setFocusArea('');
    }
  };

  const removeFocusArea = (area: string) => {
    setPreferences(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.filter(a => a !== area)
    }));
  };

  const generateQuiz = async () => {
    if (!user || selectedDocuments.length === 0) {
      setError('Please select at least one document');
      return;
    }

    if (preferences.questionTypes.length === 0) {
      setError('Please select at least one question type');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setGenerationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          doc_ids: selectedDocuments,
          preferences: {
            num_questions: preferences.questionCount,
            question_types: preferences.questionTypes.map(type => {
              // Map frontend question types to backend types
              switch (type) {
                case 'multiple_choice': return 'mcq';
                case 'true_false': return 'tf';
                default: return type;
              }
            }),
            difficulty_range: {
              min: preferences.difficulty === 'easy' ? 1 : preferences.difficulty === 'medium' ? 2 : 4,
              max: preferences.difficulty === 'easy' ? 2 : preferences.difficulty === 'medium' ? 4 : 5
            },
            focus_topics: preferences.focusAreas,
            time_limit: preferences.timeLimit,
            // Map UI modes to DB-allowed values: 'practice' | 'timed' | 'adaptive' (fallback to 'practice')
            mode: preferences.mode === 'timed' ? 'timed' : 'practice'
          }
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quiz');
      }

      const data = await response.json();
      
      // Reset form
      setSelectedDocuments([]);
      setPreferences({
        questionCount: 10,
        difficulty: 'medium',
        questionTypes: ['multiple_choice'],
        mode: 'practice',
        timeLimit: null,
        includeExplanations: true,
        adaptiveDifficulty: false,
        focusAreas: []
      });

      if (onQuizCreated) {
        onQuizCreated(data.quiz);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setIsLoading(false);
      setTimeout(() => setGenerationProgress(0), 2000);
    }
  };

  const questionTypeOptions: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
    { type: 'multiple_choice', label: 'Multiple Choice', icon: <Target className="w-4 h-4" /> },
    { type: 'true_false', label: 'True/False', icon: <CheckCircle className="w-4 h-4" /> },
    { type: 'short_answer', label: 'Short Answer', icon: <FileText className="w-4 h-4" /> },
    { type: 'essay', label: 'Essay', icon: <BookOpen className="w-4 h-4" /> }
  ];

  const difficultyOptions: { value: DifficultyLevel; label: string; description: string }[] = [
    { value: 'easy', label: 'Easy', description: 'Basic recall and understanding' },
    { value: 'medium', label: 'Medium', description: 'Application and analysis' },
    { value: 'hard', label: 'Hard', description: 'Synthesis and evaluation' }
  ];

  const modeOptions: { value: QuizMode; label: string; description: string }[] = [
    { value: 'practice', label: 'Practice', description: 'Unlimited attempts, immediate feedback' },
    { value: 'assessment', label: 'Assessment', description: 'Limited attempts, delayed feedback' },
    { value: 'timed', label: 'Timed', description: 'Time-limited quiz with pressure' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          Create Quiz
        </h1>
        <p className="text-gray-600">
          Generate personalized quizzes from your documents using AI
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
                This may take a few moments while we analyze your documents and create questions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            From Documents
          </TabsTrigger>
          {/* <TabsTrigger value="topic" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            From Topic
          </TabsTrigger> */}
          <TabsTrigger value="settings" className="flex items-center gap-2 ">
            <Settings className="w-4 h-4" />
            Quiz Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Choose Documents</CardTitle>
                  <CardDescription>
                    Select the documents you want to generate quiz questions from
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Upload Documents
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No documents found. Upload some documents first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDocuments.includes(doc.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDocumentToggle(doc.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedDocuments.includes(doc.id)}
                              onChange={() => handleDocumentToggle(doc.id)}
                            />
                            <h3 className="font-medium">{doc.title}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {doc.content_preview}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            {doc.chunk_count && (
                              <span>{doc.chunk_count} sections</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="topic" className="space-y-4">
          <TopicQuizCreation onQuizCreated={onQuizCreated} />
        </TabsContent> */}

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="questionCount">Number of Questions</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="5"
                    max="50"
                    value={preferences.questionCount}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      questionCount: parseInt(e.target.value) || 10
                    }))}
                  />
                </div>

                <div>
                  <Label>Difficulty Level</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {difficultyOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          preferences.difficulty === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          difficulty: option.value
                        }))}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Quiz Mode</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {modeOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          preferences.mode === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setPreferences(prev => ({
                          ...prev,
                          mode: option.value
                        }))}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {preferences.mode === 'timed' && (
                  <div>
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="5"
                      max="180"
                      value={preferences.timeLimit || ''}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        timeLimit: parseInt(e.target.value) || null
                      }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Types</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {questionTypeOptions.map((option) => (
                      <div
                        key={option.type}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          preferences.questionTypes.includes(option.type)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleQuestionTypeToggle(option.type)}
                      >
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="explanations"
                      checked={preferences.includeExplanations}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        includeExplanations: checked as boolean
                      }))}
                    />
                    <Label htmlFor="explanations">Include explanations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adaptive"
                      checked={preferences.adaptiveDifficulty}
                      onCheckedChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        adaptiveDifficulty: checked as boolean
                      }))}
                    />
                    <Label htmlFor="adaptive">Adaptive difficulty</Label>
                  </div>
                </div>

                <div>
                  <Label>Focus Areas (Optional)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="e.g., Machine Learning, History"
                      value={focusArea}
                      onChange={(e) => setFocusArea(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFocusArea()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFocusArea}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {preferences.focusAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {preferences.focusAreas.map((area) => (
                        <Badge key={area} variant="secondary" className="flex items-center gap-1">
                          {area}
                          <button
                            onClick={() => removeFocusArea(area)}
                            className="ml-1 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center">
        <Button
          onClick={generateQuiz}
          disabled={isLoading || selectedDocuments.length === 0}
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
              Generate Quiz ({selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''})
            </>
          )}
        </Button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <QuizDocumentUpload
          showAsModal={true}
          onDocumentUploaded={handleDocumentUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}