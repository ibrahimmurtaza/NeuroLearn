'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { 
  FileText, 
  Video, 
  Mic, 
  BookOpen, 
  Clock, 
  Settings, 
  TrendingUp,
  Upload,
  Zap,
  Brain,
  Target,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  Plus,
  Type,
  History,
  Play,
  Calendar
} from 'lucide-react';

interface SummarizationStats {
  totalDocuments: number;
  totalSummaries: number;
  totalNotes: number;
  totalFlashcards: number;
}

interface FlashcardSet {
  id: string;
  title: string;
  topic: string;
  card_count: number;
  created_at: string;
  updated_at: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const SummarizationDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SummarizationStats>({
    totalDocuments: 0,
    totalSummaries: 0,
    totalNotes: 0,
    totalFlashcards: 0
  });
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(true);

  const fetchFlashcardSets = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingFlashcards(true);
      const response = await fetch(`/api/flashcards?userId=${user.id}&limit=6`);
      if (response.ok) {
        const data = await response.json();
        setFlashcardSets(data.flashcardSets || []);
        // Update flashcards count in stats
        setStats(prev => ({
          ...prev,
          totalFlashcards: data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulate API call for other stats
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStats(prev => ({
          ...prev,
          totalDocuments: 24,
          totalSummaries: 156,
          totalNotes: 89
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    fetchFlashcardSets();
  }, [user?.id]);

  const summarizationModes = [
    {
      icon: Type,
      title: 'Plain Text',
      description: 'Paste or type text directly for instant summarization',
      href: '/summarize/text',
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      icon: FileText,
      title: 'Document',
      description: 'Upload PDFs, Word docs, and text files for intelligent analysis',
      href: '/summarize/library',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'hover:from-purple-600 hover:to-purple-700'
    },
    {
      icon: Video,
      title: 'Video',
      description: 'Extract key insights from video content and lectures',
      href: '/summarize/video',
      color: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
      hoverGradient: 'hover:from-green-600 hover:to-green-700'
    },
    {
      icon: Mic,
      title: 'Audio',
      description: 'Transcribe and summarize audio recordings and podcasts',
      href: '/summarize/audio',
      color: 'bg-orange-500',
      gradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'hover:from-orange-600 hover:to-orange-700'
    }
  ];

  const quickActions = [
    {
      icon: History,
      title: 'History',
      description: 'View past summaries',
      href: '/summarize/analysis'
    },
    {
      icon: BookOpen,
      title: 'Library',
      description: 'Browse documents',
      href: '/summarize/library'
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Preferences',
      href: '/summarize/settings'
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Enhanced Summarization Module
          </h1>
          <p className="text-xl text-gray-600">
            Transform your content into actionable insights with AI-powered summarization
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Summaries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSummaries}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Brain className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Notes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalNotes}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <Link href="/summarize/flashcards" className="block">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-100 hover:shadow-lg transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.totalFlashcards}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Flashcards</h3>
              <p className="text-gray-600 text-sm">Study cards created</p>
            </div>
          </Link>
        </div>


        {/* Summarization Modes - Main Feature */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Summarization Mode</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select the type of content you want to summarize and let our AI do the rest
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summarizationModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={index}
                  href={mode.href}
                  className={`group relative overflow-hidden bg-gradient-to-br ${mode.gradient} ${mode.hoverGradient} rounded-2xl p-8 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 transform`}
                >
                  <div className="relative z-10">
                    <div className="mb-6">
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{mode.title}</h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-6">
                      {mode.description}
                    </p>
                    <div className="flex items-center text-white font-medium">
                      Get Started
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 group-hover:scale-125 transition-transform duration-700"></div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                href={action.href}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Getting Started Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="text-center">
            <div className="inline-flex p-4 bg-blue-100 rounded-full mb-6">
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Choose any summarization mode above to begin transforming your content into concise, actionable insights with our advanced AI technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/summarize/text"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Type className="h-4 w-4 mr-2" />
                Start with Text
              </Link>
              <Link
                href="/summarize/library"
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummarizationDashboard;