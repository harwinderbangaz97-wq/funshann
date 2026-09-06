export interface SocialLink {
  id: string;
  platform:
    | 'whatsapp'
    | 'snapchat'
    | 'instagram'
    | 'twitter'
    | 'threads'
    | 'youtube'
    | 'tiktok'
    | 'spotify'
    | 'telegram'
    | 'discord'
    | 'pinterest'
    | 'github'
    | 'linkedin'
    | 'website';
  title?: string;
  url: string;
}

export interface User {
  id: string;
  uid?: string;
  name: string;
  displayName?: string;
  username: string;
  avatar: string;
  bio?: string;
  location?: string;
  website?: string;
  interests?: string[];
  socialLinks?: SocialLink[];
  birthday?: string;
  mobileNumber?: string;
  email?: string;
  usernameLastChangedAt?: string; // ISO string or timestamp
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'authenticator' | 'sms' | 'email';
  postsCount: number;
  followersCount: number;
  followingCount: number;
  following?: string[];
  followers?: string[];
  isVerified?: boolean;
  isFollowing?: boolean;
  isOnline?: boolean;
  status?: 'active' | 'suspended';
  role?: string;
  registrationDate?: string;
  authProvider?: string;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  mediaUrl: string;
  timestamp: string;
  createdAtMs?: number;
  isSeen: boolean;
  caption?: string;
  likesCount?: number;
  isLiked?: boolean;
  likedBy?: User[];
  viewsCount?: number;
  viewerIds?: string[];
  viewers?: User[];
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  text: string;
  timestamp: string;
  createdAtMs?: number;
  likesCount: number;
  isLiked?: boolean;
}

export interface PostReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  imageUrl: string;
  caption: string;
  timestamp: string;
  createdAtMs?: number;
  likesCount: number;
  dislikesCount?: number;
  commentsCount: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  userReaction?: 'like' | 'dislike' | null;
  likes?: string[];
  dislikes?: string[];
  isSaved?: boolean;
  isAutoRemoved?: boolean;
  comments: Comment[];
  location?: string;
  reactions?: PostReaction[];
  userEmojiReaction?: string | null;
}

export interface VoiceNoteData {
  audioUrl?: string;
  durationSeconds: number;
  waveform: number[];
  transcript?: string;
}

export type MessagePrivacyMode = 'normal' | 'immediate' | 'after_seen';

export type MessageReportReason =
  | 'spam'
  | 'harassment'
  | 'abuse'
  | 'inappropriate'
  | 'scam'
  | 'other';

export interface MessageReport {
  id: string;
  messageId: string;
  threadId: string;
  reportedUserId: string;
  reporterUserId: string; // Protected securely, never exposed to reported user
  reason: MessageReportReason;
  details?: string;
  timestamp: string;
  messageSnippet?: string;
  status: 'pending_review' | 'resolved' | 'dismissed';
}

export interface MessagePrivacySettings {
  defaultPrivacyMode: MessagePrivacyMode;
  immediateDurationSeconds: number; // e.g. 5 seconds
  afterSeenDurationSeconds: number; // e.g. 6 seconds
  confirmBeforeDelete: boolean;
  allowManualDelete: boolean;
  deleteImmediately?: boolean;
  deleteAfterSeen?: boolean;
  disappearingSeconds?: number;
  deleteAfterSeenDelay?: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  voiceNote?: VoiceNoteData;
  timestamp: string;
  isRead: boolean;
  isDelivered?: boolean;
  privacyMode?: MessagePrivacyMode;
  createdAt?: number;
  seenAt?: number;
  disappearingSeconds?: number;
  reactions?: MessageReaction[];
  isForwarded?: boolean;
  forwardedFrom?: string;
  senderName?: string;
}

export interface ChatThread {
  id: string;
  participant?: User;
  participantIds?: string[];
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupDescription?: string;
  groupMembers?: User[];
  groupAdminIds?: string[];
  lastMessage: {
    text?: string;
    imageUrl?: string;
    isVoice?: boolean;
    voiceDuration?: number;
    timestamp: string;
    isRead: boolean;
    senderId?: string;
    senderName?: string;
  };
  unreadCount: number;
  messages: Message[];
  isTyping?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'dislike' | 'comment' | 'follow' | 'mention' | 'message' | 'safety_removal' | 'story_like' | 'system';
  user: User;
  text: string;
  timestamp: string;
  createdAtMs?: number;
  read: boolean;
  postId?: string;
  chatUserId?: string;
  commentId?: string;
  targetUserId?: string;
  previewImage?: string;
}

