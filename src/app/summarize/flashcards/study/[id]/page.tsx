'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Home, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
}

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  total_cards: number;
  created_at: string;
  cards: Flashcard[];
  linkedDocuments: any[];
}

interface StudyPageProps {
  params: {
    id: string;
  };
}

export default function StudyPage({ params }: StudyPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studyMode, setStudyMode] = useState<'sequential' | 'random'>('sequential');
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  useEffect(() => {
    loadFlashcardSet();
  }, [params.id]);

  useEffect(() => {
    if (flashcardSet && studyMode === 'random') {
      const indices = Array.from({ length: flashcardSet.cards.length }, (_, i) => i);
      setShuffledIndices(shuffleArray(indices));
    }
  }, [flashcardSet, studyMode]);

  const shuffleArray = (array: number[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadFlashcardSet = async () => {
    if (!user?.id) {
      toast.error('Please log in to access flashcards');
      router.push('/auth/login');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/flashcards/${params.id}?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setFlashcardSet(data.flashcardSet);
      } else {
        toast.error('Failed to load flashcard set');
        router.push('/flashcards');
      }
    } catch (error) {
      console.error('Error loading flashcard set:', error);
      toast.error('Failed to load flashcard set');
      router.push('/flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentCard = (): Flashcard | null => {
    if (!flashcardSet || flashcardSet.cards.length === 0) return null;
    
    const actualIndex = studyMode === 'random' && shuffledIndices.length > 0
      ? shuffledIndices[currentCardIndex]
      : currentCardIndex;
    
    return flashcardSet.cards[actualIndex] || null;
  };

  const nextCard = () => {
    if (!flashcardSet) return;
    
    setIsFlipped(false);
    setCurrentCardIndex(prev => 
      prev < flashcardSet.cards.length - 1 ? prev + 1 : 0
    );
  };

  const previousCard = () => {
    if (!flashcardSet) return;
    
    setIsFlipped(false);
    setCurrentCardIndex(prev => 
      prev > 0 ? prev - 1 : flashcardSet.cards.length - 1
    );
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const resetStudy = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    if (studyMode === 'random') {
      const indices = Array.from({ length: flashcardSet?.cards.length || 0 }, (_, i) => i);
      setShuffledIndices(shuffleArray(indices));
    }
  };

  const toggleStudyMode = () => {
    const newMode = studyMode === 'sequential' ? 'random' : 'sequential';
    setStudyMode(newMode);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading flashcards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!flashcardSet || flashcardSet.cards.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Flashcards Found</h1>
          <p className="text-gray-600 mb-6">This flashcard set appears to be empty or doesn't exist.</p>
          <Link href="/flashcards">
            <Button>
              <Home className="h-4 w-4 mr-2" />
              Back to Flashcards
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = getCurrentCard();
  const progress = ((currentCardIndex + 1) / flashcardSet.cards.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/flashcards">
            <Button variant="outline" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{flashcardSet.title}</h1>
            <p className="text-gray-600">{flashcardSet.topic}</p>
          </div>
        </div>
        
        {/* Progress and Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Card {currentCardIndex + 1} of {flashcardSet.cards.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStudyMode}
            >
              Mode: {studyMode === 'sequential' ? 'Sequential' : 'Random'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetStudy}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      {currentCard && (
        <div className="mb-8">
          <div className="relative mx-auto max-w-2xl">
            <div 
              className={`relative h-80 cursor-pointer transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              onClick={flipCard}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card */}
              <Card className={`absolute inset-0 backface-hidden ${
                isFlipped ? 'rotate-y-180' : ''
              }`}>
                <CardContent className="h-full flex flex-col justify-center items-center p-8 text-center">
                  <div className="mb-4">
                    <Badge className={getDifficultyColor(currentCard.difficulty)}>
                      {currentCard.difficulty}
                    </Badge>
                  </div>
                  <div className="text-xl font-medium leading-relaxed">
                    {currentCard.front}
                  </div>
                  <div className="mt-6 text-sm text-gray-500">
                    Click to reveal answer
                  </div>
                </CardContent>
              </Card>

              {/* Back of card */}
              <Card className={`absolute inset-0 backface-hidden rotate-y-180 ${
                isFlipped ? '' : 'rotate-y-180'
              }`}>
                <CardContent className="h-full flex flex-col justify-center items-center p-8 text-center bg-blue-50">
                  <div className="mb-4">
                    <Badge variant="secondary">Answer</Badge>
                  </div>
                  <div className="text-lg leading-relaxed">
                    {currentCard.back}
                  </div>
                  <div className="mt-6 text-sm text-gray-500">
                    Click to flip back
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={previousCard}
          disabled={flashcardSet.cards.length <= 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={flipCard}
          className="px-8"
        >
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </Button>
        
        <Button
          variant="outline"
          onClick={nextCard}
          disabled={flashcardSet.cards.length <= 1}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Keyboard shortcuts: Space (flip), ← (previous), → (next)</p>
      </div>

      {/* Keyboard Event Listener */}
      <div className="hidden">
        {typeof window !== 'undefined' && (
          <KeyboardListener
            onSpace={flipCard}
            onArrowLeft={previousCard}
            onArrowRight={nextCard}
          />
        )}
      </div>
    </div>
  );
}

// Keyboard event listener component
function KeyboardListener({ 
  onSpace, 
  onArrowLeft, 
  onArrowRight 
}: {
  onSpace: () => void;
  onArrowLeft: () => void;
  onArrowRight: () => void;
}) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          onSpace();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowLeft();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowRight();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSpace, onArrowLeft, onArrowRight]);

  return null;
}