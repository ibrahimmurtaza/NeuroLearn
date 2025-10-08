'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Trash2, Users, Filter } from 'lucide-react';
import { Connection } from '@/shared/types/peer-networking';
import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface ConnectionCardProps {
  connection: Connection;
  currentUser: any;
  onStatusUpdate: (connectionId: number, status: 'accepted' | 'rejected') => void;
  onDelete: (connectionId: number) => void;
}

function ConnectionCard({ connection, currentUser, onStatusUpdate, onDelete }: ConnectionCardProps) {
  // Determine which user to display based on current user's perspective
  const getDisplayUser = () => {
    if (!currentUser) return null;
    
    // If current user is the requester, show the receiver
    if (connection.requester?.id === currentUser.id) {
      return connection.receiver;
    }
    // If current user is the receiver, show the requester
    else if (connection.receiver?.id === currentUser.id) {
      return connection.requester;
    }
    // Fallback: show the other person
    return connection.requester?.id !== currentUser.id ? connection.requester : connection.receiver;
  };

  const displayUser = getDisplayUser();
  const displayName = displayUser?.full_name || 'Unknown User';
  const displayInitial = displayName.charAt(0);

  return (
    <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={`${UI_CONFIG.SIZES.AVATAR.MEDIUM} ${UI_CONFIG.COLORS.GRADIENTS.BLUE_PURPLE} rounded-full flex items-center justify-center text-white font-semibold`}>
            {displayInitial}
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>
              {displayName}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(connection.status)}`}>
                {connection.status || 'unknown'}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(connection.connection_type || connection.type)}`}>
                {(connection.connection_type || connection.type || 'unknown').replace('_', ' ')}
              </span>
            </div>
            {connection.message && (
              <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-sm mt-2 line-clamp-2`}>{connection.message}</p>
            )}
            <p className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mt-2`}>
              Connected {new Date(connection.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {connection.status === 'pending' && currentUser && (
            <>
              {/* Only show accept/decline buttons if current user is the receiver */}
              {connection.receiver?.id === currentUser.id && (
                <>
                  <button
                    onClick={() => onStatusUpdate(connection.id, 'accepted')}
                    className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.GREEN[600]} text-white rounded-md ${UI_CONFIG.COLORS.PRIMARY.GREEN[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
                  >
                    <Check className={UI_CONFIG.SIZES.ICON.SMALL} />
                  </button>
                  <button
                    onClick={() => onStatusUpdate(connection.id, 'rejected')}
                    className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} rounded-md ${UI_CONFIG.COLORS.HOVER.RED} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
                  >
                    <X className={UI_CONFIG.SIZES.ICON.SMALL} />
                  </button>
                </>
              )}
            </>
          )}
          {/* Delete button is always available */}
          <button
            onClick={() => onDelete(connection.id)}
            className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} rounded-md ${UI_CONFIG.COLORS.HOVER.RED} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
          >
            <Trash2 className={UI_CONFIG.SIZES.ICON.SMALL} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'accepted' | 'pending' | 'sent' | 'received'>('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user, filter]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      
      let url = API_CONFIG.ENDPOINTS.CONNECTIONS;
      const params = new URLSearchParams();
      
      if (filter === 'pending') {
        url = `${API_CONFIG.ENDPOINTS.CONNECTIONS}/pending`;
      } else if (filter === 'sent') {
        url = `${API_CONFIG.ENDPOINTS.CONNECTIONS}/pending`;
        params.append('type', 'sent');
      } else if (filter === 'received') {
        url = `${API_CONFIG.ENDPOINTS.CONNECTIONS}/pending`;
        params.append('type', 'received');
      } else if (filter === 'accepted') {
        params.append('status', 'accepted');
      }

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (response.ok) {
        setConnections(data.connections || []);
      } else {
        console.error('Error fetching connections:', data.error);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (connectionId: number, status: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.CONNECTIONS}/${connectionId}`, {
        method: API_CONFIG.METHODS.PATCH,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update the connection in the local state
        setConnections(connections.map(conn => 
          conn.id === connectionId ? { ...conn, status } : conn
        ));
      } else {
        const data = await response.json();
        console.error('Error updating connection:', data.error);
      }
    } catch (error) {
      console.error('Error updating connection:', error);
    }
  };

  const handleDelete = async (connectionId: number) => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.CONNECTIONS}/${connectionId}`, {
        method: API_CONFIG.METHODS.DELETE,
      });

      if (response.ok) {
        // Remove the connection from the local state
        setConnections(connections.filter(conn => conn.id !== connectionId));
      } else {
        const data = await response.json();
        console.error('Error deleting connection:', data.error);
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
          <div className={UI_CONFIG.ANIMATIONS.PULSE}>
            <div className={`h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/4 mb-6`}></div>
            <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
              {[...Array(DEFAULTS.LOADING_SKELETON_ITEMS)].map((_, i) => (
                <div key={i} className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} h-32`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
      <div className={`max-w-4xl mx-auto`}>
        {/* Header */}
        <div className={UI_CONFIG.SPACING.SECTION_MARGIN}>
          <h1 className={`text-3xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.TITLES.MY_CONNECTIONS}</h1>
          <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.MY_NETWORK}</p>
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div className={`bg-white rounded-lg p-4 shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{connections.length}</div>
            <div className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Total Connections</div>
          </div>
          <div className={`bg-white rounded-lg p-4 shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`}>
              {connections.filter(c => c.status === 'accepted').length}
            </div>
            <div className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Active</div>
          </div>
          <div className={`bg-white rounded-lg p-4 shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.YELLOW[600]}`}>
              {connections.filter(c => c.status === 'pending').length}
            </div>
            <div className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Pending</div>
          </div>
          <div className={`bg-white rounded-lg p-4 shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`}>
              {connections.filter(c => c.requester_id === user?.id).length}
            </div>
            <div className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Sent Requests</div>
          </div>
        </div>

        {/* Filters */}
        <div className={`bg-white rounded-lg p-4 shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} mb-6`}>
          <div className="flex items-center space-x-1 overflow-x-auto">
            <Filter className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mr-2`} />
            {[
              { key: 'all', label: 'All' },
              { key: 'accepted', label: 'Active' },
              { key: 'pending', label: 'Pending' },
              { key: 'sent', label: 'Sent' },
              { key: 'received', label: 'Received' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${UI_CONFIG.ANIMATIONS.TRANSITION} ${
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

        {/* Connections List */}
        <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
          {connections.length > 0 ? (
            connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                currentUser={user}
                onStatusUpdate={handleStatusUpdate}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <Users className={`h-16 w-16 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
              <h3 className={`text-xl font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.STATUS.NO_RESULTS}</h3>
              <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-4`}>
                {filter === 'all' 
                  ? "You haven't made any connections yet"
                  : `No ${filter} connections found`
                }
              </p>
              <button
                onClick={() => window.location.href = '/networking/discover'}
                className={`px-6 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-md ${UI_CONFIG.COLORS.PRIMARY.BLUE[700]} ${UI_CONFIG.ANIMATIONS.TRANSITION}`}
              >
                {TEXT_CONFIG.TITLES.DISCOVER_PEERS}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string | undefined) {
  if (!status) {
    return `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
  }
  
  switch (status) {
    case 'accepted':
      return `${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`;
    case 'pending':
      return `${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
    case 'rejected':
      return `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
    default:
      return `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
  }
}

function getTypeColor(type: string | undefined) {
  if (!type) {
    return `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
  }
  
  switch (type) {
    case 'study_partner':
      return `${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`;
    case 'project_collaborator':
      return `${UI_CONFIG.COLORS.PRIMARY.PURPLE[100]} ${UI_CONFIG.COLORS.PRIMARY.PURPLE[600]}`;
    case 'mentor':
      return `${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`;
    case 'mentee':
      return `${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`;
    default:
      return `${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`;
  }
}