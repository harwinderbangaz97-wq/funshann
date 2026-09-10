import React from 'react';
import { ProfileView } from '../components/ProfileView';
import { useUserPosts } from '../hooks/useUserPosts';
import { Post, User } from '../types';

interface ProfilePageProps {
  currentUser: User;
  profileUser?: User | null;
  savedPosts?: Post[];
  onUpdateUser?: (updated: Partial<User>) => void;
  onEditProfile?: () => void;
  onPostSelect?: (post: Post) => void;
  onUserClick?: (user: User) => void;
  onBack?: () => void;
  onToggleFollow?: (userId: string) => void;
  onToggleSave?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onShareClick?: (post: Post) => void;
  onDislike?: (postId: string) => void;
  onEmojiReact?: (postId: string, emoji: string) => void;
  onDeletePost?: (postId: string) => void;
  onCommentClick?: (post: Post) => void;
  onOpenSettings?: () => void;
}

export const Profile: React.FC<ProfilePageProps> = ({
  currentUser,
  profileUser,
  savedPosts = [],
  onUpdateUser = () => {},
  ...rest
}) => {
  const activeUser = currentUser;
  const targetId = profileUser?.id || activeUser?.id;
  const { posts: fetchedPosts } = useUserPosts(targetId);

  return (
    <ProfileView
      currentUser={currentUser}
      profileUser={profileUser}
      userPosts={fetchedPosts}
      savedPosts={savedPosts}
      onUpdateUser={onUpdateUser}
      {...rest}
    />
  );
};

export default Profile;