export type TabType = 'home' | 'search' | 'upload' | 'chat' | 'profile';

export type SettingsSection =
  | 'main'
  // Account & Security
  | 'account_security'
  | 'username'
  | 'mobile'
  | 'email'
  | 'password'
  | 'two_factor'
  | 'saved_login'
  | 'my_reports'
  | 'account_status'
  | 'delete_account'
  | 'account_recovery'
  // App Settings & Appearance
  | 'theme'
  | 'appearance'
  | 'notifications'
  | 'language'
  // Profile & Privacy
  | 'public_profile'
  | 'privacy'
  | 'privacy_controls'
  | 'permissions'
  | 'contact_sync'
  | 'blocked_list'
  | 'who_can_contact'
  // Messages & Media
  | 'media'
  | 'clear_conversation'
  // Safety & Support
  | 'security'
  | 'safety_centre'
  | 'help_centre'
  | 'bugs_suggestions'
  | 'grievance'
  // Legal Documents
  | 'about'
  | 'more_info'
  | 'privacy_policy'
  | 'terms_of_service'
  | 'community_guidelines'
  | 'copyright_ip'
  | 'child_safety'
  | 'disclaimer'
  | 'app_disclaimer'
  | 'other_legal';

export interface PublicProfileSettings {
  showEmail: boolean;
  showPhone: boolean;
  showBirthday: boolean;
  showFollowersList: boolean;
  showLikedPosts: boolean;
  allowSearchIndexing: boolean;
}

export interface PrivacyControlsSettings {
  isPrivateAccount: boolean;
  whoCanMention: 'everyone' | 'following' | 'nobody';
  whoCanTag: 'everyone' | 'following' | 'nobody';
  allowStoryReshare: boolean;
  allowStoryReplies: 'everyone' | 'following' | 'nobody';
  showActivityIndicator: boolean;
  readReceiptsEnabled: boolean;
}

export interface WhoCanContactSettings {
  directMessages: 'everyone' | 'following' | 'nobody';
  voiceNotes: 'everyone' | 'following' | 'nobody';
  filterSpamRequests: boolean;
  allowGroupInvites: 'everyone' | 'following' | 'nobody';
}

export interface BlockedUserItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  blockedAt: string;
  reason?: string;
}

export interface UserReportItem {
  id: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUsername: string;
  category: 'spam' | 'harassment' | 'hate_speech' | 'inappropriate' | 'scam' | 'impersonation' | 'other';
  status: 'under_review' | 'resolved' | 'action_taken' | 'dismissed';
  submittedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  evidenceSnippet?: string;
}

export interface BugReportItem {
  id: string;
  type: 'bug' | 'suggestion' | 'performance';
  category: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  deviceInfo: string;
  submittedAt: string;
  status: 'submitted' | 'in_review' | 'fixed';
}

export type ThemeMode = 'light' | 'dark' | 'golden';

export type AppPermissionType = 'camera' | 'microphone' | 'location' | 'photos' | 'contacts' | 'notifications';
export type AppPermissionStatus = 'granted' | 'denied' | 'prompt' | 'limited';

export interface PermissionDefinition {
  id: AppPermissionType;
  name: string;
  shortName: string;
  iconName: 'Camera' | 'Mic' | 'MapPin' | 'Image' | 'Users' | 'Bell';
  explanation: string;
  detail: string;
  androidManifestName: string;
  isEssential: boolean;
  modernApproach: string;
}

export interface AppPermissionsState {
  camera: AppPermissionStatus;
  microphone: AppPermissionStatus;
  location: AppPermissionStatus;
  photos: AppPermissionStatus;
  contacts: AppPermissionStatus;
  notifications?: AppPermissionStatus;
}

export interface CustomThemeConfig {
  preset: ThemeMode;
  accentColor: string;
  accentName: string;
  depth: 'soft' | 'balanced' | 'deep';
  surfaceTone: 'porcelain' | 'champagne' | 'midnight';
  borderRadius: 'pill' | 'squircle' | 'minimal';
}
