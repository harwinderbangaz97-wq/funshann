import React, { Component, ErrorInfo } from 'react';
import { ProfileView } from '../ProfileView';
import { User, Post, ThemeMode } from '../../types';
import { User as UserIcon, RefreshCw } from 'lucide-react';

interface ProfileErrorBoundaryProps {
  children: React.ReactNode;
  currentUser?: User;
}

interface ProfileErrorBoundaryState {
  hasError: boolean;
}

class ProfileErrorBoundary extends Component<ProfileErrorBoundaryProps, ProfileErrorBoundaryState> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ProfileErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ProfileTab ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-lg mx-auto p-6 flex flex-col items-center justify-center text-center pt-20">
          <div className="w-20 h-20 rounded-full neu-raised flex items-center justify-center mb-4 text-[#5B9DFF]">
            <UserIcon className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Unable to Load Profile</h3>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">
            There was a temporary problem displaying this profile. Tap below to reload.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 rounded-full neu-active-blue text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Profile</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProfileTabProps {
  currentUser: User;
  profileUser: User | null;
  userPosts: Post[];
  savedPosts: Post[];
  onOpenSettings: () => void;
  onOpenThemeStudio: () => void;
  onUpdateUser: (updated: Partial<User>) => void;
  theme: ThemeMode;
  onUpdateTheme: (theme: ThemeMode) => void;
  onShowToast: (msg: string) => void;
  onBack: () => void;
  onToggleFollow: (userId: string) => void;
  onOpenDirectChat: (user: User) => void;
  lockedChatUserIds: string[];
  onToggleLockChat: (userId: string) => void;
  onClearChat: (threadId: string) => void;
  allUsers?: User[];
  onUserClick?: (user: User) => void;
  onLike?: (postId: string) => void;
  onDislike?: (postId: string) => void;
  onReact?: (postId: string, reaction: 'like' | 'dislike') => void;
  onEmojiReact?: (postId: string, emoji: string) => void;
  onCommentClick?: (post: Post) => void;
  onShareClick?: (post: Post) => void;
  onOpenPost?: (post: Post) => void;
  onAddComment?: (postId: string, text: string) => void;
  onToggleSave?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onHidePost?: (postId: string) => void;
  onUpdateCaption?: (postId: string, newCaption: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = (props) => {
  return (
    <ProfileErrorBoundary currentUser={props.currentUser}>
      <ProfileView {...props} />
    </ProfileErrorBoundary>
  );
};
