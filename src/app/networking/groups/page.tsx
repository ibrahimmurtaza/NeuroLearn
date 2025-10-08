'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Globe, Lock, Eye, Calendar, UserCheck } from 'lucide-react';
import Link from 'next/link';

import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  privacy_level: 'public' | 'private' | 'invite_only';
  max_members: number;
  member_count: number;
  created_at: string;
  creator?: {
    full_name?: string;
  } | null;
}

interface CreateGroupForm {
  name: string;
  description: string;
  subject: string;
  privacy_level: 'public' | 'private' | 'invite_only';
  max_members: number;
}

function CreateGroupModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<CreateGroupForm>({
    name: '',
    description: '',
    subject: '',
    privacy_level: 'public',
    max_members: DEFAULTS.MAX_GROUP_MEMBERS
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.GROUPS, {
        method: API_CONFIG.METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        setForm({
          name: '',
          description: '',
          subject: '',
          privacy_level: 'public',
          max_members: DEFAULTS.MAX_GROUP_MEMBERS
        });
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} w-full max-w-md mx-4`}>
        <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-4`}>{TEXT_CONFIG.ACTIONS.CREATE_GROUP}</h3>
        
        <form onSubmit={handleSubmit} className={UI_CONFIG.SPACING.ITEM_SPACING}>
          <div>
            <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-1`}>{TEXT_CONFIG.LABELS.GROUP_NAME}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={`w-full p-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={TEXT_CONFIG.PLACEHOLDERS.GROUP_NAME}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-1`}>{TEXT_CONFIG.LABELS.DESCRIPTION}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
              className={`w-full p-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={TEXT_CONFIG.PLACEHOLDERS.GROUP_DESCRIPTION}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-1`}>{TEXT_CONFIG.LABELS.SUBJECT}</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
              className={`w-full p-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={TEXT_CONFIG.PLACEHOLDERS.SUBJECT}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-1`}>{TEXT_CONFIG.LABELS.PRIVACY_LEVEL}</label>
            <select
              value={form.privacy_level}
              onChange={(e) => setForm({ ...form, privacy_level: e.target.value as 'public' | 'private' | 'invite_only' })}
              className={`w-full p-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="public">{TEXT_CONFIG.OPTIONS.PUBLIC}</option>
              <option value="private">{TEXT_CONFIG.OPTIONS.PRIVATE}</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-1`}>{TEXT_CONFIG.LABELS.MAX_MEMBERS}</label>
            <input
              type="number"
              value={form.max_members}
              onChange={(e) => setForm({ ...form, max_members: parseInt(e.target.value) })}
              min={DEFAULTS.MIN_GROUP_MEMBERS}
              max={DEFAULTS.MAX_GROUP_MEMBERS}
              required
              className={`w-full p-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
            >
              {TEXT_CONFIG.ACTIONS.CANCEL}
            </button>
            <button
              type="submit"
              disabled={creating}
              className={`flex-1 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} disabled:opacity-50 disabled:cursor-not-allowed ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
            >
              {creating ? TEXT_CONFIG.ACTIONS.CREATING : TEXT_CONFIG.ACTIONS.CREATE_GROUP}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GroupCard({ group, onJoin }: { group: StudyGroup; onJoin: (groupId: string) => void }) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoin(group.id);
    } finally {
      setJoining(false);
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public': return <Globe className={UI_CONFIG.SIZES.ICON.SMALL} />;
      case 'private': return <Lock className={UI_CONFIG.SIZES.ICON.SMALL} />;
      default: return <Eye className={UI_CONFIG.SIZES.ICON.SMALL} />;
    }
  };

  const getPrivacyColor = (privacy: string) => {
    switch (privacy) {
      case 'public': return UI_CONFIG.COLORS.PRIMARY.GREEN[600];
      case 'private': return UI_CONFIG.COLORS.PRIMARY.YELLOW[600];
      case 'invite_only': return UI_CONFIG.COLORS.PRIMARY.RED[600];
      default: return UI_CONFIG.COLORS.PRIMARY.GRAY[600];
    }
  };

  return (
    <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} hover:shadow-md ${UI_CONFIG.ANIMATIONS.TRANSITION}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{group.name}</h3>
          <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${getPrivacyColor(group.privacy_level)}`}>
            {getPrivacyIcon(group.privacy_level)}
            <span className="capitalize">{group.privacy_level}</span>
          </div>
        </div>
      </div>

      <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-sm line-clamp-2 mb-3`}>{group.description}</p>

      <div className={`flex items-center space-x-4 text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mb-3`}>
        <div className="flex items-center space-x-1">
          <Users className={UI_CONFIG.SIZES.ICON.SMALL} />
          <span>{group.member_count}/{group.max_members} {TEXT_CONFIG.LABELS.MEMBERS}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Calendar className={UI_CONFIG.SIZES.ICON.SMALL} />
          <span>{new Date(group.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={`flex items-center space-x-2 text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]}`}>
        <UserCheck className={UI_CONFIG.SIZES.ICON.SMALL} />
        <span>{TEXT_CONFIG.LABELS.CREATED_BY} {group.creator?.full_name || 'Unknown'}</span>
      </div>

      <div className="flex space-x-2 mt-4">
        <Link
          href={`${API_CONFIG.ENDPOINTS.GROUPS}/${group.id}`}
          className={`flex-1 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GREEN[600]} text-white text-center rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.GREEN[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
        >
          {TEXT_CONFIG.ACTIONS.VIEW_GROUP}
        </Link>
        <button
          onClick={handleJoin}
          disabled={joining || (group.member_count || 0) >= group.max_members}
          className={`flex-1 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} disabled:opacity-50 disabled:cursor-not-allowed ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
        >
          {joining ? TEXT_CONFIG.ACTIONS.JOINING :
            (group.member_count || 0) >= group.max_members ? TEXT_CONFIG.MESSAGES.GROUP_FULL : TEXT_CONFIG.ACTIONS.JOIN_GROUP}
        </button>
        <Link
          href={`${API_CONFIG.ENDPOINTS.GROUPS}/${group.id}/chat`}
          className={`px-4 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[50]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
        >
          {TEXT_CONFIG.ACTIONS.CHAT}
        </Link>
      </div>
    </div>
  );
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'my_groups' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchGroups();
  }, [filter, searchQuery]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (filter === 'my_groups') params.append('my_groups', 'true');
      if (filter === 'public') params.append('privacy', 'public');
      if (filter === 'private') params.append('privacy', 'private');

      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}?${params}`);
      const data = await response.json();

      if (response.ok) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}/join`, {
        method: API_CONFIG.METHODS.POST,
      });

      if (response.ok) {
        fetchGroups(); // Refresh the groups list
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGroups();
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
          <div className={UI_CONFIG.ANIMATIONS.PULSE}>
            <div className={`h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/4 mb-6`}></div>
            <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} mb-8 h-32`}></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.TITLES.STUDY_GROUPS}</h1>
            <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.STUDY_GROUPS}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION} flex items-center space-x-2`}
          >
            <Plus className={UI_CONFIG.SIZES.ICON.SMALL} />
            <span>{TEXT_CONFIG.ACTIONS.CREATE_GROUP}</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} mb-8`}>
          <form onSubmit={handleSearch} className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} h-5 w-5`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={TEXT_CONFIG.PLACEHOLDERS.SEARCH_GROUPS}
                className={`w-full pl-10 pr-4 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
            <button
              type="submit"
              className={`px-6 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
            >
              {TEXT_CONFIG.ACTIONS.SEARCH}
            </button>
          </form>

          <div className="flex items-center space-x-2">
            <Filter className={`h-5 w-5 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mr-2`} />
            {[
              { key: 'all', label: TEXT_CONFIG.FILTERS.ALL_GROUPS },
              { key: 'my_groups', label: TEXT_CONFIG.FILTERS.MY_GROUPS },
              { key: 'public', label: TEXT_CONFIG.FILTERS.PUBLIC },
              { key: 'private', label: TEXT_CONFIG.FILTERS.PRIVATE }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-1 text-sm rounded-full ${UI_CONFIG.ANIMATIONS.TRANSITION} ${
                  filter === filterOption.key
                    ? `${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white`
                    : `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onJoin={handleJoinGroup}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className={`h-16 w-16 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
            <h3 className={`text-xl font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.MESSAGES.NO_GROUPS_FOUND}</h3>
            <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-4`}>
              {filter === 'all'
                ? TEXT_CONFIG.MESSAGES.NO_GROUPS_AVAILABLE
                : TEXT_CONFIG.MESSAGES.NO_GROUPS_MATCH_FILTER}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`px-6 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
            >
              {TEXT_CONFIG.ACTIONS.CREATE_FIRST_GROUP}
            </button>
          </div>
        )}

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchGroups}
        />
      </div>
    </div>
  );
}