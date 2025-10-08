'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, UserPlus, MessageCircle, TrendingUp, Bell } from 'lucide-react';
import Link from 'next/link';
import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  created_at: string;
  user?: {
    full_name: string;
  };
}

interface NetworkingStats {
  connections: number;
  groups: number;
  unreadNotifications: number;
  weeklyActivity: number;
}

export default function NetworkingDashboard() {
  const [stats, setStats] = useState<NetworkingStats>({
    connections: 0,
    groups: 0,
    unreadNotifications: 0,
    weeklyActivity: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats with proper authentication
      const [connectionsRes, groupsRes, notificationsRes, activitiesRes] = await Promise.all([
        fetch(API_CONFIG.ENDPOINTS.CONNECTIONS, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(API_CONFIG.ENDPOINTS.GROUPS, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(API_CONFIG.ENDPOINTS.NOTIFICATIONS, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(API_CONFIG.ENDPOINTS.ACTIVITIES, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ]);

      const [connectionsData, groupsData, notificationsData, activitiesData] = await Promise.all([
        connectionsRes.json(),
        groupsRes.json(),
        notificationsRes.json(),
        activitiesRes.json()
      ]);

      setStats({
        connections: connectionsData.connections?.length || 0,
        groups: groupsData.groups?.length || 0,
        unreadNotifications: notificationsData.notifications?.filter((n: any) => !n.read).length || 0,
        weeklyActivity: activitiesData.activities?.length || 0
      });

      setRecentActivity(activitiesData.activities?.slice(0, DEFAULTS.LOADING_SKELETON_ITEMS) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return `p-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full`;
      case 'group_joined':
        return `p-2 ${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} rounded-full`;
      case 'message':
        return `p-2 ${UI_CONFIG.COLORS.PRIMARY.PURPLE[100]} rounded-full`;
      default:
        return `p-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} rounded-full`;
    }
  };

  const getActivityIconColor = (type: string) => {
    switch (type) {
      case 'connection_request':
        return UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT;
      case 'group_joined':
        return UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT;
      case 'message':
        return UI_CONFIG.COLORS.PRIMARY.PURPLE[600];
      default:
        return UI_CONFIG.COLORS.PRIMARY.GRAY[600];
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${UI_CONFIG.COLORS.GRADIENTS.BLUE_INDIGO} p-6`}>
        <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
          <div className={UI_CONFIG.ANIMATIONS.PULSE}>
            <div className={`h-8 ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded w-1/4 mb-6`}></div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
              {[...Array(4)].map((_, i) => (
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
      <div className={`${UI_CONFIG.SPACING.CONTAINER_MAX_WIDTH} mx-auto`}>
        {/* Header */}
        <div className={UI_CONFIG.SPACING.SECTION_MARGIN}>
          <h1 className={`text-3xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.TITLES.NETWORKING_DASHBOARD}</h1>
          <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>Connect with peers, join study groups, and build your learning network</p>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Connections</p>
                <p className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{stats.connections}</p>
              </div>
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full`}>
                <Users className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Study Groups</p>
                <p className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{stats.groups}</p>
              </div>
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} rounded-full`}>
                <MessageCircle className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`} />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Notifications</p>
                <p className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{stats.unreadNotifications}</p>
              </div>
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} rounded-full`}>
                <Bell className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`} />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>Weekly Activity</p>
                <p className={`text-2xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{stats.weeklyActivity}</p>
              </div>
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.PURPLE[100]} rounded-full`}>
                <TrendingUp className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.PURPLE[600]}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <Link href="/networking/discover" className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.HOVER_SHADOW}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full`}>
                <UserPlus className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{TEXT_CONFIG.TITLES.DISCOVER_PEERS}</h3>
                <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.DISCOVER_PEERS}</p>
              </div>
            </div>
          </Link>

          <Link href="/networking/groups" className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.HOVER_SHADOW}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} rounded-full`}>
                <MessageCircle className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{TEXT_CONFIG.TITLES.STUDY_GROUPS}</h3>
                <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.STUDY_GROUPS}</p>
              </div>
            </div>
          </Link>

          <Link href="/networking/connections" className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.HOVER_SHADOW}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 ${UI_CONFIG.COLORS.PRIMARY.PURPLE[100]} rounded-full`}>
                <Users className={`${UI_CONFIG.SIZES.ICON.LARGE} ${UI_CONFIG.COLORS.PRIMARY.PURPLE[600]}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>{TEXT_CONFIG.TITLES.MY_CONNECTIONS}</h3>
                <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.MY_NETWORK}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className={`bg-white rounded-lg shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
          <div className={`${UI_CONFIG.SPACING.CARD_PADDING} border-b ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]}`}>
            <h2 className={`text-xl font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>Recent Activity</h2>
          </div>
          <div className={UI_CONFIG.SPACING.CARD_PADDING}>
            {recentActivity.length > 0 ? (
              <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
                {recentActivity.map((activity) => (
                  <div key={activity.id} className={`flex items-start space-x-4 p-4 ${UI_CONFIG.COLORS.PRIMARY.GRAY[50]} rounded-lg`}>
                    <div className={`${getActivityIcon(activity.type)}`}>
                      <div className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${getActivityIconColor(activity.type)}`}>
                        {activity.type === 'connection_request' && <UserPlus />}
                        {activity.type === 'group_joined' && <Users />}
                        {activity.type === 'message' && <MessageCircle />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]}`}>
                        <span className="font-medium">{activity.user?.full_name || 'Someone'}</span> {activity.message}
                      </p>
                      <p className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]} mt-1`}>
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className={`h-12 w-12 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
                <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}