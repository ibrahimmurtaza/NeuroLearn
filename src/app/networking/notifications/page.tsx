'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Filter, Check, X, Users, MessageCircle, Calendar, UserPlus } from 'lucide-react';
import { 
  API_CONFIG, 
  UI_CONFIG, 
  TEXT_CONFIG, 
  DEFAULTS 
} from '@/config/networking';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface FilterState {
  type: string;
  readStatus: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: '',
    readStatus: ''
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filters]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_CONFIG.ENDPOINTS.NOTIFICATIONS);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = notifications;

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(notification => notification.type === filters.type);
    }

    // Read status filter
    if (filters.readStatus === 'read') {
      filtered = filtered.filter(notification => notification.read);
    } else if (filters.readStatus === 'unread') {
      filtered = filtered.filter(notification => !notification.read);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
        method: API_CONFIG.METHODS.PATCH,
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/mark-all-read`, {
        method: API_CONFIG.METHODS.PATCH,
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}/${notificationId}`, {
        method: API_CONFIG.METHODS.DELETE,
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.filter(notification => notification.id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />;
      case 'connection_accepted':
        return <Users className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`} />;
      case 'group_invitation':
        return <MessageCircle className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.PURPLE[600]}`} />;
      case 'group_joined':
        return <Users className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT}`} />;
      case 'message':
        return <MessageCircle className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`} />;
      case 'study_session':
        return <Calendar className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.ORANGE[600]}`} />;
      default:
        return <Bell className={`${UI_CONFIG.SIZES.ICON.MEDIUM} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`} />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'connection_request':
        return TEXT_CONFIG.NOTIFICATION_TYPES.CONNECTION_REQUEST;
      case 'connection_accepted':
        return TEXT_CONFIG.NOTIFICATION_TYPES.CONNECTION_ACCEPTED;
      case 'group_invitation':
        return TEXT_CONFIG.NOTIFICATION_TYPES.GROUP_INVITATION;
      case 'group_joined':
        return TEXT_CONFIG.NOTIFICATION_TYPES.GROUP_JOINED;
      case 'message':
        return TEXT_CONFIG.NOTIFICATION_TYPES.MESSAGE;
      case 'study_session':
        return TEXT_CONFIG.NOTIFICATION_TYPES.STUDY_SESSION;
      default:
        return type;
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
                <div key={i} className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} h-20`}></div>
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
        <div className={`flex items-center justify-between ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div>
            <h1 className={`text-3xl font-bold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>{TEXT_CONFIG.TITLES.NOTIFICATIONS}</h1>
            <p className={UI_CONFIG.COLORS.PRIMARY.GRAY[600]}>{TEXT_CONFIG.DESCRIPTIONS.NOTIFICATIONS}</p>
          </div>
          <button
            onClick={markAllAsRead}
            className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]}`}
          >
            {TEXT_CONFIG.ACTIONS.MARK_ALL_READ}
          </button>
        </div>

        {/* Filters */}
        <div className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.SPACING.SECTION_MARGIN}`}>
          <div className="flex flex-col lg:flex-row gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GRAY_200}`}
            >
              <Filter className={UI_CONFIG.SIZES.ICON.SMALL} />
              <span>{TEXT_CONFIG.LABELS.FILTER_NOTIFICATIONS}</span>
            </button>

            {showFilters && (
              <div className="flex flex-col lg:flex-row gap-4 lg:ml-4">
                {/* Notification Type Filter */}
                <div>
                  <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-2`}>
                    {TEXT_CONFIG.LABELS.NOTIFICATION_TYPE}
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className={`px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">{TEXT_CONFIG.OPTIONS.ALL_TYPES}</option>
                    <option value="connection_request">{TEXT_CONFIG.NOTIFICATION_TYPES.CONNECTION_REQUEST}</option>
                    <option value="connection_accepted">{TEXT_CONFIG.NOTIFICATION_TYPES.CONNECTION_ACCEPTED}</option>
                    <option value="group_invitation">{TEXT_CONFIG.NOTIFICATION_TYPES.GROUP_INVITATION}</option>
                    <option value="group_joined">{TEXT_CONFIG.NOTIFICATION_TYPES.GROUP_JOINED}</option>
                    <option value="message">{TEXT_CONFIG.NOTIFICATION_TYPES.MESSAGE}</option>
                    <option value="study_session">{TEXT_CONFIG.NOTIFICATION_TYPES.STUDY_SESSION}</option>
                  </select>
                </div>

                {/* Read Status Filter */}
                <div>
                  <label className={`block text-sm font-medium ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} mb-2`}>
                    {TEXT_CONFIG.LABELS.READ_STATUS}
                  </label>
                  <select
                    value={filters.readStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, readStatus: e.target.value }))}
                    className={`px-3 py-2 border ${UI_CONFIG.COLORS.PRIMARY.GRAY[300]} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">{TEXT_CONFIG.OPTIONS.ALL_STATUS}</option>
                    <option value="unread">{TEXT_CONFIG.OPTIONS.UNREAD}</option>
                    <option value="read">{TEXT_CONFIG.OPTIONS.READ}</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({ type: '', readStatus: '' })}
                    className={`px-4 py-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[700]} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GRAY_200}`}
                  >
                    {TEXT_CONFIG.ACTIONS.CLEAR_FILTERS}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className={UI_CONFIG.SPACING.ITEM_SPACING}>
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg ${UI_CONFIG.SPACING.CARD_PADDING} shadow-sm border ${UI_CONFIG.COLORS.PRIMARY.GRAY[200]} ${UI_CONFIG.ANIMATIONS.HOVER_SHADOW} ${
                !notification.read ? `border-l-4 border-l-${UI_CONFIG.COLORS.PRIMARY.BLUE[500]}` : ''
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} rounded-full flex-shrink-0`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} ${!notification.read ? 'font-bold' : ''}`}>
                        {notification.title}
                      </h3>
                      <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-sm mt-1`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`text-xs ${UI_CONFIG.COLORS.PRIMARY.GRAY[500]}`}>
                          {new Date(notification.created_at).toLocaleDateString()} at{' '}
                          {new Date(notification.created_at).toLocaleTimeString()}
                        </span>
                        <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.GRAY[100]} ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} text-xs rounded-full`}>
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        {!notification.read && (
                          <span className={`px-2 py-1 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} ${UI_CONFIG.COLORS.PRIMARY.BLUE[800]} text-xs rounded-full`}>
                            {TEXT_CONFIG.LABELS.UNREAD}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.GREEN[100]} ${UI_CONFIG.COLORS.PRIMARY.GREEN.TEXT} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_GREEN_200}`}
                          title={TEXT_CONFIG.ACTIONS.MARK_AS_READ}
                        >
                          <Check className={UI_CONFIG.SIZES.ICON.SMALL} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className={`p-2 ${UI_CONFIG.COLORS.PRIMARY.RED[100]} ${UI_CONFIG.COLORS.PRIMARY.RED.TEXT} rounded-lg ${UI_CONFIG.ANIMATIONS.HOVER_RED_200}`}
                        title={TEXT_CONFIG.ACTIONS.DELETE}
                      >
                        <X className={UI_CONFIG.SIZES.ICON.SMALL} />
                      </button>
                    </div>
                  </div>

                  {/* Sender Info */}
                  {notification.sender && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t ${UI_CONFIG.COLORS.BORDERS.GRAY_100}`}>
                      <div className={`w-6 h-6 ${UI_CONFIG.COLORS.PRIMARY.BLUE[100]} rounded-full flex items-center justify-center`}>
                        {notification.sender.avatar_url ? (
                          <img
                            src={notification.sender.avatar_url}
                            alt={notification.sender.full_name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className={`text-xs font-semibold ${UI_CONFIG.COLORS.PRIMARY.BLUE.TEXT}`}>
                            {notification.sender.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className={`text-sm ${UI_CONFIG.COLORS.PRIMARY.GRAY[600]}`}>
                        {TEXT_CONFIG.LABELS.FROM} {notification.sender.full_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && !loading && (
          <div className="text-center py-12">
            <Bell className={`h-16 w-16 ${UI_CONFIG.COLORS.PRIMARY.GRAY[400]} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${UI_CONFIG.COLORS.PRIMARY.GRAY[900]} mb-2`}>
              {TEXT_CONFIG.MESSAGES.NO_NOTIFICATIONS}
            </h3>
            <p className={`${UI_CONFIG.COLORS.PRIMARY.GRAY[600]} mb-6`}>
              {TEXT_CONFIG.MESSAGES.NO_NOTIFICATIONS_DESCRIPTION}
            </p>
            <button
              onClick={() => setFilters({ type: '', readStatus: '' })}
              className={`px-6 py-3 ${UI_CONFIG.COLORS.PRIMARY.BLUE[600]} text-white rounded-lg hover:${UI_CONFIG.COLORS.PRIMARY.BLUE[700]}`}
            >
              {TEXT_CONFIG.ACTIONS.CLEAR_FILTERS}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}