'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Filter, MapPin, Clock, BookOpen, MessageCircle, UserPlus } from 'lucide-react';
import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface Peer {
  id: string;
  full_name: string;
  avatar_url?: string;

  study_level: string;
  learning_goals: string[];
  availability: {
    weekdays?: string[];
    weekends?: string[];
  };
  location?: string;
  timezone?: string;
  compatibility_score?: number;
  subjects: string[];
  study_style: string;
  shared_interests?: string[];
  shared_subjects?: string[];
  match_reasons?: string[];
  suggested_connection_type?: string;
  school?: string;
  grade_level?: string;
  academic_field?: string;
}

interface FilterState {
  studyLevel: string;
  availability: string;
  subjects: string[];
  location: string;
}

export default function DiscoverPeers() {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [filteredPeers, setFilteredPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [sentConnectionIds, setSentConnectionIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    studyLevel: '',
    availability: '',
    subjects: [],
    location: ''
  });

  useEffect(() => {
    fetchPeers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [peers, searchTerm, filters]);

  const fetchPeers = async () => {
    try {
      setLoading(true);
      
      // Get the supabase client to include auth headers
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No authenticated session found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(API_CONFIG.ENDPOINTS.PEER_SUGGESTIONS, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // The API returns { suggestions, total, page, limit }
      // Each suggestion has a 'user' property containing the peer data
      if (data.suggestions) {
        const mappedPeers = data.suggestions.map((suggestion: any) => ({
          ...suggestion.user,
          compatibility_score: suggestion.compatibility_score,
          shared_interests: suggestion.shared_interests,
          shared_subjects: suggestion.shared_subjects,
          match_reasons: suggestion.match_reasons,
          suggested_connection_type: suggestion.suggested_connection_type
        }));
        setPeers(mappedPeers);
      } else {
        console.warn('No suggestions returned from API');
        setPeers([]);
      }
    } catch (error) {
      console.error('Error fetching peers:', error);
      setPeers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = peers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(peer =>
        peer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        peer.learning_goals?.some(goal => 
          goal.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        peer.subjects?.some(subject => 
          subject.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Study level filter
    if (filters.studyLevel) {
      filtered = filtered.filter(peer => peer.study_level === filters.studyLevel);
    }

    // Availability filter
    if (filters.availability) {
      filtered = filtered.filter(peer => 
        peer.availability.includes(filters.availability)
      );
    }

    // Subjects filter
    if (filters.subjects.length > 0) {
      filtered = filtered.filter(peer =>
        filters.subjects.some(subject => peer.subjects.includes(subject))
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(peer =>
        peer.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        peer.timezone?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    setFilteredPeers(filtered);
  };

  const handleConnect = async (peerId: string) => {
    console.log('🔵 handleConnect called for peer:', peerId);
    console.log('🔵 Initial connectingIds:', Array.from(connectingIds));
    console.log('🔵 Initial sentConnectionIds:', Array.from(sentConnectionIds));
    
    try {
      setConnectingIds(prev => {
        const newSet = new Set(prev).add(peerId);
        console.log('🟡 Setting connectingIds to:', Array.from(newSet));
        return newSet;
      });
      
      const response = await fetch(API_CONFIG.ENDPOINTS.CONNECTIONS, {
        method: API_CONFIG.METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver_id: peerId,
          connection_type: 'study_partner',
          message: TEXT_CONFIG.MESSAGES.CONNECTION_REQUEST
        }),
      });

      const data = await response.json();
      console.log('🔵 API response:', data);
      console.log('🔵 Response status:', response.status);
      
      // Check if the response was successful (status 201 for created connection)
      if (response.ok && data.id) {
        console.log('🟢 Connection successful, updating states...');
        // Clear connecting state and mark connection as sent
        setConnectingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          console.log('🟡 Clearing connectingIds, new value:', Array.from(newSet));
          return newSet;
        });
        setSentConnectionIds(prev => {
          const newSet = new Set(prev).add(peerId);
          console.log('🟢 Setting sentConnectionIds to:', Array.from(newSet));
          return newSet;
        });
        // Remove peer from list after a short delay to show feedback
        setTimeout(() => {
          console.log('🔴 Removing peer from list after delay');
          setPeers(prev => prev.filter(peer => peer.id !== peerId));
        }, 2000);
      } else {
        console.log('🔴 Connection failed:', data.error || 'Unknown error');
        // Clear connecting state on failure
        setConnectingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(peerId);
          console.log('🟡 Clearing connectingIds on failure, new value:', Array.from(newSet));
          return newSet;
        });
      }
    } catch (error) {
      console.error('🔴 Error connecting to peer:', error);
      // Clear connecting state on error
      setConnectingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(peerId);
        console.log('🟡 Clearing connectingIds on error, new value:', Array.from(newSet));
        return newSet;
      });
    }
  };

  const getCompatibilityColor = (score?: number) => {
    if (!score) return UI_CONFIG.COLORS.PRIMARY.GRAY[400];
    if (score >= 80) return UI_CONFIG.COLORS.PRIMARY.GREEN[500];
    if (score >= 60) return UI_CONFIG.COLORS.PRIMARY.BLUE[500];
    if (score >= 40) return UI_CONFIG.COLORS.PRIMARY.YELLOW[500];
    return UI_CONFIG.COLORS.PRIMARY.RED[500];
  };

  const getCompatibilityText = (score?: number) => {
    if (!score) return TEXT_CONFIG.LABELS.COMPATIBILITY_UNKNOWN;
    if (score >= 80) return TEXT_CONFIG.LABELS.COMPATIBILITY_EXCELLENT;
    if (score >= 60) return TEXT_CONFIG.LABELS.COMPATIBILITY_GOOD;
    if (score >= 40) return TEXT_CONFIG.LABELS.COMPATIBILITY_FAIR;
    return TEXT_CONFIG.LABELS.COMPATIBILITY_LOW;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
          <div className={UI_CONFIG.ANIMATIONS.PULSE}>
            <div className={`h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/4 mb-6`}></div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
              {[...Array(DEFAULTS.LOADING_SKELETON_ITEMS)].map((_, i) => (
                <div key={i} className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} h-64`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
      <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
        {/* Header */}
        <div className={UI_CONFIG.SPACING.SECTION_MARGIN}>
          <h1 className={`text-3xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.TITLES.DISCOVER_PEERS}</h1>
          <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.DISCOVER_PEERS}</p>
        </div>

        {/* Search and Filters */}
        <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]}`} />
              <input
                type="text"
                placeholder={TEXT_CONFIG.PLACEHOLDERS.SEARCH_PEERS}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GRAY_200}`}
            >
              <Filter className={UI_CONFIG.SIZES.ICON.SMALL} />
              <span>{TEXT_CONFIG.LABELS.FILTER_PEERS}</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className={`mt-6 pt-6 border-t ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Study Level Filter */}
                <div>
                  <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-2`}>
                    {TEXT_CONFIG.LABELS.STUDY_LEVEL}
                  </label>
                  <select
                    value={filters.studyLevel}
                    onChange={(e) => setFilters(prev => ({ ...prev, studyLevel: e.target.value }))}
                    className={`w-full px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">{TEXT_CONFIG.OPTIONS.ANY_LEVEL}</option>
                    <option value="beginner">{TEXT_CONFIG.OPTIONS.BEGINNER}</option>
                    <option value="intermediate">{TEXT_CONFIG.OPTIONS.INTERMEDIATE}</option>
                    <option value="advanced">{TEXT_CONFIG.OPTIONS.ADVANCED}</option>
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-2`}>
                    {TEXT_CONFIG.LABELS.AVAILABILITY}
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                    className={`w-full px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">{TEXT_CONFIG.OPTIONS.ANY_TIME}</option>
                    <option value="morning">{TEXT_CONFIG.OPTIONS.MORNING}</option>
                    <option value="afternoon">{TEXT_CONFIG.OPTIONS.AFTERNOON}</option>
                    <option value="evening">{TEXT_CONFIG.OPTIONS.EVENING}</option>
                    <option value="weekend">{TEXT_CONFIG.OPTIONS.WEEKEND}</option>
                  </select>
                </div>

                {/* Location Filter */}
                <div>
                  <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-2`}>
                    {TEXT_CONFIG.LABELS.LOCATION}
                  </label>
                  <input
                    type="text"
                    placeholder={TEXT_CONFIG.PLACEHOLDERS.LOCATION}
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className={`w-full px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ studyLevel: '', availability: '', subjects: [], location: '' })}
                    className={`w-full px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GRAY_200}`}
                  >
                    {TEXT_CONFIG.ACTIONS.CLEAR_FILTERS}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Peers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeers.map((peer) => (
            <div key={peer.id} className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.HOVER_SHADOW}`}>
              {/* Peer Header */}
              <div className="flex items-start space-x-4 mb-4">
                <div className={`w-12 h-12 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full flex items-center justify-center`}>
                  {peer.avatar_url ? (
                    <img src={peer.avatar_url} alt={peer.full_name || 'User'} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`}>
                      {peer.full_name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{peer.full_name || 'Unknown User'}</h3>
                  <p className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} capitalize`}>{peer.study_level}</p>
                  {peer.academic_field && (
                    <p className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mt-1`}>
                      🎓 {peer.academic_field}
                    </p>
                  )}
                  {peer.school && (
                    <p className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mt-1`}>
                      📚 {peer.school}
                      {peer.grade_level && ` • ${peer.grade_level}`}
                    </p>
                  )}
                  
                  {/* Shared Information */}
                  <div className="mt-2 space-y-1">
                    {peer.shared_interests && peer.shared_interests.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-green-600 font-medium">Shared interests:</span>
                        <span className="text-xs text-gray-600">
                          {peer.shared_interests.slice(0, 2).join(', ')}
                          {peer.shared_interests.length > 2 && ` +${peer.shared_interests.length - 2} more`}
                        </span>
                      </div>
                    )}
                    
                    {peer.shared_subjects && peer.shared_subjects.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-blue-600 font-medium">Shared subjects:</span>
                        <span className="text-xs text-gray-600">
                          {peer.shared_subjects.slice(0, 2).join(', ')}
                          {peer.shared_subjects.length > 2 && ` +${peer.shared_subjects.length - 2} more`}
                        </span>
                      </div>
                    )}
                    
                    {peer.match_reasons && peer.match_reasons.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-purple-600 font-medium">Match:</span>
                        <span className="text-xs text-gray-600">
                          {peer.match_reasons[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Details */}
              <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
                {/* Location */}
                {peer.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className={`${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]}`} />
                    <span className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>{peer.location}</span>
                  </div>
                )}

                {/* Availability */}
                {peer.availability && (peer.availability.weekdays?.length > 0 || peer.availability.weekends?.length > 0) && (
                  <div className="flex items-center space-x-2">
                    <Clock className={`${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]}`} />
                    <span className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>
                      {[
                        ...(peer.availability.weekdays || []).map(day => `Weekdays: ${day}`),
                        ...(peer.availability.weekends || []).map(day => `Weekends: ${day}`)
                      ].slice(0, 2).join(', ')}
                      {((peer.availability.weekdays?.length || 0) + (peer.availability.weekends?.length || 0)) > 2 && 
                        ` +${((peer.availability.weekdays?.length || 0) + (peer.availability.weekends?.length || 0)) - 2} more`}
                    </span>
                  </div>
                )}

                {/* Subjects */}
                {peer.subjects?.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <BookOpen className={`${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mt-0.5`} />
                    <div className="flex flex-wrap gap-1">
                      {peer.subjects?.slice(0, 3).map((subject, index) => (
                        <span key={index} className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} ${UI_CONFIG.COLORS.PRIMARY.BLUE[800]} text-xs rounded-full`}>
                          {subject}
                        </span>
                      ))}
                      {peer.subjects?.length > 3 && (
                        <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-xs rounded-full`}>
                          +{peer.subjects.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={() => handleConnect(peer.id)}
                  disabled={connectingIds.has(peer.id) || sentConnectionIds.has(peer.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 ${
                    sentConnectionIds.has(peer.id) 
                      ? `${UI_CONFIG.COLORS.PRIMARY.GREEN[600]} text-white` 
                      : `${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]}`
                  } rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <UserPlus className={UI_CONFIG.SIZES.ICON.SMALL} />
                  <span>
                    {connectingIds.has(peer.id) 
                      ? TEXT_CONFIG.ACTIONS.CONNECTING 
                      : sentConnectionIds.has(peer.id) 
                        ? TEXT_CONFIG.ACTIONS.CONNECTION_SENT 
                        : TEXT_CONFIG.ACTIONS.CONNECT}
                  </span>
                </button>
                <button className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GRAY_200}`}>
                  <MessageCircle className={UI_CONFIG.SIZES.ICON.SMALL} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPeers.length === 0 && !loading && (
          <div className="text-center py-12">
            <UserPlus className={`h-16 w-16 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
            {(() => {
              // Check if any filters are active
              const hasActiveFilters = searchTerm || 
                filters.studyLevel || 
                filters.availability || 
                filters.subjects.length > 0 || 
                filters.location;
              
              if (hasActiveFilters) {
                return (
                  <>
                    <h3 className={`text-xl font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.MESSAGES.NO_PEERS_FOUND}</h3>
                    <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-6`}>{TEXT_CONFIG.MESSAGES.TRY_DIFFERENT_FILTERS}</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({ studyLevel: '', availability: '', subjects: [], location: '' });
                      }}
                      className={`px-6 py-3 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]}`}
                    >
                      {TEXT_CONFIG.ACTIONS.CLEAR_FILTERS}
                    </button>
                  </>
                );
              } else {
                return (
                  <>
                    <h3 className={`text-xl font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.MESSAGES.NO_PEERS_FOUND}</h3>
                    <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-6`}>{TEXT_CONFIG.MESSAGES.NO_PEERS_AVAILABLE}</p>
                    <button
                      onClick={() => fetchPeers()}
                      className={`px-6 py-3 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]}`}
                    >
                      {TEXT_CONFIG.ACTIONS.REFRESH}
                    </button>
                  </>
                );
              }
            })()}
          </div>
        )}
      </div>
    </div>
  );
}