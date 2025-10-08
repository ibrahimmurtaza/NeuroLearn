// =============================================
// PEER NETWORKING MODULE TYPES
// =============================================

// Base types for database entities
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';
export type ConnectionType = 'study_partner' | 'project_collaborator' | 'mentor' | 'mentee';
export type GroupPrivacyLevel = 'public' | 'private' | 'invite_only';
export type GroupRole = 'member' | 'moderator' | 'leader';
export type NotificationType = 
  | 'connection_request' 
  | 'connection_accepted' 
  | 'connection_rejected'
  | 'group_invitation'
  | 'group_activity'
  | 'group_joined'
  | 'group_left';

export type ActivityType = 
  | 'message_sent'
  | 'study_session'
  | 'file_shared'
  | 'collaboration'
  | 'member_joined'
  | 'member_left'
  | 'message_posted'
  | 'session_scheduled';

// =============================================
// DATABASE ENTITY TYPES
// =============================================

export interface Connection {
  id: number;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  connection_type: ConnectionType;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyGroup {
  id: number;
  name: string;
  description?: string;
  subject?: string;
  privacy_level: GroupPrivacyLevel;
  max_members: number;
  creator_id: string;
  invitation_code?: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMembership {
  group_id: number;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

export interface PeerNotification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  related_id?: number;
  related_user_id?: string;
  read_status: boolean;
  created_at: string;
}

export interface ConnectionActivity {
  id: number;
  connection_id: number;
  activity_type: ActivityType;
  description?: string;
  created_at: string;
}

export interface GroupActivity {
  id: number;
  group_id: number;
  user_id: string;
  activity_type: ActivityType;
  description?: string;
  created_at: string;
}

// =============================================
// EXTENDED TYPES WITH RELATIONS
// =============================================

export interface ConnectionWithUsers extends Connection {
  requester: UserProfile;
  receiver: UserProfile;
}

export interface StudyGroupWithMembers extends StudyGroup {
  creator: UserProfile;
  members: GroupMembershipWithUser[];
  member_count: number;
}

export interface GroupMembershipWithUser extends GroupMembership {
  user: UserProfile;
}

export interface PeerNotificationWithUser extends PeerNotification {
  related_user?: UserProfile;
}

export interface ConnectionActivityWithConnection extends ConnectionActivity {
  connection: ConnectionWithUsers;
}

export interface GroupActivityWithDetails extends GroupActivity {
  user: UserProfile;
  group: StudyGroup;
}

// =============================================
// USER PROFILE TYPES
// =============================================

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  subjects?: string[];
  learning_goals?: string[];
  study_preferences?: StudyPreferences;
  availability?: Availability;
  created_at: string;
  updated_at: string;
}

export interface StudyPreferences {
  preferred_study_times?: string[];
  study_style?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  group_size_preference?: 'small' | 'medium' | 'large';
  collaboration_style?: 'structured' | 'flexible' | 'independent';
}

export interface Availability {
  timezone?: string;
  weekly_schedule?: WeeklySchedule;
  preferred_duration?: number; // in minutes
}

export interface WeeklySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

// Connection Management
export interface CreateConnectionRequest {
  receiver_id: string;
  connection_type: ConnectionType;
  message?: string;
}

export interface UpdateConnectionRequest {
  status: ConnectionStatus;
}

export interface ConnectionsResponse {
  connections: ConnectionWithUsers[];
  total: number;
  page: number;
  limit: number;
}

// Study Groups
export interface CreateStudyGroupRequest {
  name: string;
  description?: string;
  subject?: string;
  privacy_level: GroupPrivacyLevel;
  max_members?: number;
}

export interface UpdateStudyGroupRequest {
  name?: string;
  description?: string;
  subject?: string;
  privacy_level?: GroupPrivacyLevel;
  max_members?: number;
}

export interface JoinGroupRequest {
  invitation_code?: string;
}

export interface StudyGroupsResponse {
  groups: StudyGroupWithMembers[];
  total: number;
  page: number;
  limit: number;
}

// Peer Discovery
export interface PeerSuggestion {
  user: UserProfile;
  compatibility_score: number;
  shared_interests: string[];
  shared_subjects: string[];
  match_reasons: string[];
  suggested_connection_type: ConnectionType;
}

export interface PeerDiscoveryFilters {
  subjects?: string[];
  interests?: string[];
  connection_type?: ConnectionType;
  availability_overlap?: boolean;
  min_compatibility_score?: number;
}

export interface PeerSuggestionsResponse {
  suggestions: PeerSuggestion[];
  total: number;
  page: number;
  limit: number;
}

// Notifications
export interface NotificationsResponse {
  notifications: PeerNotificationWithUser[];
  unread_count: number;
  total: number;
  page: number;
  limit: number;
}

export interface MarkNotificationReadRequest {
  notification_ids: number[];
}

// Activities
export interface ActivitiesResponse {
  activities: (ConnectionActivityWithConnection | GroupActivityWithDetails)[];
  total: number;
  page: number;
  limit: number;
}

// =============================================
// MATCHING ALGORITHM TYPES
// =============================================

export interface CompatibilityFactors {
  shared_interests_weight: number;
  shared_subjects_weight: number;
  study_style_compatibility: number;
  availability_overlap: number;
  learning_goals_alignment: number;
  experience_level_match: number;
}

export interface MatchingCriteria {
  user_id: string;
  filters?: PeerDiscoveryFilters;
  compatibility_factors?: Partial<CompatibilityFactors>;
  exclude_existing_connections?: boolean;
  max_suggestions?: number;
}

export interface CompatibilityScore {
  total_score: number;
  breakdown: {
    shared_interests: number;
    shared_subjects: number;
    study_style: number;
    availability: number;
    learning_goals: number;
    experience_level: number;
  };
}

// =============================================
// REAL-TIME TYPES
// =============================================

export interface RealtimeEvent {
  type: 'connection_request' | 'connection_accepted' | 'group_invitation' | 'new_message';
  payload: any;
  timestamp: string;
}

export interface PresenceData {
  user_id: string;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
  current_activity?: string;
}

// =============================================
// UI STATE TYPES
// =============================================

export interface NetworkingDashboardState {
  recent_connections: ConnectionWithUsers[];
  pending_requests: ConnectionWithUsers[];
  suggested_peers: PeerSuggestion[];
  recent_activities: (ConnectionActivityWithConnection | GroupActivityWithDetails)[];
  unread_notifications: number;
}

export interface PeerDiscoveryState {
  suggestions: PeerSuggestion[];
  filters: PeerDiscoveryFilters;
  loading: boolean;
  error?: string;
}

export interface ConnectionHubState {
  connections: ConnectionWithUsers[];
  pending_sent: ConnectionWithUsers[];
  pending_received: ConnectionWithUsers[];
  loading: boolean;
  error?: string;
}

export interface StudyGroupsState {
  my_groups: StudyGroupWithMembers[];
  public_groups: StudyGroupWithMembers[];
  loading: boolean;
  error?: string;
}

// =============================================
// FORM TYPES
// =============================================

export interface ConnectionRequestForm {
  receiver_id: string;
  connection_type: ConnectionType;
  message: string;
}

export interface StudyGroupForm {
  name: string;
  description: string;
  subject: string;
  privacy_level: GroupPrivacyLevel;
  max_members: number;
}

export interface ProfileUpdateForm {
  full_name: string;
  bio: string;
  interests: string[];
  subjects: string[];
  learning_goals: string[];
  study_preferences: StudyPreferences;
  availability: Availability;
}

// =============================================
// ERROR TYPES
// =============================================

export interface PeerNetworkingError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// =============================================
// UTILITY TYPES
// =============================================

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type SortParams = {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
};

export type FilterParams = {
  search?: string;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
};

export type QueryParams = PaginationParams & SortParams & FilterParams;