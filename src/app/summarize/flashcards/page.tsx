'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/Badge';
import { Loader2, FileText, Plus, BookOpen, Download, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
  content?: string;
}

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  total_cards: number;
  created_at: string;
  card_count?: number;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
}

export default function SummarizeFlashcardsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardSet, setCurrentFlashcardSet] = useState<string | null>(null);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
    loadFlashcardSets();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        toast.error('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadFlashcardSets = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingSets(true);
      const response = await fetch(`/api/flashcards?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setFlashcardSets(data.flashcardSets || []);
      } else {
        toast.error('Failed to load flashcard sets');
      }
    } catch (error) {
      console.error('Error loading flashcard sets:', error);
      toast.error('Failed to load flashcard sets');
    } finally {
      setIsLoadingSets(false);
    }
  };

  const handleDocumentSelection = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const generateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic for your flashcards');
      return;
    }

    if (selectedDocuments.length === 0) {
      toast.error('Please select at least one document');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          documentIds: selectedDocuments,
          language: 'en'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedFlashcards(data.flashcards);
        setCurrentFlashcardSet(data.flashcardSetId);
        setIsDialogOpen(false);
        setTopic('');
        setSelectedDocuments([]);
        toast.success(`Generated ${data.totalCards} flashcards successfully!`);
        // Reload flashcard sets to show the new one
        loadFlashcardSets();
      } else {
        toast.error(data.error || 'Failed to generate flashcards');
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      toast.error('Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteFlashcardSet = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard set?')) {
      return;
    }

    if (!user?.id) {
      toast.error('User authentication required');
      return;
    }

    try {
      const response = await fetch(`/api/flashcards/${setId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Flashcard set deleted successfully');
        loadFlashcardSets();
      } else {
        toast.error('Failed to delete flashcard set');
      }
    } catch (error) {
      console.error('Error deleting flashcard set:', error);
      toast.error('Failed to delete flashcard set');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/summarize" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Summarize Dashboard
        </Link>
      </div>

      
      {/* Existing Flashcard Sets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Flashcard Sets
          </CardTitle>
          <CardDescription>
            View and manage your generated flashcard sets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSets ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading flashcard sets...</span>
            </div>
          ) : flashcardSets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No flashcard sets found</p>
              <p className="text-sm">Generate your first set to get started</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {flashcardSets.map((set) => (
                <Card key={set.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg truncate">{set.title}</CardTitle>
                    <CardDescription className="truncate">{set.topic}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">
                        {set.card_count || set.total_cards} cards
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(set.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`flashcards/study/${set.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          Study
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFlashcardSet(set.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}