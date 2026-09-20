import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Edit3,
  Grid,
  List,
  Bookmark,
  MapPin,
  Link as LinkIcon,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Sun,
  Moon,
  Sparkles,
  Palette,
  ExternalLink,
  Instagram,
  Twitter,
  Youtube,
  Github,
  Linkedin,
  Ghost,
  PhoneCall,
  Send,
  Gamepad2,
  Pin,
  Music,
  Disc,
  MessageSquare,
  Globe,
  Tag,
  AtSign,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Share2,
  MoreVertical,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post, ThemeMode, SocialLink } from '../types';
import { EditProfileModal } from './EditProfileModal';
import { IndividualUserMenu } from './IndividualUserMenu';
import { FeedCard } from './FeedCard';
import { useNavigation } from '../context/NavigationContext';
import {
  DEFAULT_AVATAR,
  auth,
  getFollowersListForUser,
  getFollowingListForUser,
  getUserFollowersFromFirestore,
  getUserFollowingsFromFirestore,
  getUserPostsCountFromFirestore,
  getUserPostsFromFirestore,
  getUserProfileFromFirestore,
  isPostByUserId,
  subscribeToFollows,
  subscribeToUser,
  subscribeToUserPosts,
} from '../services/firebase';

interface ProfileViewProps {
  currentUser: User;
  profileUser?: User | null;
  userPosts: Post[];
  savedPosts: Post[];
  onUpdateUser: (updated: Partial<User>) => void;
  onPostSelect?: (post: Post) => void;
  onOpenSettings?: () => void;
  onOpenThemeStudio?: () => void;
  theme?: ThemeMode;
  onUpdateTheme?: (theme: ThemeMode) => void;
  onShowToast?: (msg: string) => void;
  onBack?: () => void;
  onToggleFollow?: (userId: string) => void;
  onOpenDirectChat?: (user: User) => void;
  lockedChatUserIds?: string[];
  onToggleLockChat?: (userId: string) => void;
  onClearChat?: (userId: string) => void;
  allUsers?: User[];
  onUserClick?: (user: User) => void;
  // Post interactive action callbacks
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

const getSocialIcon = (platform?: SocialLink['platform'] | string) => {
  if (!platform) return Globe;
  switch (platform) {
    case 'whatsapp':
      return PhoneCall;
    case 'snapchat':
      return Ghost;
    case 'instagram':
      return Instagram;
    case 'twitter':
      return Twitter;
    case 'threads':
      return AtSign;
    case 'youtube':
      return Youtube;
    case 'tiktok':
      return Music;
    case 'spotify':
      return Disc;
    case 'telegram':
      return Send;
    case 'discord':
      return Gamepad2;
    case 'pinterest':
      return Pin;
    case 'github':
      return Github;
    case 'linkedin':
      return Linkedin;
    default:
      return Globe;
  }
};

const ProfileViewComponent: React.FC<ProfileViewProps> = ({
  currentUser,
  profileUser,
  userPosts,
  savedPosts,
  onUpdateUser,
  onPostSelect,
  onOpenSettings,
  onOpenThemeStudio,
  theme = 'light',
  onUpdateTheme,
  onShowToast,
  onBack,
  onToggleFollow,
  onOpenDirectChat,
  lockedChatUserIds = [],
  onToggleLockChat,
  onClearChat,
  allUsers = [],
  onUserClick,
  onLike,
  onDislike,
  onReact,
  onEmojiReact,
  onCommentClick,
  onShareClick,
  onOpenPost,
  onAddComment,
  onToggleSave,
  onDeletePost,
  onHidePost,
  onUpdateCaption,
}) => {
  const {
    navState,
    setIsEditProfileOpen,
    openPostPreview,
    closePostPreview,
    openComments,
    openShareSheet,
  } = useNavigation();
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'saved'>('posts');
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [isIndividualMenuOpen, setIsIndividualMenuOpen] = useState(false);
  const postGridRef = useRef<HTMLDivElement | null>(null);
  const isEditModalOpen = navState.isEditProfileOpen;
  const selectedPreviewPost = navState.previewPost;

  const activeUser = currentUser;
  const isTargetingOtherUser = Boolean(profileUser && (!activeUser?.id || profileUser.id !== activeUser.id));

  // Live target user profile state when viewing another user's profile
  const [liveTargetProfileUser, setLiveTargetProfileUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isTargetingOtherUser || !profileUser?.id) {
      setLiveTargetProfileUser(null);
      return;
    }
    let isMounted = true;
    const targetUid = profileUser.id;

    getUserProfileFromFirestore(targetUid)
      .then((remoteUser) => {
        if (isMounted && remoteUser) {
          setLiveTargetProfileUser(remoteUser);
        }
      })
      .catch(console.warn);

    const unsub = subscribeToUser(targetUid, (remoteUser) => {
      if (isMounted && remoteUser) {
        setLiveTargetProfileUser(remoteUser);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [isTargetingOtherUser, profileUser?.id]);

  const targetUserRecord = isTargetingOtherUser
    ? (liveTargetProfileUser || profileUser)
    : (profileUser || activeUser);

  const currentAuthUser = auth.currentUser;
  const isTargetAuthUser = !isTargetingOtherUser && Boolean(
    currentAuthUser &&
    ((targetUserRecord?.id && targetUserRecord.id === currentAuthUser.uid) ||
     (activeUser?.id && activeUser.id === currentAuthUser.uid))
  );
  const authFallbackName = (isTargetAuthUser && currentAuthUser?.displayName) || (isTargetAuthUser && currentAuthUser?.email ? currentAuthUser.email.split('@')[0] : '');
  const authFallbackAvatar = (isTargetAuthUser && currentAuthUser?.photoURL) || '';

  const displayedUser: User = isTargetingOtherUser
    ? {
        id: targetUserRecord?.id || 'target_user_fallback',
        name: (targetUserRecord?.name && targetUserRecord.name !== 'Funshann Member' && targetUserRecord.name.trim())
          || (targetUserRecord?.displayName && targetUserRecord.displayName !== 'Funshann Member' && targetUserRecord.displayName.trim())
          || (targetUserRecord?.email ? targetUserRecord.email.split('@')[0] : '')
          || targetUserRecord?.username
          || 'User',
        username: targetUserRecord?.username || 'user',
        avatar: (targetUserRecord?.avatar && targetUserRecord.avatar !== DEFAULT_AVATAR && targetUserRecord.avatar.trim())
          || ((targetUserRecord as any)?.photoURL && (targetUserRecord as any).photoURL !== DEFAULT_AVATAR && (targetUserRecord as any).photoURL.trim())
          || DEFAULT_AVATAR,
        bio: targetUserRecord?.bio || '',
        website: targetUserRecord?.website || '',
        location: targetUserRecord?.location || '',
        interests: Array.isArray(targetUserRecord?.interests) ? targetUserRecord.interests : [],
        socialLinks: Array.isArray(targetUserRecord?.socialLinks) ? targetUserRecord.socialLinks : [],
        postsCount: targetUserRecord?.postsCount ?? 0,
        followersCount: targetUserRecord?.followersCount ?? 0,
        followingCount: targetUserRecord?.followingCount ?? 0,
        isVerified: Boolean(targetUserRecord?.isVerified),
        isFollowing: Boolean(targetUserRecord?.isFollowing),
      }
    : {
        id: activeUser?.id || (isTargetAuthUser && currentAuthUser ? currentAuthUser.uid : 'user_fallback'),
        name: (targetUserRecord?.name && targetUserRecord.name !== 'Funshann Member' && targetUserRecord.name.trim())
          || (activeUser?.name && activeUser.name !== 'Funshann Member' && activeUser.name.trim())
          || authFallbackName
          || (targetUserRecord?.email ? targetUserRecord.email.split('@')[0] : '')
          || 'User',
        username: targetUserRecord?.username || activeUser?.username || 'user',
        avatar: (targetUserRecord?.avatar && targetUserRecord.avatar !== DEFAULT_AVATAR && targetUserRecord.avatar.trim())
          || (activeUser?.avatar && activeUser.avatar !== DEFAULT_AVATAR && activeUser.avatar.trim())
          || authFallbackAvatar
          || DEFAULT_AVATAR,
        bio: targetUserRecord?.bio || activeUser?.bio || '',
        website: targetUserRecord?.website || activeUser?.website || '',
        location: targetUserRecord?.location || activeUser?.location || '',
        interests: Array.isArray(targetUserRecord?.interests) ? targetUserRecord.interests : (activeUser?.interests || []),
        socialLinks: Array.isArray(targetUserRecord?.socialLinks) ? targetUserRecord.socialLinks : (activeUser?.socialLinks || []),
        postsCount: targetUserRecord?.postsCount ?? activeUser?.postsCount ?? 0,
        followersCount: targetUserRecord?.followersCount ?? activeUser?.followersCount ?? 0,
        followingCount: targetUserRecord?.followingCount ?? activeUser?.followingCount ?? 0,
        isVerified: Boolean(targetUserRecord?.isVerified || activeUser?.isVerified),
        isFollowing: Boolean(targetUserRecord?.isFollowing),
      };

  // User is viewing their own profile only if not targeting another user and target id matches active user id
  const isOwnProfile = !isTargetingOtherUser && (!profileUser || Boolean(
    activeUser?.id && (displayedUser.id === activeUser.id || displayedUser.id === 'user_fallback' || !displayedUser.id)
  ));

  const isFollowing = !isOwnProfile && currentUser
    ? (Array.isArray(currentUser.following) && currentUser.following.includes(displayedUser.id) || Boolean(displayedUser.isFollowing))
    : Boolean(displayedUser.isFollowing);
  const isUserLocked = Array.isArray(lockedChatUserIds) ? lockedChatUserIds.includes(displayedUser.id) : false;
  const userAvatar = displayedUser.avatar || DEFAULT_AVATAR;

  // Fetch Followers / Following from Firestore for the target profile user
  const targetProfileUserId = isTargetingOtherUser
    ? (profileUser?.id || displayedUser.id)
    : (displayedUser.id && displayedUser.id !== 'user_fallback' ? displayedUser.id : (currentUser?.id || ''));

  const [realPostsCount, setRealPostsCount] = useState<number>(() => {
    return Array.isArray(userPosts) ? userPosts.length : (displayedUser.postsCount ?? 0);
  });

  const [realFollowersCount, setRealFollowersCount] = useState<number>(() => displayedUser.followersCount ?? 0);
  const [realFollowingCount, setRealFollowingCount] = useState<number>(() => displayedUser.followingCount ?? 0);

  useEffect(() => {
    // Synchronize initial counts whenever target profile user ID changes
    setRealPostsCount(Array.isArray(userPosts) ? userPosts.length : (displayedUser.postsCount ?? 0));
    setRealFollowersCount(displayedUser.followersCount ?? 0);
    setRealFollowingCount(displayedUser.followingCount ?? 0);
  }, [targetProfileUserId]);

  const [listModalType, setListModalType] = useState<'followers' | 'following' | null>(null);
  const listModalTypeRef = useRef<'followers' | 'following' | null>(null);
  listModalTypeRef.current = listModalType;
  const [modalUsers, setModalUsers] = useState<User[]>([]);
  const [isLoadingModalUsers, setIsLoadingModalUsers] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetProfileUserId || targetProfileUserId === 'user_fallback') return;
    let isMounted = true;

    // Fetch genuine Firestore post count for this user
    getUserPostsCountFromFirestore(targetProfileUserId)
      .then((count) => {
        if (isMounted && typeof count === 'number') {
          setRealPostsCount(count);
        }
      })
      .catch(console.warn);

    // Direct Firestore fetch using followingUid/followingId and followerUid/followerId
    getUserFollowingsFromFirestore(targetProfileUserId)
      .then((followingList) => {
        if (isMounted && Array.isArray(followingList)) {
          setRealFollowingCount(followingList.length);
        }
      })
      .catch(console.warn);

    getUserFollowersFromFirestore(targetProfileUserId)
      .then((followersList) => {
        if (isMounted && Array.isArray(followersList)) {
          setRealFollowersCount(followersList.length);
        }
      })
      .catch(console.warn);

    // Live subscription to keep counts updating dynamically when follows are added/removed
    const unsubscribe = subscribeToFollows((records) => {
      if (!isMounted || !Array.isArray(records)) return;
      const followings = new Set(
        records
          .filter((f) => f && (f.followerId === targetProfileUserId || f.followerUid === targetProfileUserId) && f.followingId !== targetProfileUserId && f.followingUid !== targetProfileUserId)
          .map((f) => f.followingId || f.followingUid)
      );
      const followers = new Set(
        records
          .filter((f) => f && (f.followingId === targetProfileUserId || f.followingUid === targetProfileUserId) && f.followerId !== targetProfileUserId && f.followerUid !== targetProfileUserId)
          .map((f) => f.followerId || f.followerUid)
      );
      setRealFollowingCount(followings.size);
      setRealFollowersCount(followers.size);

      // If the list modal is currently open, refresh the modal users in real-time
      if (listModalTypeRef.current === 'followers') {
        getFollowersListForUser(targetProfileUserId, allUsers)
          .then((res) => { if (isMounted) setModalUsers(res); })
          .catch(console.warn);
      } else if (listModalTypeRef.current === 'following') {
        getFollowingListForUser(targetProfileUserId, allUsers)
          .then((res) => { if (isMounted) setModalUsers(res); })
          .catch(console.warn);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetProfileUserId, allUsers]);

  useEffect(() => {
    if (!listModalType || !targetProfileUserId) {
      setModalUsers([]);
      setIsLoadingModalUsers(false);
      setModalError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingModalUsers(true);
    setModalError(null);

    const fetchFollowList = async () => {
      try {
        let results: User[] = [];
        if (listModalType === 'followers') {
          results = await getFollowersListForUser(targetProfileUserId, allUsers);
        } else if (listModalType === 'following') {
          results = await getFollowingListForUser(targetProfileUserId, allUsers);
        }
        if (isMounted) {
          setModalUsers(results);
          setModalError(null);
        }
      } catch (err: any) {
        console.warn('Error fetching followers/following list:', err);
        if (isMounted) {
          setModalUsers([]);
          setModalError(err?.message || 'Failed to load list. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingModalUsers(false);
        }
      }
    };

    fetchFollowList();

    return () => {
      isMounted = false;
    };
  }, [listModalType, targetProfileUserId, allUsers]);

  // Ensure main document & body scrolling is never locked when viewing profile
  useEffect(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Manage body scroll lock specifically while Followers / Following modal is open
  useEffect(() => {
    if (listModalType) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [listModalType]);

  const [internalUserPosts, setInternalUserPosts] = useState<Post[]>(() => {
    if (!Array.isArray(userPosts)) return [];
    return isTargetingOtherUser
      ? userPosts.filter((p): p is Post => Boolean(p && p.id && isPostByUserId(p, targetProfileUserId)))
      : userPosts.filter((p): p is Post => Boolean(p && p.id));
  });

  useEffect(() => {
    if (Array.isArray(userPosts)) {
      setInternalUserPosts((prev) => {
        const map = new Map<string, Post>();
        // Only keep posts belonging strictly to target user if viewing another user's profile
        prev.forEach((p) => {
          if (!isTargetingOtherUser || isPostByUserId(p, targetProfileUserId)) {
            map.set(p.id, p);
          }
        });
        userPosts.forEach((p) => {
          if (p && p.id) {
            if (!isTargetingOtherUser || isPostByUserId(p, targetProfileUserId)) {
              map.set(p.id, p);
            }
          }
        });
        const list = Array.from(map.values());
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        return list;
      });
    }
  }, [userPosts, isTargetingOtherUser, targetProfileUserId]);

  useEffect(() => {
    if (!targetProfileUserId || targetProfileUserId === 'user_fallback' || targetProfileUserId === 'target_user_fallback') return;
    let isMounted = true;

    // Fetch posts directly from Firestore to ensure immediate display for User B
    getUserPostsFromFirestore(targetProfileUserId)
      .then((fetchedPosts) => {
        if (isMounted && Array.isArray(fetchedPosts)) {
          setInternalUserPosts(fetchedPosts);
          setRealPostsCount(fetchedPosts.length);
        }
      })
      .catch(console.warn);

    const unsub = subscribeToUserPosts(targetProfileUserId, (livePosts) => {
      if (isMounted) {
        setInternalUserPosts(livePosts);
        setRealPostsCount(livePosts.length);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [targetProfileUserId]);

  const strictlyFilteredPropPosts = Array.isArray(userPosts)
    ? (isTargetingOtherUser
        ? userPosts.filter((p): p is Post => Boolean(p && p.id && isPostByUserId(p, targetProfileUserId)))
        : userPosts.filter((p): p is Post => Boolean(p && p.id)))
    : [];

  const safeUserPosts = internalUserPosts.length > 0
    ? (isTargetingOtherUser
        ? internalUserPosts.filter((p) => isPostByUserId(p, targetProfileUserId))
        : internalUserPosts)
    : strictlyFilteredPropPosts;
  const safeSavedPosts = Array.isArray(savedPosts) ? savedPosts.filter((p): p is Post => Boolean(p && p.id)) : [];
  const displayPosts = isOwnProfile
    ? activeSubTab === 'posts'
      ? safeUserPosts
      : safeSavedPosts
    : safeUserPosts;

  const effectivePostsCount = safeUserPosts.length > 0
    ? safeUserPosts.length
    : realPostsCount;

  const handleShareProfile = async () => {
    const profileUrl = `https://funshann.blogspot.com/#user-${displayedUser.username}`;
    const shareData = {
      title: 'Funshann',
      text: `Check out @${displayedUser.username}'s profile on Funshann!`,
      url: profileUrl,
    };

    // 1. Web Native Share API (mobile system share sheet)
    if (typeof navigator !== 'undefined' && navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return; // User cancelled share dialog
        }
        console.warn('Native share error, falling back to clipboard:', err);
      }
    }

    // 2. Clipboard copy fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (onShowToast) {
        onShowToast(`@${displayedUser.username}'s profile link copied! 📋`);
      }
    } catch {
      if (onShowToast) {
        onShowToast(`@${displayedUser.username}'s profile link copied! 📋`);
      }
    }
  };

  const handlePostLikeClick = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (onReact) {
      onReact(postId, 'like');
    } else if (onLike) {
      onLike(postId);
    }
  };

  const handlePostDislikeClick = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    if (onReact) {
      onReact(postId, 'dislike');
    } else if (onDislike) {
      onDislike(postId);
    }
  };

  const handlePostCommentClick = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(post);
    } else {
      openComments(post);
    }
  };

  const handlePostShareClick = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    if (onShareClick) {
      onShareClick(post);
    } else {
      openShareSheet(post);
    }
  };

  return (
    <div
      id="profile-view-wrapper"
      className="w-full max-w-lg mx-auto px-4 pb-36 pt-2 overflow-y-auto"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Top Header Bar when viewing another user's profile */}
      {!isOwnProfile && (
        <div className="flex items-center justify-between mb-3 px-1">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              document.body.style.overflow = '';
              document.documentElement.style.overflow = '';
              if (onBack) onBack();
            }}
            className="h-9 px-3.5 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-[#5B9DFF] flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </motion.button>

          <div className="text-center">
            <span className="text-xs font-bold text-slate-800 tracking-tight block">
              {displayedUser.name}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              @{displayedUser.username}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleShareProfile}
              aria-label="Share profile"
              className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-600 hover:text-[#5B9DFF] transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsIndividualMenuOpen(true)}
              aria-label="User settings"
              className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-600 hover:text-[#5B9DFF] transition cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="neu-flat rounded-[28px] p-5 sm:p-6 mb-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          {/* Raised 3D Circular Avatar - Clearly larger & visually balanced */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full neu-raised p-1.5 shrink-0 self-start sm:self-center">
            <img
              src={userAvatar}
              alt={displayedUser.name || 'User'}
              loading="lazy"
              decoding="async"
              className="w-full h-full rounded-full object-cover shadow-xs"
            />
            {displayedUser.isVerified && (
              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 border-white dark:border-slate-800 flex items-center justify-center"
                title="Verified User"
              >
                <CheckCircle2 className="w-5 h-5 text-[#5B9DFF] fill-[#5B9DFF]/20" />
              </div>
            )}
          </div>

          {/* Action Buttons - Spacious, balanced, responsive */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            {isOwnProfile ? (
              <>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsEditProfileOpen(true)}
                  className="h-11 px-5 rounded-full neu-raised text-[13.5px] font-bold text-slate-700 hover:text-[#5B9DFF] flex items-center justify-center gap-2 transition-colors cursor-pointer flex-1 sm:flex-initial"
                >
                  <Edit3 className="w-4 h-4 text-[#5B9DFF]" />
                  <span>Edit Profile</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleShareProfile}
                  aria-label="Share Profile"
                  title="Share Profile"
                  className="w-11 h-11 rounded-full neu-raised flex items-center justify-center text-slate-600 hover:text-[#5B9DFF] transition-colors cursor-pointer shrink-0"
                >
                  <Share2 className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={onOpenSettings}
                  aria-label="Settings"
                  className="w-11 h-11 rounded-full neu-raised flex items-center justify-center text-slate-600 hover:text-[#5B9DFF] transition-colors cursor-pointer shrink-0"
                >
                  <Settings className="w-5 h-5" />
                </motion.button>
              </>
            ) : (
              <>
                {/* Follow / Following Button */}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onToggleFollow && onToggleFollow(displayedUser.id)}
                  className={`h-11 px-5 rounded-full text-[13.5px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial shadow-sm ${
                    isFollowing
                      ? 'neu-inset text-slate-600 border border-slate-200/80'
                      : 'neu-active-blue text-white shadow-md'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4.5 h-4.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4.5 h-4.5" />
                      <span>Follow</span>
                    </>
                  )}
                </motion.button>

                {/* Direct Message Button */}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onOpenDirectChat && onOpenDirectChat(displayedUser)}
                  className="h-11 px-5 rounded-full neu-raised flex items-center justify-center gap-2 text-[13.5px] font-bold text-slate-700 hover:text-[#5B9DFF] transition cursor-pointer flex-1 sm:flex-initial shadow-sm"
                >
                  <MessageSquare className="w-4.5 h-4.5 text-[#5B9DFF]" />
                  <span>Message</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="space-y-1.5 mb-3.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">
              {displayedUser.name}
            </h2>
          </div>
          <p className="text-[13.5px] font-semibold text-[#5B9DFF]">
            @{displayedUser.username}
          </p>
          {displayedUser.bio && (
            <p className="text-[13.5px] text-slate-600 leading-relaxed pt-0.5">
              {displayedUser.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3.5 text-[13px] text-slate-500 pt-1">
            {displayedUser.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#5B9DFF]" />
                {displayedUser.location}
              </span>
            )}
            {displayedUser.website && typeof displayedUser.website === 'string' && (
              <a
                href={
                  displayedUser.website.startsWith('http')
                    ? displayedUser.website
                    : `https://${displayedUser.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#5B9DFF] font-semibold hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                <span>{displayedUser.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
        </div>

        {/* User Interests / Passions Tags */}
        {Array.isArray(displayedUser.interests) && displayedUser.interests.length > 0 && (
          <div className="mb-3.5 pt-2 border-t border-slate-100/80">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-[#5B9DFF]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Interests & Passions
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedUser.interests.filter(Boolean).map((tag, idx) => {
                const cleanTag = String(tag).replace(/^#+/, '');
                return (
                  <span
                    key={`${cleanTag}-${idx}`}
                    className="px-3 py-1 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-[#5B9DFF] transition-colors"
                  >
                    {cleanTag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected Social Media Links - Icon Only */}
        {Array.isArray(displayedUser.socialLinks) && displayedUser.socialLinks.length > 0 && (
          <div className="mb-3.5 pt-2 border-t border-slate-100/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#5B9DFF]" />
                Connected Channels
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                {displayedUser.socialLinks.length} active
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {displayedUser.socialLinks.filter(Boolean).map((link, idx) => {
                const Icon = getSocialIcon(link?.platform);
                return (
                  <motion.a
                    key={link?.id || `social-${idx}`}
                    href={link?.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    title={link?.title || link?.platform || 'Social Link'}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] hover:border-[#5B9DFF]/50 transition group shadow-xs cursor-pointer"
                  >
                    <Icon className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                  </motion.a>
                );
              })}
            </div>
          </div>
        )}

        {/* 3D Neumorphic Statistics Counters */}
        <div ref={postGridRef} className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 max-w-[370px] mx-auto w-full">
          <div
            onClick={() => postGridRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="neu-inset rounded-[15px] py-1.5 px-2 text-center cursor-pointer hover:bg-slate-50 transition active:scale-95"
            title="View posts"
          >
            <span className="block text-[16.5px] font-extrabold text-slate-800 font-['Outfit'] leading-tight">
              {effectivePostsCount}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
              Posts
            </span>
          </div>

          <div
            onClick={() => setListModalType('followers')}
            className="neu-inset rounded-[15px] py-1.5 px-2 text-center cursor-pointer hover:bg-slate-50 transition active:scale-95"
            title="View followers"
          >
            <span className="block text-[16.5px] font-extrabold text-slate-800 font-['Outfit'] leading-tight">
              {realFollowersCount > 999
                ? `${(realFollowersCount / 1000).toFixed(1)}k`
                : realFollowersCount}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
              Followers
            </span>
          </div>

          <div
            onClick={() => setListModalType('following')}
            className="neu-inset rounded-[15px] py-1.5 px-2 text-center cursor-pointer hover:bg-slate-50 transition active:scale-95"
            title="View following"
          >
            <span className="block text-[16.5px] font-extrabold text-slate-800 font-['Outfit'] leading-tight">
              {realFollowingCount}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
              Following
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & View Mode Switcher */}
      <div className="space-y-3 mb-4">
        {isOwnProfile ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTab('posts')}
              className={`flex-1 h-11.5 rounded-full text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'posts'
                  ? 'neu-active-blue text-white shadow-md'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4.5 h-4.5" />
              <span>My Photos ({safeUserPosts.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('saved')}
              className={`flex-1 h-11.5 rounded-full text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'saved'
                  ? 'neu-active-blue text-white shadow-md'
                  : 'neu-raised text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bookmark className="w-4.5 h-4.5" />
              <span>Saved ({savedPosts.length})</span>
            </button>
          </div>
        ) : null}

        {/* Section Header with Feed vs Grid Layout Switcher */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-[#5B9DFF]" />
            <span className="text-sm font-bold text-slate-800">
              {isOwnProfile
                ? activeSubTab === 'posts'
                  ? `Posts & Captures (${displayPosts.length})`
                  : `Saved Collection (${displayPosts.length})`
                : `Posts & Captures (${displayPosts.length})`}
            </span>
          </div>

          {displayPosts.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-full neu-inset bg-slate-100/80">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Feed Card View (Full interactions)"
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'neu-active-blue text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View (Compact gallery)"
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'neu-active-blue text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Posts Section (Feed Card View or Interactive Grid View) */}
      {displayPosts.length === 0 ? (
        <div className="neu-flat rounded-[24px] p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No posts in this collection</p>
          <p className="text-xs text-slate-400 mt-1">
            {isOwnProfile
              ? 'Upload photos to showcase your moments'
              : `@${displayedUser.username} has not shared photos yet`}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {displayPosts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              allUsers={allUsers}
              onLike={onLike || (() => {})}
              onDislike={onDislike}
              onReact={onReact}
              onEmojiReact={onEmojiReact}
              onCommentClick={onCommentClick || openComments}
              onShareClick={onShareClick || openShareSheet}
              onOpenPost={onOpenPost || openPostPreview}
              onUserClick={onUserClick}
              onAddComment={onAddComment}
              onToggleSave={onToggleSave}
              onDeletePost={onDeletePost}
              onHidePost={onHidePost}
              onUpdateCaption={onUpdateCaption}
              onShowToast={onShowToast}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {displayPosts.map((post) => (
            <motion.div
              key={post.id}
              whileHover={{ scale: 1.01 }}
              className="relative aspect-[4/5] rounded-[22px] overflow-hidden neu-raised group flex flex-col justify-end"
            >
              {/* Post Image (Click opens full post) */}
              <div
                onClick={() => (onOpenPost || openPostPreview)(post)}
                className="absolute inset-0 cursor-pointer"
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Interactive Bottom Overlay Bar with Action Buttons */}
              <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-transparent text-white flex flex-col justify-end">
                {post.caption && (
                  <p
                    onClick={() => (onOpenPost || openPostPreview)(post)}
                    className="text-[11px] line-clamp-1 mb-2 font-medium text-slate-100 cursor-pointer drop-shadow-xs"
                  >
                    {post.caption}
                  </p>
                )}

                {/* Action Buttons: Like, Dislike, Comment, Share */}
                <div className="flex items-center justify-between gap-1 text-xs">
                  {/* Like */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handlePostLikeClick(e, post.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md transition cursor-pointer font-bold ${
                      post.isLiked
                        ? 'bg-[#5B9DFF] text-white shadow-xs'
                        : 'bg-black/40 text-slate-200 hover:bg-black/60'
                    }`}
                    title="Like post"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-white' : ''}`} />
                    <span className="text-[11px]">{post.likesCount}</span>
                  </motion.button>

                  {/* Dislike */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handlePostDislikeClick(e, post.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md transition cursor-pointer font-bold ${
                      post.isDisliked
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-black/40 text-slate-200 hover:bg-black/60'
                    }`}
                    title="Dislike post"
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 ${post.isDisliked ? 'fill-white' : ''}`} />
                    {(post.dislikesCount || 0) > 0 && (
                      <span className="text-[11px]">{post.dislikesCount}</span>
                    )}
                  </motion.button>

                  {/* Comment */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handlePostCommentClick(e, post)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-slate-200 transition cursor-pointer font-bold"
                    title="Open comments"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{post.commentsCount}</span>
                  </motion.button>

                  {/* Share */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handlePostShareClick(e, post)}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-slate-200 hover:text-white transition cursor-pointer"
                    title="Share post"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Custom Full-Featured Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && isOwnProfile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditProfileOpen(false)}
            currentUser={currentUser}
            onSave={onUpdateUser}
            onShowToast={onShowToast}
          />
        )}
      </AnimatePresence>

      {/* Individual User Settings Menu */}
      {!isOwnProfile && (
        <IndividualUserMenu
          isOpen={isIndividualMenuOpen}
          onClose={() => setIsIndividualMenuOpen(false)}
          user={displayedUser}
          isFollowing={isFollowing}
          onToggleFollow={onToggleFollow}
          onClearChat={onClearChat}
          isLocked={isUserLocked}
          onToggleLockChat={onToggleLockChat}
          onShowToast={onShowToast}
        />
      )}

      {/* Followers / Following List Modal */}
      <AnimatePresence>
        {listModalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setListModalType(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-800 capitalize font-['Outfit']">
                  {listModalType}
                </h3>
                <button
                  onClick={() => setListModalType(null)}
                  className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoadingModalUsers ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2.5">
                    <div className="w-7 h-7 border-2 border-[#5B9DFF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400 font-medium">Loading {listModalType}...</span>
                  </div>
                ) : modalError ? (
                  <div className="text-center py-8 px-4 space-y-3">
                    <p className="text-sm font-semibold text-rose-500">{modalError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoadingModalUsers(true);
                        setModalError(null);
                        const fetchFn = listModalType === 'followers' ? getFollowersListForUser : getFollowingListForUser;
                        fetchFn(targetProfileUserId, allUsers)
                          .then((res) => {
                            setModalUsers(res);
                            setModalError(null);
                          })
                          .catch((err: any) => {
                            setModalError(err?.message || 'Failed to load list. Please try again.');
                          })
                          .finally(() => setIsLoadingModalUsers(false));
                      }}
                      className="px-4 py-2 rounded-full neu-raised text-xs font-bold text-[#5B9DFF] hover:text-blue-600 cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                ) : modalUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm font-medium">
                    No {listModalType} found
                  </div>
                ) : (
                  modalUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setListModalType(null);
                        onUserClick?.(user);
                      }}
                      className="flex items-center justify-between p-3 rounded-[16px] neu-raised hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || DEFAULT_AVATAR}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover neu-inset"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            {user.name}
                            {user.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9DFF] fill-current" />}
                          </h4>
                          <p className="text-xs text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#5B9DFF] neu-raised px-3 py-1.5 rounded-full">
                        View
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ProfileView = React.memo(ProfileViewComponent);
