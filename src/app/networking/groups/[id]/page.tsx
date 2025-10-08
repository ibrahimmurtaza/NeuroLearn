'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, MessageCircle, Calendar, Settings, UserPlus, Crown, Clock } from 'lucide-react';
import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
  };
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  study_level: string;
  max_members: number;
  is_private: boolean;
  created_at: string;
  created_by: string;
  members: GroupMember[];
  member_count: number;
}

interface GroupMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function GroupDetailsPage() {
  const params = useParams();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'members' | 'settings'>('messages');

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (groupId && currentUser) {
      fetchGroupDetails();
      if (activeTab === 'messages') {
        fetchMessages();
      }
    }
  }, [groupId, currentUser, activeTab]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}`);
      const data = await response.json();
      
      if (data.success) {
        setGroup(data.group);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}/messages`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}/messages`, {
        method: API_CONFIG.METHODS.POST,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const joinGroup = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}/join`, {
        method: API_CONFIG.METHODS.POST,
      });

      const data = await response.json();
      
      if (data.success) {
        fetchGroupDetails(); // Refresh group data
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const leaveGroup = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.GROUPS}/${groupId}/leave`, {
        method: API_CONFIG.METHODS.POST,
      });

      const data = await response.json();
      
      if (data.success) {
        fetchGroupDetails(); // Refresh group data
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const isUserMember = () => {
    return group?.members.some(member => member.user_id === currentUser?.id);
  };

  const getUserRole = () => {
    const member = group?.members.find(member => member.user_id === currentUser?.id);
    return member?.role;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className={`${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.YELLOW[600]}`} />;
      case 'moderator':
        return <Settings className={`${UI_CONFIG.SIZES.ICON.SMALL} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
          <div className={UI_CONFIG.ANIMATIONS.PULSE}>
            <div className={`h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/3 mb-6`}></div>
            <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} h-96`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto text-center py-12`}>
          <Users className={`h-16 w-16 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
          <h3 className={`text-xl font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>
            {TEXT_CONFIG.MESSAGES.GROUP_NOT_FOUND}
          </h3>
          <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>
            {TEXT_CONFIG.MESSAGES.GROUP_NOT_FOUND_DESCRIPTION}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
      <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
        {/* Group Header */}
        <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`w-16 h-16 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-lg flex items-center justify-center`}>
                <Users className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{group.name}</h1>
                <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-2`}>{group.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} ${UI_CONFIG.COLORS.PRIMARY.BLUE[800]} rounded-full`}>
                    {group.subject}
                  </span>
                  <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} ${UI_CONFIG.COLORS.PRIMARY.GREEN[800]} rounded-full capitalize`}>
                    {group.study_level}
                  </span>
                  <span className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} flex items-center space-x-1`}>
                    <Users className={UI_CONFIG.SIZES.ICON.SMALL} />
                    <span>{group.member_count}/{group.max_members} {TEXT_CONFIG.LABELS.MEMBERS}</span>
                  </span>
                  <span className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} flex items-center space-x-1`}>
                    <Clock className={UI_CONFIG.SIZES.ICON.SMALL} />
                    <span>{TEXT_CONFIG.LABELS.CREATED} {new Date(group.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Join/Leave Button */}
            <div>
              {isUserMember() ? (
                <button
                  onClick={leaveGroup}
                  className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.RED[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.RED[700]}`}
                >
                  {TEXT_CONFIG.ACTIONS.LEAVE_GROUP}
                </button>
              ) : (
                <button
                  onClick={joinGroup}
                  disabled={group.member_count >= group.max_members}
                  className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                >
                  <UserPlus className={UI_CONFIG.SIZES.ICON.SMALL} />
                  <span>{TEXT_CONFIG.ACTIONS.JOIN_GROUP}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`bg-white rounded-lg shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
          <div className={`border-b ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'messages'
                    ? `border-${UI_CONFIG.COLORS.PRIMARY.BLUE[500]} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`
                    : `border-transparent ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} hover:border-${UI_CONFIG.COLORS.PRIMARY.GRAY[300]}`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MessageCircle className={UI_CONFIG.SIZES.ICON.SMALL} />
                  <span>{TEXT_CONFIG.TABS.MESSAGES}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? `border-${UI_CONFIG.COLORS.PRIMARY.BLUE[500]} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`
                    : `border-transparent ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} hover:border-${UI_CONFIG.COLORS.PRIMARY.GRAY[300]}`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className={UI_CONFIG.SIZES.ICON.SMALL} />
                  <span>{TEXT_CONFIG.TABS.MEMBERS} ({group.member_count})</span>
                </div>
              </button>
              {(getUserRole() === 'admin' || getUserRole() === 'moderator') && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'settings'
                      ? `border-${UI_CONFIG.COLORS.PRIMARY.BLUE[500]} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`
                      : `border-transparent ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} hover:${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} hover:border-${UI_CONFIG.COLORS.PRIMARY.GRAY[300]}`
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className={UI_CONFIG.SIZES.ICON.SMALL} />
                    <span>{TEXT_CONFIG.TABS.SETTINGS}</span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className={UI_CONFIG.SPACING.CARD_PADDING}>
            {activeTab === 'messages' && (
              <div>
                {/* Messages List */}
                <div className={`h-96 overflow-y-auto ${UI_CONFIG.SPACING.ITEM_SPACING} mb-4`}>
                  {messagesLoading ? (
                    <div className={UI_CONFIG.ANIMATIONS.PULSE}>
                      {[...Array(DEFAULTS.LOADING_SKELETON_ITEMS)].map((_, i) => (
                        <div key={i} className={`flex space-x-3 mb-4`}>
                          <div className={`w-8 h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-full`}></div>
                          <div className="flex-1">
                            <div className={`h-4 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/4 mb-2`}></div>
                            <div className={`h-3 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-3/4`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((message) => (
                      <div key={message.id} className="flex space-x-3 mb-4">
                        <div className={`w-8 h-8 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {message.user.avatar_url ? (
                            <img
                              src={message.user.avatar_url}
                              alt={message.user.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className={`text-sm font-semibold ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`}>
                              {message.user.full_name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>
                              {message.user.full_name}
                            </span>
                            <span className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]}`}>
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]}`}>{message.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className={`h-12 w-12 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
                      <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.MESSAGES.NO_MESSAGES}</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                {isUserMember() && (
                  <form onSubmit={sendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={TEXT_CONFIG.PLACEHOLDERS.TYPE_MESSAGE}
                      className={`flex-1 px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {TEXT_CONFIG.ACTIONS.SEND}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
                {group.members.map((member) => (
                  <div key={member.id} className={`flex items-center justify-between p-4 ${UI_CONFIG.COLORS.PRIMARY.GRAY[50]} rounded-lg`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full flex items-center justify-center`}>
                        {member.user.avatar_url ? (
                          <img
                            src={member.user.avatar_url}
                            alt={member.user.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`}>
                            {member.user.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{member.user.full_name}</h3>
                          {getRoleIcon(member.role)}
                        </div>
                        {member.user.bio && (
                          <p className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mt-1`}>{member.user.bio}</p>
                        )}
                        <p className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mt-1`}>
                          {TEXT_CONFIG.LABELS.JOINED} {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-xs rounded-full capitalize`}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="text-center py-8">
                <Settings className={`h-12 w-12 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
                <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.MESSAGES.SETTINGS_COMING_SOON}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}