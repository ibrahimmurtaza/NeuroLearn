'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  FileText,
  Video,
  Mic,
  Type,
  Star,
  Clock,
  ArrowUpDown,
  MoreHorizontal,
  Share2,
  Edit3,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface SummaryItem {
  id: string;
  title: string;
  type: 'text' | 'document' | 'video' | 'audio';
  content: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  rating?: number;
  tags: string[];
  status: 'completed' | 'processing' | 'failed';
  originalSource?: string;
}

const SummaryHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<SummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSummaries = async () => {
      // Don't fetch if still loading auth or no user
      if (authLoading || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/summarize/history?userId=${user.id}&limit=50&sortBy=created_at&sortOrder=desc`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.items) {
          // Transform API response to match component interface
          const transformedSummaries: SummaryItem[] = data.items.map((item: any) => ({
            id: item.id,
            title: item.title,
            type: item.documentType || 'document',
            content: item.content,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            wordCount: item.wordCount,
            rating: undefined, // Not available in API response
            tags: item.tags || [], // Now available from API
            status: item.processingStatus === 'completed' ? 'completed' : 
                   item.processingStatus === 'processing' ? 'processing' : 'failed',
            originalSource: item.documentTitle || 'Unknown',
          }));
          
          setSummaries(transformedSummaries);
          setFilteredSummaries(transformedSummaries);
        } else {
          // If no summaries found or API returned error, set empty arrays
          setSummaries([]);
          setFilteredSummaries([]);
        }
      } catch (error) {
        console.error('Error fetching summaries:', error);
        // Set empty arrays on error
        setSummaries([]);
        setFilteredSummaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, [user, authLoading]); // Added dependencies

  useEffect(() => {
    let filtered = summaries.filter(summary => {
      const matchesSearch = summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           summary.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           summary.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'all' || summary.type === selectedType;
      return matchesSearch && matchesType;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSummaries(filtered);
  }, [summaries, searchQuery, selectedType, sortBy, sortOrder]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return Type;
      case 'document': return FileText;
      case 'video': return Video;
      case 'audio': return Mic;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-700';
      case 'document': return 'bg-purple-100 text-purple-700';
      case 'video': return 'bg-green-100 text-green-700';
      case 'audio': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === filteredSummaries.length 
        ? [] 
        : filteredSummaries.map(s => s.id)
    );
  };

  const toggleSummaryExpansion = (summaryId: string) => {
    setExpandedSummaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(summaryId)) {
        newSet.delete(summaryId);
      } else {
        newSet.add(summaryId);
      }
      return newSet;
    });
  };

  const handleExport = (format: 'pdf' | 'docx' | 'txt') => {
    console.log(`Exporting ${selectedItems.length} items as ${format}`);
    // Implementation for export functionality
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state while auth is loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="h-10 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to view your summary history.</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Log In
            </Link>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Summary History</h1>
              <p className="text-gray-600">
                View, manage, and export your AI-generated summaries
              </p>
            </div>
            <Link
              href="/summarize"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              New Summary
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search summaries by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="text">Plain Text</option>
              <option value="document">Document</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'type')}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
                <option value="type">Sort by Type</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Export DOCX
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredSummaries.length && filteredSummaries.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {filteredSummaries.length} result{filteredSummaries.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Summary List */}
          <div className="divide-y divide-gray-100">
            {filteredSummaries.map((summary) => {
              const TypeIcon = getTypeIcon(summary.type);
              return (
                <div key={summary.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(summary.id)}
                      onChange={() => handleSelectItem(summary.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getTypeColor(summary.type)}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{summary.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(summary.createdAt)}
                              </span>
                              <span>{summary.wordCount} words</span>
                              {summary.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span>{summary.rating}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            summary.status === 'completed' ? 'bg-green-100 text-green-700' :
                            summary.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {summary.status}
                          </span>
                          
                          <div className="flex gap-1">
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Source Document */}
                      {summary.originalSource && (
                        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Source Document:</span>
                            <span className="text-sm text-blue-700">{summary.originalSource}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-gray-600 mb-3">
                        <p className={expandedSummaries.has(summary.id) ? '' : 'line-clamp-2'}>
                          {summary.content}
                        </p>
                        {summary.content.length > 200 && (
                          <button
                            onClick={() => toggleSummaryExpansion(summary.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-1 flex items-center gap-1"
                          >
                            {expandedSummaries.has(summary.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Show more
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {summary.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        

                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSummaries.length === 0 && (
            <div className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No summaries found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first summary to get started'
                }
              </p>
              <Link
                href="/summarize"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Summary
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryHistory;