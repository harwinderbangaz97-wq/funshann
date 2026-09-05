import React, { useState, useEffect, useCallback, Component, ErrorInfo, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import {
  User,
  Story,
  Post,
  PostReaction,
  ChatThread,
  Message,
  VoiceNoteData,
  NotificationItem,
  TabType,
  ThemeMode,
  MessagePrivacyMode,
  MessageReportReason,
} from './types';
import {
  validateMessageDeletion,
  validateMessageSeen,
  submitMessageReport,
  updateThreadAfterMessageDeletion,
} from './data/messagePrivacyService';
import { getIndividualChatSettings } from './services/individualChatSettingsService';
import { TopAppBar } from './components/TopAppBar';
import { StoriesSection } from './components/StoriesSection';
import { FeedCard } from './components/FeedCard';
import { BottomNavigation } from './components/BottomNavigation';
import { SearchPeopleView } from './components/SearchPeopleView';
import { UploadMediaModal } from './components/UploadMediaModal';
import { ChatView } from './components/ChatView';
import { ProfileView } from './components/ProfileView';
import { StoryViewerModal } from './components/StoryViewerModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { CommentsModal } from './components/CommentsModal';
import { ShareSheetModal } from './components/ShareSheetModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { FullPostModal } from './components/FullPostModal';
import { DeviceFrame } from './components/DeviceFrame';
import { SettingsModal, SettingsSection } from './components/SettingsModal';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { PermissionAndMediaProvider, usePermissionAndMedia } from './context/PermissionAndMediaContext';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { AndroidGestureBack } from './components/AndroidGestureBack';
import { SplashScreen } from './components/SplashScreen';
import { WelcomeAuthScreen } from './components/WelcomeAuthScreen';
import {
  ensureFirebaseAuth,
  syncUserProfileToFirestore,
  getUserProfileFromFirestore,
  syncPostToFirestore,
  deletePostFromFirestore,
  updatePostInFirestore,
  subscribeToPosts,
  syncStoryToFirestore,
  recordStoryViewInFirestore,
  deleteStoryFromFirestore,
  subscribeToStories,
  syncChatThreadToFirestore,
  deleteChatThreadFromFirestore,
  subscribeToChatThreads,
  syncChatMessageToFirestore,
  subscribeToChatMessages,
  syncNotificationToFirestore,
  subscribeToNotifications,
  subscribeToUsers,
  uploadUserAvatarToStorage,
  uploadPostImageToStorage,
  uploadStoryMediaToStorage,
  uploadChatMediaToStorage,
  isValidMediaUrl,
  auth,
  onAuthStateChanged,
  signOut,
  followUser,
  unfollowUser,
  DEFAULT_AVATAR,
  db,
  doc,
  collection,
  setDoc,
  serverTimestamp,
  getPostsFromFirestore,
  loadMorePostsFromFirestore,
  getUsersFromFirestore,
  getUserFollowingsFromFirestore,
} from './services/firebase';
import {
  sendChatMessage,
  getChatRoomId,
  deleteChatMessageFromFirestore,
  toggleMessageReactionInFirestore,
  markMessageAsReadInFirestore,
  subscribeToAllChatRooms,
} from './services/chatService';
import {
  parseTimestampToMs,
  formatRelativeTime,
  format12HourTime,
  formatDetailed12HourTime,
} from './services/timeUtils';

const HomeTab = lazy(() => import('./components/tabs/HomeTab').then(m => ({ default: m.HomeTab })));
const SearchTab = lazy(() => import('./components/tabs/SearchTab').then(m => ({ default: m.SearchTab })));
const UploadTab = lazy(() => import('./components/tabs/UploadTab').then(m => ({ default: m.UploadTab })));
const ChatTab = lazy(() => import('./components/tabs/ChatTab').then(m => ({ default: m.ChatTab })));
const ProfileTab = lazy(() => import('./components/tabs/ProfileTab').then(m => ({ default: m.ProfileTab })));

const EMPTY_USER: User = {
  id: '',
  name: '',
  username: '',
  avatar: DEFAULT_AVATAR,
  bio: '',
  location: '',
  website: '',
  interests: [],
  socialLinks: [],
  birthday: '',
  mobileNumber: '',
  email: '',
  twoFactorEnabled: false,
  twoFactorMethod: 'authenticator',
  usernameLastChangedAt: new Date().toISOString(),
  postsCount: 0,
  followersCount: 0,
  followingCount: 0,
  isVerified: false,
  isOnline: false,
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full w-full p-10">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
  </div>
);

function AppContent() {
  const {
    navState,
    goBack,
    navigateToTab,
    openUserProfile,
    popUserProfile,
    openChatThread,
    closeChatThread,
    openStoryViewer,
    closeStoryViewer,
    openComments,
    closeComments,
    openShareSheet,
    closeShareSheet,
    openNotifications,
    closeNotifications,
    openSettings,
    closeSettings,
    openPostPreview,
    closePostPreview,
    canGoBack,
  } = useNavigation();

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('funshann_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return {
            id: parsed.id || '',
            name: parsed.name || '',
            username: parsed.username || '',
            avatar: parsed.avatar || DEFAULT_AVATAR,
            bio: parsed.bio || '',
            location: parsed.location || '',
            website: parsed.website || '',
            interests: parsed.interests || [],
            socialLinks: parsed.socialLinks || [],
            birthday: parsed.birthday || '',
            mobileNumber: parsed.mobileNumber || '',
            email: parsed.email || '',
            twoFactorEnabled: parsed.twoFactorEnabled || false,
            twoFactorMethod: parsed.twoFactorMethod || 'authenticator',
            usernameLastChangedAt: parsed.usernameLastChangedAt || new Date().toISOString(),
            postsCount: parsed.postsCount || 0,
            followersCount: parsed.followersCount || 0,
            followingCount: parsed.followingCount || 0,
            isVerified: parsed.isVerified || false,
            isOnline: parsed.isOnline || false,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load currentUser from localStorage:', e);
    }
    return {
      id: '',
      name: '',
      username: '',
      avatar: DEFAULT_AVATAR,
      bio: '',
      location: '',
      website: '',
      interests: [],
      socialLinks: [],
      birthday: '',
      mobileNumber: '',
      email: '',
      twoFactorEnabled: false,
      twoFactorMethod: 'authenticator',
      usernameLastChangedAt: new Date().toISOString(),
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      isVerified: false,
      isOnline: false,
    };
  });

  useEffect(() => {
    if (currentUser && currentUser.id) {
      getUserFollowingsFromFirestore(currentUser.id).then((followings) => {
        if (followings && followings.length >= 0) {
          setCurrentUser(prev => ({
            ...prev,
            following: followings,
            followingCount: followings.length,
          }));
        }
      }).catch(console.warn);
    }
  }, [currentUser?.id]);

  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('funshann_splash_shown') === 'true') {
      return false;
    }
    return true;
  });

  const handleFinishSplash = () => {
    setShowSplash(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('funshann_splash_shown', 'true');
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const handleAuthenticate = (user: Partial<User>) => {
    setIsAuthenticated(true);
    handleUpdateCurrentUser(user);
  };

  const handleUpdateCurrentUser = (updated: Partial<User>) => {
    setCurrentUser((prev) => {
      const nextUser = { ...prev, ...updated };
      try {
        localStorage.setItem('funshann_current_user', JSON.stringify(nextUser));
      } catch (e) {
        console.error(e);
      }
      syncUserProfileToFirestore(nextUser).catch(console.warn);

      // If avatar is newly picked base64 data URL, upload to Firebase Cloud Storage in background
      if (updated.avatar && updated.avatar.startsWith('data:')) {
        uploadUserAvatarToStorage(prev.id, updated.avatar)
          .then((downloadUrl) => {
            if (downloadUrl && downloadUrl !== updated.avatar) {
              const updatedWithStorageUrl = { ...nextUser, avatar: downloadUrl };
              setCurrentUser(updatedWithStorageUrl);
              try {
                localStorage.setItem('funshann_current_user', JSON.stringify(updatedWithStorageUrl));
              } catch (err) {
                console.warn(err);
              }
              syncUserProfileToFirestore(updatedWithStorageUrl).catch(console.warn);
            }
          })
          .catch(console.warn);
      }
      return nextUser;
    });

    if (updated.avatar || updated.name || updated.username) {
      // Sync with posts created by current user
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.userId === currentUser.id || post.user?.id === currentUser.id) {
            return {
              ...post,
              user: {
                ...post.user,
                ...(updated.avatar ? { avatar: updated.avatar } : {}),
                ...(updated.name ? { name: updated.name } : {}),
                ...(updated.username ? { username: updated.username } : {}),
              },
            };
          }
          return post;
        })
      );
      // Sync with stories created by current user
      setStories((prevStories) =>
        prevStories.map((story) => {
          if (story.userId === currentUser.id || story.user?.id === currentUser.id) {
            return {
              ...story,
              user: {
                ...story.user,
                ...(updated.avatar ? { avatar: updated.avatar } : {}),
                ...(updated.name ? { name: updated.name } : {}),
                ...(updated.username ? { username: updated.username } : {}),
              },
            };
          }
          return story;
        })
      );
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState<boolean>(false);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isCreatingStory, setIsCreatingStory] = useState<boolean>(false);

  // Lazy loading / Infinite scroll pagination for older posts
  const handleLoadMorePosts = useCallback(async () => {
    if (isLoadingMorePosts || !hasMorePosts) return;
    setIsLoadingMorePosts(true);
    try {
      const olderPosts = await loadMorePostsFromFirestore(15);
      if (!olderPosts || olderPosts.length === 0) {
        setHasMorePosts(false);
      } else {
        setPosts((prevPosts) => {
          const map = new Map<string, Post>();
          prevPosts.forEach((p) => map.set(p.id, p));
          olderPosts.forEach((p) => {
            if (p && p.id) {
              map.set(p.id, p);
            }
          });
          return Array.from(map.values()).sort((a, b) => {
            const timeA = a.createdAtMs || 0;
            const timeB = b.createdAtMs || 0;
            return timeB - timeA;
          });
        });
        if (olderPosts.length < 15) {
          setHasMorePosts(false);
        }
      }
    } catch (err) {
      console.warn('Error loading more posts:', err);
    } finally {
      setIsLoadingMorePosts(false);
    }
  }, [isLoadingMorePosts, hasMorePosts]);

  // App Permissions State from central PermissionAndMediaContext
  const { permissionsState, setAllPermissions } = usePermissionAndMedia();

  // Theme Customization State (Light, Dark, Golden)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('funshann_theme');
      if (saved && ['light', 'dark', 'golden'].includes(saved)) {
        return saved as ThemeMode;
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  // Seamless Network Connectivity & Recovery Listener, Firebase Auth Init, and Real-time Database Subscriptions
  useEffect(() => {
    // 1. Initialize Firebase Auth Session and listen for changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const remoteUser = await getUserProfileFromFirestore(user.uid);
          if (remoteUser) {
            setCurrentUser((prev) => ({
              ...prev,
              ...remoteUser,
              avatar: remoteUser.avatar || prev.avatar || DEFAULT_AVATAR,
            }));
          } else {
             // If no profile exists, ensure corresponding profile document in Firestore (users collection using user.uid)
             const newUserDoc: User = {
               id: user.uid,
               name: user.displayName || user.email?.split('@')[0] || 'Funshann Member',
               username: (user.displayName || user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, ''),
               email: user.email || '',
               avatar: user.photoURL || DEFAULT_AVATAR,
               bio: 'Building real connections on Funshann 📸✨',
               postsCount: 0,
               followersCount: 0,
               followingCount: 0,
               isVerified: false,
             };
             await setDoc(doc(db, 'users', user.uid), {
               ...newUserDoc,
               createdAt: serverTimestamp(),
               updatedAt: serverTimestamp(),
             }, { merge: true });
             setCurrentUser(newUserDoc);
          }
        } catch (err) {
          console.error("Auth state change profile fetch error:", err);
        }
      } else {
        setIsAuthenticated(false);
      }
    });

    // 2. Real-time Firestore Subscriptions for Posts, Stories, Chat Threads, Users, and Notifications
    const unsubPosts = subscribeToPosts((remotePosts) => {
      if (remotePosts) {
          setPosts((prevPosts) => {
            const map = new Map<string, Post>();
            // Keep local in-memory posts
            prevPosts.forEach((p) => map.set(p.id, p));
            // Overlay remote posts from Firestore
            remotePosts.forEach((p) => {
              if (p && p.id) {
                map.set(p.id, p);
              }
            });

            // Sort strictly newest first
            return Array.from(map.values()).sort((a, b) => {
              const timeA = a.createdAtMs || (a.id.startsWith('post_') ? parseInt(a.id.replace('post_', ''), 10) || 0 : 0);
              const timeB = b.createdAtMs || (b.id.startsWith('post_') ? parseInt(b.id.replace('post_', ''), 10) || 0 : 0);
              return timeB - timeA;
            });
          });
      }
    });

    const unsubStories = subscribeToStories((remoteStories) => {
      if (remoteStories && remoteStories.length > 0) {
        setStories((prevStories) => {
          const map = new Map<string, Story>();
          prevStories.forEach((s) => map.set(s.id, s));
          remoteStories.forEach((s) => {
            if (s && s.id) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubUsers = subscribeToUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers((prevUsers) => {
          const map = new Map<string, User>();
          prevUsers.forEach((u) => map.set(u.id, u));
          remoteUsers.forEach((u) => {
            if (u && u.id) {
              map.set(u.id, u);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    const handleOnline = () => {
      showToast('Connection restored 🌐');
    };

    const handleOffline = () => {
      showToast('Network change detected. Reconnecting...');
    };

    // Attach to global window object for Android WebView bridge
    (window as unknown as { __onFunshannNetworkRecovered?: () => void }).__onFunshannNetworkRecovered = () => {
      showToast('Network reconnected 🌐');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeAuth();
      unsubPosts();
      unsubStories();
      unsubUsers();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      delete (window as unknown as { __onFunshannNetworkRecovered?: () => void }).__onFunshannNetworkRecovered;
    };
  }, []);

  // 3. User-specific real-time subscriptions (Chat Threads, Notifications)
  // These depend on currentUser.id being available and update whenever it changes
  useEffect(() => {
    const currentUid = currentUser?.id;
    if (!currentUid) return;

    const unsubThreads = subscribeToChatThreads((remoteThreads) => {
      if (remoteThreads && remoteThreads.length > 0) {
        setChatThreads((prevThreads) => {
          const map = new Map<string, ChatThread>();
          prevThreads.forEach((t) => map.set(t.id, t));
          remoteThreads.forEach((t) => {
            if (t && t.id) {
              // Dynamically resolve participant for 1-on-1 chats
              if (!t.isGroup && users.length > 0) {
                const otherUserId = t.id.split('_').find(id => id !== currentUid);
                if (otherUserId) {
                  const otherUser = users.find(u => u.id === otherUserId);
                  if (otherUser) {
                    t.participant = otherUser;
                  }
                }
              }
              map.set(t.id, t);
            }
          });
          return Array.from(map.values());
        });
      }
    }, currentUid);

    const unsubNotifs = subscribeToNotifications((remoteNotifs) => {
      if (remoteNotifs && remoteNotifs.length > 0) {
        setNotifications((prevNotifs) => {
          const map = new Map<string, NotificationItem>();
          prevNotifs.forEach((n) => map.set(n.id, n));
          remoteNotifs.forEach((n) => {
            if (n && n.id) {
              map.set(n.id, n);
            }
          });
          return Array.from(map.values());
        });
      }
    }, currentUid);

    return () => {
      unsubThreads();
      unsubNotifs();
    };
  }, [currentUser?.id, users.length]);

  const handleUpdateTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('funshann_theme', newTheme);
    } catch (e) {
      console.error(e);
    }
  };

  const activeTab = navState.tab;

  const handleOpenProfile = (user: User) => {
    if (user.id === currentUser.id) {
      navigateToTab('profile');
    } else {
      const matchedUser = users.find((u) => u.id === user.id) || user;
      openUserProfile(matchedUser);
    }
  };

  const handleOpenThemeStudio = () => {
    openSettings('theme');
  };

  // Locked / Hidden Chat Privacy States
  const [lockedChatUserIds, setLockedChatUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('funshann_locked_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chatLockPasscode, setChatLockPasscode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('funshann_chat_pin');
      return saved || '123456';
    } catch {
      return '123456';
    }
  });

  const [isChatLockEnabled, setIsChatLockEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('funshann_chat_lock_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleUpdateLockedChatUserIds = (newIds: string[]) => {
    setLockedChatUserIds(newIds);
    try {
      localStorage.setItem('funshann_locked_chats', JSON.stringify(newIds));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateChatLockPasscode = (pin: string) => {
    setChatLockPasscode(pin);
    try {
      localStorage.setItem('funshann_chat_pin', pin);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateChatLockEnabled = (enabled: boolean) => {
    setIsChatLockEnabled(enabled);
    try {
      localStorage.setItem('funshann_chat_lock_enabled', JSON.stringify(enabled));
    } catch (e) {
      console.error(e);
    }
  };

  // Floating Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Like or Dislike Reaction on a Post with Automated Community Safety Removal
  const handleReaction = (postId: string, reaction: 'like' | 'dislike') => {
    let removedPostInfo: { post: Post; authorId: string; wasRemoved: boolean } | null = null;

    setPosts((prevPosts) => {
      const target = prevPosts.find((p) => p.id === postId);
      if (!target) return prevPosts;

      let nextLikesCount = target.likesCount;
      let nextDislikesCount = target.dislikesCount || 0;
      let nextIsLiked = target.isLiked || false;
      let nextIsDisliked = target.isDisliked || false;
      let nextUserReaction = target.userReaction;
      let nextLikes: string[] = Array.isArray(target.likes) ? [...target.likes] : [];
      let nextDislikes: string[] = Array.isArray(target.dislikes) ? [...target.dislikes] : [];

      if (reaction === 'like') {
        if (target.isLiked) {
          // User already liked -> remove like
          nextLikesCount = Math.max(0, nextLikesCount - 1);
          nextIsLiked = false;
          nextUserReaction = null;
          nextLikes = nextLikes.filter((id) => id !== currentUser.id);
        } else {
          // User wants to like
          nextLikesCount = nextLikesCount + 1;
          nextIsLiked = true;
          if (!nextLikes.includes(currentUser.id)) {
            nextLikes.push(currentUser.id);
          }
          // If was disliked, remove dislike
          if (target.isDisliked) {
            nextDislikesCount = Math.max(0, nextDislikesCount - 1);
            nextIsDisliked = false;
            nextDislikes = nextDislikes.filter((id) => id !== currentUser.id);
          }
          nextUserReaction = 'like';
        }
      } else if (reaction === 'dislike') {
        if (target.isDisliked) {
          // User already disliked -> remove dislike
          nextDislikesCount = Math.max(0, nextDislikesCount - 1);
          nextIsDisliked = false;
          nextUserReaction = null;
          nextDislikes = nextDislikes.filter((id) => id !== currentUser.id);
        } else {
          // User wants to dislike
          nextDislikesCount = nextDislikesCount + 1;
          nextIsDisliked = true;
          if (!nextDislikes.includes(currentUser.id)) {
            nextDislikes.push(currentUser.id);
          }
          // If was liked, remove like
          if (target.isLiked) {
            nextLikesCount = Math.max(0, nextLikesCount - 1);
            nextIsLiked = false;
            nextLikes = nextLikes.filter((id) => id !== currentUser.id);
          }
          nextUserReaction = 'dislike';
        }
      }

      // Disabled auto-removal logic as requested
      const shouldAutoRemove = false;

      // Sync reaction directly to Firestore
      updatePostInFirestore(postId, {
        likesCount: nextLikesCount,
        dislikesCount: nextDislikesCount,
        isLiked: nextIsLiked,
        isDisliked: nextIsDisliked,
        userReaction: nextUserReaction,
        likes: nextLikes,
        dislikes: nextDislikes,
      }).catch(console.warn);

      // Update post in state
      return prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            likesCount: nextLikesCount,
            dislikesCount: nextDislikesCount,
            isLiked: nextIsLiked,
            isDisliked: nextIsDisliked,
            userReaction: nextUserReaction,
            likes: nextLikes,
            dislikes: nextDislikes,
          };
        }
        return p;
      });
    });

    // Handle post removal notification and cleanup if auto-removed
    if (removedPostInfo && removedPostInfo.wasRemoved) {
      const { post: removedPost, authorId } = removedPostInfo;

      // Close post preview if this post was currently open
      if (navState.previewPost && navState.previewPost.id === postId) {
        closePostPreview();
      }

      // Update author postsCount if it was currentUser
      if (authorId === currentUser.id) {
        setCurrentUser((prev) => ({
          ...prev,
          postsCount: Math.max(0, prev.postsCount - 1),
        }));
      }

      // Send Community Safety Notification to post author
      const safetyNotif: NotificationItem = {
        id: `notif_safety_${Date.now()}`,
        type: 'safety_removal',
        user: {
          id: 'funshann_safety',
          name: 'Funshann Safety Team',
          username: 'safety',
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          bio: 'Official Funshann Community Trust & Safety Team',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isFollowing: false,
        },
        text: 'Your post received more Dislikes than Likes. To protect privacy and maintain a safe community, we are removing this post from the Funshann platform.',
        timestamp: formatRelativeTime(Date.now()),
        read: false,
        previewImage: removedPost.imageUrl,
      };

      setNotifications((prev) => [safetyNotif, ...prev]);
      syncNotificationToFirestore(safetyNotif).catch(console.warn);
      showToast('Post removed due to community safety protection');
    }
  };

  const handleLikePost = (postId: string) => handleReaction(postId, 'like');
  const handleDislikePost = (postId: string) => handleReaction(postId, 'dislike');

  // Handle Emoji Reaction on a Post (Wide variety beyond like/dislike)
  const handleEmojiReaction = (postId: string, emoji: string) => {
    setPosts((prevPosts) => {
      const target = prevPosts.find((p) => p.id === postId);
      if (!target) return prevPosts;

      const currentReactions: PostReaction[] = Array.isArray(target.reactions)
        ? [...target.reactions]
        : [];
      const userReactionEmoji = target.userEmojiReaction;
      const userId = currentUser.id;

      let nextReactions = [...currentReactions];
      let nextUserEmojiReaction: string | null = null;

      if (userReactionEmoji === emoji) {
        // Toggled off the same emoji
        nextReactions = nextReactions
          .map((r) => {
            if (r.emoji === emoji) {
              const newUserIds = (r.userIds || []).filter((id) => id !== userId);
              return { ...r, count: Math.max(0, r.count - 1), userIds: newUserIds };
            }
            return r;
          })
          .filter((r) => r.count > 0);
        nextUserEmojiReaction = null;
      } else {
        // If user already had a different emoji reaction, remove it first
        if (userReactionEmoji) {
          nextReactions = nextReactions
            .map((r) => {
              if (r.emoji === userReactionEmoji) {
                const newUserIds = (r.userIds || []).filter((id) => id !== userId);
                return { ...r, count: Math.max(0, r.count - 1), userIds: newUserIds };
              }
              return r;
            })
            .filter((r) => r.count > 0);
        }

        // Add new reaction
        const existingIdx = nextReactions.findIndex((r) => r.emoji === emoji);
        if (existingIdx >= 0) {
          const item = nextReactions[existingIdx];
          const newUserIds = (item.userIds || []).includes(userId)
            ? item.userIds
            : [...(item.userIds || []), userId];
          nextReactions[existingIdx] = {
            ...item,
            count: item.count + 1,
            userIds: newUserIds,
          };
        } else {
          nextReactions.push({
            emoji,
            count: 1,
            userIds: [userId],
          });
        }
        nextUserEmojiReaction = emoji;
      }

      // Sync reaction to Firestore
      updatePostInFirestore(postId, {
        reactions: nextReactions,
        userEmojiReaction: nextUserEmojiReaction,
      }).catch(console.warn);

      return prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            reactions: nextReactions,
            userEmojiReaction: nextUserEmojiReaction,
          };
        }
        return p;
      });
    });
  };

  // Add Comment to Post
  const handleAddComment = (postId: string, text: string) => {
    const now = Date.now();
    const newComment = {
      id: `c_${now}`,
      userId: currentUser.id,
      user: currentUser,
      text,
      timestamp: formatRelativeTime(now),
      createdAtMs: now,
      likesCount: 0,
      isLiked: false,
    };

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const updatedComments = [newComment, ...p.comments];
          const updatedPost = {
            ...p,
            comments: updatedComments,
            commentsCount: p.commentsCount + 1,
          };
          updatePostInFirestore(postId, {
            comments: updatedComments,
            commentsCount: updatedPost.commentsCount,
          }).catch(console.warn);
          return updatedPost;
        }
        return p;
      })
    );

    // Also update modal post if open
    if (navState.activeCommentPost && navState.activeCommentPost.id === postId) {
      openComments({
        ...navState.activeCommentPost,
        comments: [newComment, ...navState.activeCommentPost.comments],
        commentsCount: navState.activeCommentPost.commentsCount + 1,
      });
    }

    showToast('Comment posted!');
  };

  // Toggle Save Post
  const handleToggleSavePost = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const nextSaved = !p.isSaved;
          updatePostInFirestore(postId, { isSaved: nextSaved }).catch(console.warn);
          showToast(nextSaved ? 'Saved to your collection! 🔖' : 'Removed from saved posts');
          return { ...p, isSaved: nextSaved };
        }
        return p;
      })
    );
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    deletePostFromFirestore(postId).catch(console.warn);
    if (target && (target.userId === currentUser.id || target.user.id === currentUser.id)) {
      setCurrentUser((prev) => ({
        ...prev,
        postsCount: Math.max(0, prev.postsCount - 1),
      }));
    }
    showToast('Post deleted successfully');
  };

  // Hide Post
  const handleHidePost = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    showToast('Post hidden from your feed');
  };

  // Update Post Caption
  const handleUpdateCaption = (postId: string, newCaption: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p.id === postId ? { ...p, caption: newCaption } : p))
    );
    updatePostInFirestore(postId, { caption: newCaption }).catch(console.warn);
  };

  // Publish New Photo Post
  const handlePublishPost = async (
    newPostData: Omit<
      Post,
      'id' | 'likesCount' | 'dislikesCount' | 'commentsCount' | 'isLiked' | 'isDisliked' | 'userReaction' | 'isSaved' | 'isAutoRemoved' | 'comments' | 'timestamp' | 'likes' | 'dislikes'
    >
  ) => {
    const now = Date.now();
    const postId = doc(collection(db, 'posts')).id;
    const createdPost: Post = {
      ...newPostData,
      id: postId,
      timestamp: formatRelativeTime(now),
      createdAtMs: now,
      likesCount: 0,
      dislikesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isDisliked: false,
      userReaction: null,
      likes: [],
      dislikes: [],
      isAutoRemoved: false,
      comments: [],
    };

    // 1. Optimistic UI: Immediately add to local feed, increment user post count, navigate, and notify
    setPosts((prevPosts) => [createdPost, ...prevPosts.filter((p) => p.id !== createdPost.id)]);
    setCurrentUser((prev) => ({
      ...prev,
      postsCount: prev.postsCount + 1,
    }));
    navigateToTab('home');
    showToast('Your photo has been shared to Funshann!');

    // 2. Persist to Firestore collection 'posts' in background
    syncPostToFirestore(createdPost).catch(console.warn);

    // 3. If post image is local data URL, upload to Firebase Storage, validate download URL, and update Firestore
    if (createdPost.imageUrl && createdPost.imageUrl.startsWith('data:')) {
      uploadPostImageToStorage(currentUser.id, createdPost.imageUrl)
        .then((downloadUrl) => {
          if (isValidMediaUrl(downloadUrl) && downloadUrl !== createdPost.imageUrl) {
            const updatedPostWithStorageUrl = { ...createdPost, imageUrl: downloadUrl };
            setPosts((prevPosts) =>
              prevPosts.map((p) => (p.id === createdPost.id ? updatedPostWithStorageUrl : p))
            );
            syncPostToFirestore(updatedPostWithStorageUrl).catch(console.warn);
          }
        })
        .catch(console.warn);
    }
  };

  // Follow / Unfollow user
  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser || !currentUser.id || !targetUserId) return;
    
    const targetUser = users.find(u => u.id === targetUserId);
    const isCurrentlyFollowing = Boolean(currentUser.following?.includes(targetUserId)) || Boolean(targetUser?.isFollowing);
    const nextFollowing = !isCurrentlyFollowing;

    const updatedFollowing = nextFollowing
      ? Array.from(new Set([...(currentUser.following || []), targetUserId]))
      : (currentUser.following || []).filter(id => id !== targetUserId);

    // Optimistic UI update
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === targetUserId) {
          return {
            ...u,
            isFollowing: nextFollowing,
            followersCount: Math.max(0, (u.followersCount || 0) + (nextFollowing ? 1 : -1)),
          };
        }
        return u;
      })
    );

    setCurrentUser((prev) => ({
      ...prev,
      following: updatedFollowing,
      followingCount: updatedFollowing.length,
    }));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.id, targetUserId);
        showToast('Unfollowed user');
      } else {
        await followUser(currentUser.id, targetUserId);
        showToast('Following user');
      }
    } catch (err) {
      console.error('Follow error:', err);
      showToast('Error updating follow status');
    }
  };

  // Open Direct Chat with user
  const handleOpenDirectChat = (user: User) => {
    const deterministicId = [currentUser.id, user.id].sort().join('_');
    const existing = chatThreads.find((t) => t.id === deterministicId || t.participant?.id === user.id);
    if (!existing) {
      const currentUid = currentUser.uid || currentUser.id;
      const targetUid = user.uid || user.id;
      const newThread: ChatThread = {
        id: deterministicId,
        participant: user,
        participantIds: [currentUid, targetUid].sort(),
        lastMessage: {
          text: 'Say hello!',
          timestamp: format12HourTime(Date.now()),
          isRead: true,
          senderId: currentUid,
        },
        unreadCount: 0,
        messages: [],
      };
      setChatThreads([newThread, ...chatThreads]);
      syncChatThreadToFirestore(newThread).catch(console.warn);
    }
    navigateToTab('chat');
    openChatThread(user.id);
  };

  const handleCreateGroup = (
    name: string,
    description: string,
    avatar: string,
    memberIds: string[]
  ) => {
    const allGroupMembers = [
      currentUser,
      ...users.filter((u) => memberIds.includes(u.id)),
    ];
    const currentUid = currentUser.uid || currentUser.id;
    const newGroupThread: ChatThread = {
      id: `group_${Date.now()}`,
      isGroup: true,
      groupName: name,
      groupAvatar: avatar,
      groupDescription: description,
      groupMembers: allGroupMembers,
      groupAdminIds: [currentUid],
      participantIds: allGroupMembers.map(m => m.uid || m.id),
      lastMessage: {
        text: 'Group created. Say hello! 👋',
        timestamp: format12HourTime(Date.now()),
        isRead: true,
        senderId: currentUid,
        senderName: currentUser.name,
      },
      unreadCount: 0,
      messages: [],
    };
    setChatThreads((prev) => [newGroupThread, ...prev]);
    syncChatThreadToFirestore(newGroupThread).catch(console.warn);
    navigateToTab('chat');
    openChatThread(newGroupThread.id);
  };

  const handleUpdateGroup = (
    groupId: string,
    updates: { name?: string; description?: string; avatar?: string; memberIds?: string[] }
  ) => {
    setChatThreads((prev) =>
      prev.map((t) => {
        if (t.id === groupId && t.isGroup) {
          const updatedMembers = updates.memberIds
            ? [currentUser, ...users.filter((u) => updates.memberIds?.includes(u.id))]
            : t.groupMembers;
          const updatedThread = {
            ...t,
            groupName: updates.name !== undefined ? updates.name : t.groupName,
            groupDescription: updates.description !== undefined ? updates.description : t.groupDescription,
            groupAvatar: updates.avatar !== undefined ? updates.avatar : t.groupAvatar,
            groupMembers: updatedMembers,
          };
          syncChatThreadToFirestore(updatedThread).catch(console.warn);
          return updatedThread;
        }
        return t;
      })
    );
  };

  const handleLeaveGroup = (groupId: string) => {
    setChatThreads((prev) => prev.filter((t) => t.id !== groupId));
    deleteChatThreadFromFirestore(groupId).catch(console.warn);
    closeChatThread();
  };

  // Handle Notification Item Tap: Mark only that specific notification as read
  const handleNotificationClick = (notif: NotificationItem) => {
    // 1. Mark ONLY this specific tapped notification as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    // User remains in the notification list/details view.
    // Do NOT navigate automatically to Post, Profile, Chat, or Comments.
  };

  // Explicit Notification Actions (Triggered ONLY when user explicitly taps action buttons inside notification)
  const handleExplicitViewPost = (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      closeNotifications();
      openPostPreview(targetPost);
    } else {
      showToast('Post not found');
    }
  };

  const handleExplicitViewComments = (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (targetPost) {
      closeNotifications();
      openComments(targetPost);
    } else {
      showToast('Post not found');
    }
  };

  const handleExplicitOpenProfile = (user: User) => {
    closeNotifications();
    handleOpenProfile(user);
  };

  const handleExplicitOpenChat = (user: User) => {
    closeNotifications();
    handleOpenDirectChat(user);
  };

  // Send Message in Chat (Supports Normal, Immediate Vanish, Delete After Seen, and Forwarded messages)
  const handleSendMessage = (
    receiverId: string,
    text?: string,
    imageUrl?: string,
    voiceNote?: VoiceNoteData,
    privacyMode: MessagePrivacyMode = 'normal',
    isForwarded?: boolean,
    forwardedFrom?: string,
    skipFirestoreWrite?: boolean
  ) => {
    const deterministicId = [currentUser.id, receiverId].sort().join('_');

    // Only perform write if not already performed by ChatView's explicit addDoc call
    if (!skipFirestoreWrite) {
      sendChatMessage(currentUser.id, receiverId, {
        text,
        imageUrl,
        voiceNote,
        privacyMode,
        isForwarded,
        forwardedFrom,
      }).catch(console.warn);
    }

    // Update thread preview metadata in thread list without pushing to local messages state
    setChatThreads((prevThreads) => {
      const summaryText = voiceNote
        ? `Voice note (0:${voiceNote.durationSeconds < 10 ? '0' : ''}${voiceNote.durationSeconds})`
        : (text || (imageUrl ? 'Photo attachment' : ''));

      const currentUid = currentUser.uid || currentUser.id;
      const lastMessageObj = {
        text: summaryText,
        imageUrl,
        isVoice: !!voiceNote,
        voiceDuration: voiceNote?.durationSeconds,
        timestamp: format12HourTime(Date.now()),
        isRead: false,
        senderId: currentUid,
      };

      const existing = prevThreads.find(
        (t) => t.id === receiverId || t.participant?.id === receiverId || (!t.isGroup && t.id.includes(receiverId)) || t.id === deterministicId
      );
      if (existing) {
        return prevThreads.map((thread) => {
          if (thread.id === receiverId || thread.participant?.id === receiverId || (!thread.isGroup && thread.id.includes(receiverId)) || thread.id === deterministicId) {
            const updatedThread = {
              ...thread,
              id: thread.isGroup ? thread.id : deterministicId,
              lastMessage: lastMessageObj,
            };
            syncChatThreadToFirestore(updatedThread).catch(console.warn);
            return updatedThread;
          }
          return thread;
        });
      }

      // If thread didn't exist yet, create it from MOCK_USERS / users
      const targetUser =
        users.find((u) => u.id === receiverId) || {
          id: receiverId,
          name: 'Contact',
          username: 'contact',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          isVerified: false,
          isOnline: false,
          interests: [],
          socialLinks: [],
          birthday: '',
          mobileNumber: '',
          email: '',
          twoFactorEnabled: false,
          twoFactorMethod: 'authenticator',
          usernameLastChangedAt: new Date().toISOString(),
          isFollowing: false,
        };

      const newThread: ChatThread = {
        id: deterministicId,
        participant: targetUser,
        lastMessage: lastMessageObj,
        unreadCount: 0,
        messages: [],
      };

      syncChatThreadToFirestore(newThread).catch(console.warn);
      return [newThread, ...prevThreads];
    });

    // If message includes local data URL media or voice note, upload to Firebase Storage in background
    if (imageUrl && imageUrl.startsWith('data:')) {
      uploadChatMediaToStorage(currentUser.id, receiverId, imageUrl, 'image')
        .then((downloadUrl) => {
          if (downloadUrl && downloadUrl !== imageUrl) {
            setChatThreads((prevThreads) =>
              prevThreads.map((t) => {
                if (t.id === receiverId || t.participant?.id === receiverId || (!t.isGroup && t.id.includes(receiverId)) || t.id === deterministicId) {
                  const updatedThread = {
                    ...t,
                    lastMessage: t.lastMessage ? { ...t.lastMessage, imageUrl: downloadUrl } : t.lastMessage,
                  };
                  syncChatThreadToFirestore(updatedThread).catch(console.warn);
                  return updatedThread;
                }
                return t;
              })
            );
          }
        })
        .catch(console.warn);
    } else if (voiceNote?.audioUrl && voiceNote.audioUrl.startsWith('data:')) {
      uploadChatMediaToStorage(currentUser.id, receiverId, voiceNote.audioUrl, 'audio')
        .then((downloadUrl) => {
          if (downloadUrl && downloadUrl !== voiceNote.audioUrl) {
            setChatThreads((prevThreads) =>
              prevThreads.map((t) => {
                if (t.id === receiverId || t.participant?.id === receiverId || (!t.isGroup && t.id.includes(receiverId)) || t.id === deterministicId) {
                  const updatedThread = {
                    ...t,
                    lastMessage: t.lastMessage ? { ...t.lastMessage, isVoice: true } : t.lastMessage,
                  };
                  syncChatThreadToFirestore(updatedThread).catch(console.warn);
                  return updatedThread;
                }
                return t;
              })
            );
          }
        })
        .catch(console.warn);
    }

    // Natural processing removed
  };

  // Delete message for everyone in a thread
  const handleDeleteMessage = (threadId: string, messageId: string) => {
    const isGroup = threadId.startsWith('g_') || threadId.startsWith('group_');
    const deterministicChatId = isGroup
      ? threadId
      : (threadId.includes('_') ? threadId : getChatRoomId(currentUser.id, threadId));

    deleteChatMessageFromFirestore(deterministicChatId, messageId).catch(console.warn);

    setChatThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === threadId || thread.id === deterministicChatId || thread.participant?.id === threadId || (!thread.isGroup && thread.id.includes(threadId))) {
          const updated = updateThreadAfterMessageDeletion(thread, messageId);
          syncChatThreadToFirestore(updated).catch(console.warn);
          return updated;
        }
        return thread;
      })
    );
  };

  // Mark message as seen by recipient and timestamp it
  const handleMarkMessageSeen = (threadId: string, messageId: string) => {
    const isGroup = threadId.startsWith('g_') || threadId.startsWith('group_');
    const deterministicChatId = isGroup
      ? threadId
      : (threadId.includes('_') ? threadId : getChatRoomId(currentUser.id, threadId));

    markMessageAsReadInFirestore(deterministicChatId, messageId).catch(console.warn);

    setChatThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === threadId || thread.id === deterministicChatId || thread.participant?.id === threadId || (!thread.isGroup && thread.id.includes(threadId))) {
          let updatedMessage: Message | null = null;
          const updatedMessages = thread.messages.map((m) => {
            if (m.id === messageId && !m.isRead) {
              updatedMessage = {
                ...m,
                isRead: true,
                seenAt: Date.now(),
              };
              return updatedMessage;
            }
            return m;
          });
          const updatedThread = {
            ...thread,
            unreadCount: 0,
            messages: updatedMessages,
          };
          syncChatThreadToFirestore(updatedThread).catch(console.warn);
          if (updatedMessage) {
            syncChatMessageToFirestore(thread.id, updatedMessage).catch(console.warn);
          }
          return updatedThread;
        }
        return thread;
      })
    );
  };

  // Toggle or update reaction on a message (enforces 1 reaction per user per message, allows changing anytime or tapping same to remove)
  const handleToggleMessageReaction = (threadId: string, messageId: string, emoji: string) => {
    const isGroup = threadId.startsWith('g_') || threadId.startsWith('group_');
    const deterministicChatId = isGroup
      ? threadId
      : (threadId.includes('_') ? threadId : getChatRoomId(currentUser.id, threadId));

    toggleMessageReactionInFirestore(deterministicChatId, messageId, currentUser.id, emoji).catch(console.warn);

    setChatThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === threadId || thread.id === deterministicChatId || thread.participant?.id === threadId || (!thread.isGroup && thread.id.includes(threadId))) {
          const updatedMessages = thread.messages.map((msg) => {
            if (msg.id === messageId) {
              let currentReactions = msg.reactions ? [...msg.reactions] : [];

              // Check what reaction the user currently has on this message (if any)
              const existingReactionIndex = currentReactions.findIndex((r) =>
                r.userIds.includes(currentUser.id)
              );

              if (existingReactionIndex >= 0) {
                const currentReaction = currentReactions[existingReactionIndex];
                if (currentReaction.emoji === emoji) {
                  // User clicked the exact same reaction they already had -> Remove it (toggle off)
                  const updatedUserIds = currentReaction.userIds.filter((id) => id !== currentUser.id);
                  if (updatedUserIds.length === 0) {
                    currentReactions.splice(existingReactionIndex, 1);
                  } else {
                    currentReactions[existingReactionIndex] = {
                      ...currentReaction,
                      userIds: updatedUserIds,
                      count: updatedUserIds.length,
                    };
                  }
                } else {
                  // User selected a different emoji -> Remove from old reaction, add to/create new emoji reaction
                  // 1. Remove user from previous emoji
                  const oldUserIds = currentReaction.userIds.filter((id) => id !== currentUser.id);
                  if (oldUserIds.length === 0) {
                    currentReactions.splice(existingReactionIndex, 1);
                  } else {
                    currentReactions[existingReactionIndex] = {
                      ...currentReaction,
                      userIds: oldUserIds,
                      count: oldUserIds.length,
                    };
                  }

                  // 2. Add user to new emoji reaction
                  const targetEmojiIndex = currentReactions.findIndex((r) => r.emoji === emoji);
                  if (targetEmojiIndex >= 0) {
                    const targetReaction = currentReactions[targetEmojiIndex];
                    const newUserIds = Array.from(new Set([...targetReaction.userIds, currentUser.id]));
                    currentReactions[targetEmojiIndex] = {
                      ...targetReaction,
                      userIds: newUserIds,
                      count: newUserIds.length,
                    };
                  } else {
                    currentReactions.push({
                      emoji,
                      userIds: [currentUser.id],
                      count: 1,
                    });
                  }
                }
              } else {
                // User had no active reaction on this message yet -> Add reaction
                const targetEmojiIndex = currentReactions.findIndex((r) => r.emoji === emoji);
                if (targetEmojiIndex >= 0) {
                  const targetReaction = currentReactions[targetEmojiIndex];
                  const newUserIds = Array.from(new Set([...targetReaction.userIds, currentUser.id]));
                  currentReactions[targetEmojiIndex] = {
                    ...targetReaction,
                    userIds: newUserIds,
                    count: newUserIds.length,
                  };
                } else {
                  currentReactions.push({
                    emoji,
                    userIds: [currentUser.id],
                    count: 1,
                  });
                }
              }

              return {
                ...msg,
                reactions: currentReactions,
              };
            }
            return msg;
          });

          const updatedThread = {
            ...thread,
            messages: updatedMessages,
          };
          syncChatThreadToFirestore(updatedThread).catch(console.warn);
          return updatedThread;
        }
        return thread;
      })
    );
  };

  // Report message handler
  const handleReportMessage = (
    threadId: string,
    message: Message,
    reason: MessageReportReason,
    details?: string
  ) => {
    submitMessageReport({
      message,
      threadId,
      reporterUserId: currentUser.id,
      reason,
      details,
    });

    showToast('Report submitted confidentially. Our safety team is reviewing.');
  };

  // Clear conversation messages for a specific user thread
  const handleClearChatThread = (participantUserId: string) => {
    setChatThreads((prevThreads) =>
      prevThreads.map((thread) => {
        if (thread.id === participantUserId || thread.participant?.id === participantUserId || (!thread.isGroup && thread.id.includes(participantUserId))) {
          const updatedThread = {
            ...thread,
            messages: [],
            lastMessage: {
              text: 'Chat cleared',
              timestamp: format12HourTime(Date.now()),
              isRead: true,
              senderId: currentUser.uid || currentUser.id,
            },
            unreadCount: 0,
          };
          syncChatThreadToFirestore(updatedThread).catch(console.warn);
          return updatedThread;
        }
        return thread;
      })
    );
    showToast('Chat history cleared');
  };

  // Toggle individual user chat lock / vault status
  const handleToggleLockChat = (targetUserId: string) => {
    const isCurrentlyLocked = lockedChatUserIds.includes(targetUserId);
    let updatedIds: string[];
    if (isCurrentlyLocked) {
      updatedIds = lockedChatUserIds.filter((id) => id !== targetUserId);
      showToast('Chat unlocked');
    } else {
      updatedIds = [...lockedChatUserIds, targetUserId];
      showToast('Chat locked & moved to Secret Vault 🔒');
    }
    handleUpdateLockedChatUserIds(updatedIds);
  };

  // Add Story trigger
  const handleAddStory = () => {
    setIsCreatingStory(true);
  };

  const handlePublishStory = (newStory: Story) => {
    setStories((prev) => [newStory, ...prev]);
    syncStoryToFirestore(newStory).catch(console.warn);

    // If story media is a local data URL, upload to Firebase Storage and update story with download URL
    if (newStory.mediaUrl && newStory.mediaUrl.startsWith('data:')) {
      const isVideo = newStory.mediaUrl.startsWith('data:video') || newStory.mediaUrl.endsWith('.mp4');
      uploadStoryMediaToStorage(currentUser.id, newStory.mediaUrl, isVideo)
        .then((downloadUrl) => {
          if (downloadUrl && downloadUrl !== newStory.mediaUrl) {
            const updatedStoryWithStorageUrl = { ...newStory, mediaUrl: downloadUrl };
            setStories((prevStories) =>
              prevStories.map((s) => (s.id === newStory.id ? updatedStoryWithStorageUrl : s))
            );
            syncStoryToFirestore(updatedStoryWithStorageUrl).catch(console.warn);
          }
        })
        .catch(console.warn);
    }

    showToast('Your new story has been added! ✨');
    openStoryViewer(0);
  };

  // Toggle Heart Reaction on a Story
  const handleToggleLikeStory = (storyId: string, isLiked: boolean) => {
    setStories((prevStories) =>
      prevStories.map((story) => {
        if (story.id === storyId) {
          const currentCount = story.likesCount ?? 0;
          const nextCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
          const currentLikedBy = story.likedBy || [];
          const nextLikedBy = isLiked
            ? [currentUser, ...currentLikedBy.filter((u) => u.id !== currentUser.id)]
            : currentLikedBy.filter((u) => u.id !== currentUser.id);

          const updatedStory = {
            ...story,
            likesCount: nextCount,
            isLiked,
            likedBy: nextLikedBy,
          };
          syncStoryToFirestore(updatedStory).catch(console.warn);
          return updatedStory;
        }
        return story;
      })
    );

    // If liking another user's story, create a notification
    const targetStory = stories.find((s) => s.id === storyId);
    if (
      isLiked &&
      targetStory &&
      targetStory.userId !== currentUser.id &&
      targetStory.user?.id !== currentUser.id
    ) {
      const now = Date.now();
      const notif: NotificationItem = {
        id: `notif_story_like_${now}`,
        type: 'story_like',
        user: currentUser,
        text: 'liked your story ❤️',
        timestamp: formatRelativeTime(now),
        createdAtMs: now,
        read: false,
        previewImage: targetStory.mediaUrl,
      };
      setNotifications((prev) => [notif, ...prev]);
      syncNotificationToFirestore(notif).catch(console.warn);
    }
  };

  // Record a view event on a story
  const handleStoryView = (storyId: string, viewer: User) => {
    const targetStory = stories.find((s) => s.id === storyId);
    if (!targetStory) return;
    if (targetStory.userId === viewer.id) return;

    recordStoryViewInFirestore(storyId, viewer).catch(console.warn);

    setStories((prevStories) =>
      prevStories.map((story) => {
        if (story.id === storyId) {
          const alreadyViewed = story.viewerIds?.includes(viewer.id);
          if (alreadyViewed) return story;

          const nextViewerIds = [...(story.viewerIds || []), viewer.id];
          const nextViewers = [...(story.viewers || []), viewer];
          const nextViewsCount = Math.max(story.viewsCount || 0, nextViewerIds.length);

          return {
            ...story,
            viewerIds: nextViewerIds,
            viewers: nextViewers,
            viewsCount: nextViewsCount,
          };
        }
        return story;
      })
    );
  };

  // Profile data resolution from navigation history
  const currentProfileUser = navState.profileHistory && navState.profileHistory.length > 0
    ? navState.profileHistory[navState.profileHistory.length - 1]
    : null;

  const activeUser = currentUser || EMPTY_USER;
  const displayedProfileUser = currentProfileUser
    ? (users.find((u) => u.id === currentProfileUser.id) || currentProfileUser)
    : activeUser;

  const currentUserId = activeUser.id;
  const displayedUserId = displayedProfileUser?.id || currentUserId;

  const profileUserPosts = displayedUserId === currentUserId
    ? posts.filter((p) => (p.userId && p.userId === currentUserId) || (p.user && p.user.id === currentUserId))
    : posts.filter((p) => (p.userId && p.userId === displayedUserId) || (p.user && p.user.id === displayedUserId));

  const userPosts = profileUserPosts;
  const savedPosts = posts.filter((p) => p.isSaved);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = chatThreads
    .filter((t) => !(isChatLockEnabled && lockedChatUserIds.includes(t.participant?.id)))
    .reduce((acc, t) => acc + t.unreadCount, 0);

  const handleLogout = async () => {
    await signOut(auth);
    showToast('Logged out successfully');
  };

  // Stop background media and prevent background scrolling when navigating to another screen or opening overlays
  useEffect(() => {
    const mediaEls = document.querySelectorAll('video, audio');
    mediaEls.forEach((el) => {
      try {
        (el as HTMLMediaElement).pause();
      } catch {
        // ignore
      }
    });

    const isOverlayOpen =
      activeTab === 'chat' ||
      navState.selectedStoryIndex !== null ||
      navState.activeCommentPost !== null ||
      navState.activeSharePost !== null ||
      navState.isNotificationOpen ||
      navState.isSettingsOpen ||
      navState.previewPost !== null;

    if (isOverlayOpen) {
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
  }, [
    activeTab,
    navState.activeChatUserId,
    navState.selectedStoryIndex,
    navState.activeCommentPost,
    navState.activeSharePost,
    navState.isNotificationOpen,
    navState.isSettingsOpen,
    navState.previewPost,
  ]);

  useEffect(() => {
    let unsub = () => {};
    if (navState.activeChatUserId) {
      // Find the specific thread
      const targetThreadId = chatThreads.find(
        (t) => t.id === navState.activeChatUserId || t.participant?.id === navState.activeChatUserId || (!t.isGroup && t.id.includes(navState.activeChatUserId))
      )?.id;
      
      if (targetThreadId) {
        unsub = subscribeToChatMessages(targetThreadId, (messages) => {
          setChatThreads((current) =>
            current.map((t) => {
              if (t.id === targetThreadId) {
                return { ...t, messages };
              }
              return t;
            })
          );
        });
      }
    }
    return () => unsub();
  }, [navState.activeChatUserId, chatThreads.length]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onFinish={handleFinishSplash} />
        )}
      </AnimatePresence>

      {!showSplash && !isAuthenticated ? (
        <WelcomeAuthScreen theme={theme} onAuthenticate={handleAuthenticate} />
      ) : (
        !showSplash && (
          <DeviceFrame theme={theme} onThemeChange={handleUpdateTheme}>
      {/* Android Native Edge Swipe Back Handler & Visual Indicator */}
      <AndroidGestureBack onBack={goBack} canGoBack={canGoBack} />

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full neu-active-blue text-white text-xs font-bold shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top App Bar - hidden when in full-screen ChatActivity */}
      {activeTab !== 'chat' && (
        <TopAppBar
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          onOpenNotifications={openNotifications}
          onOpenChat={() => {
            navigateToTab('chat');
          }}
          onLogoClick={() => navigateToTab('home')}
        />
      )}

      {/* Main Tab Views */}
      <main className="w-full">
        <Suspense fallback={<LoadingSpinner />}>
          {activeTab === 'home' && (
            <HomeTab
              stories={stories}
              currentUser={currentUser}
              posts={posts}
              allUsers={users}
              onSelectStory={(index) => openStoryViewer(index)}
              onAddStory={handleAddStory}
              onLike={handleLikePost}
              onDislike={handleDislikePost}
              onReact={handleReaction}
              onEmojiReact={handleEmojiReaction}
              onCommentClick={(p) => openComments(p)}
              onShareClick={(p) => openShareSheet(p)}
              onOpenPost={openPostPreview}
              onUserClick={handleOpenProfile}
              onAddComment={handleAddComment}
              onToggleSave={handleToggleSavePost}
              onDeletePost={handleDeletePost}
              onHidePost={handleHidePost}
              onUpdateCaption={handleUpdateCaption}
              onShowToast={showToast}
              onLoadMore={handleLoadMorePosts}
              hasMore={hasMorePosts}
              isLoadingMore={isLoadingMorePosts}
            />
          )}

          {activeTab === 'search' && (
            <SearchTab
              users={users}
              onToggleFollow={handleToggleFollow}
              onOpenDirectChat={handleOpenDirectChat}
              onUserSelect={handleOpenProfile}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'upload' && (
            <UploadTab
              currentUser={currentUser}
              onClose={goBack}
              onPublishPost={handlePublishPost}
            />
          )}

          {activeTab === 'chat' && (
            <ChatTab
              threads={chatThreads}
              currentUser={currentUser}
              activeChatUserId={navState.activeChatUserId}
              onSelectThread={(threadId) => openChatThread(threadId)}
              onBackToList={closeChatThread}
              onBackToHome={goBack}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onReportMessage={handleReportMessage}
              onMarkMessageSeen={handleMarkMessageSeen}
              lockedChatUserIds={lockedChatUserIds}
              chatLockPasscode={chatLockPasscode}
              isChatLockEnabled={isChatLockEnabled}
              onShowToast={showToast}
              onOpenUserProfile={handleOpenProfile}
              onToggleFollow={handleToggleFollow}
              onToggleLockChat={handleToggleLockChat}
              onClearChat={handleClearChatThread}
              onToggleReaction={handleToggleMessageReaction}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onLeaveGroup={handleLeaveGroup}
              allUsers={users}
            />
          )}

            
          {activeTab === 'profile' && (
            <ProfileTab
              currentUser={currentUser}
              profileUser={currentProfileUser ? displayedProfileUser : null}
              userPosts={userPosts}
              savedPosts={savedPosts}
              onOpenSettings={() => openSettings('main')}
              onOpenThemeStudio={handleOpenThemeStudio}
              onUpdateUser={(updated) => {
                handleUpdateCurrentUser(updated);
              }}
              theme={theme}
              onUpdateTheme={handleUpdateTheme}
              onShowToast={showToast}
              onBack={popUserProfile}
              onToggleFollow={handleToggleFollow}
              onOpenDirectChat={handleOpenDirectChat}
              lockedChatUserIds={lockedChatUserIds}
              onToggleLockChat={handleToggleLockChat}
              onClearChat={handleClearChatThread}
              allUsers={users}
              onUserClick={handleOpenProfile}
              onLike={handleLikePost}
              onDislike={handleDislikePost}
              onReact={handleReaction}
              onEmojiReact={handleEmojiReaction}
              onCommentClick={(p) => openComments(p)}
              onShareClick={(p) => openShareSheet(p)}
              onOpenPost={openPostPreview}
              onAddComment={handleAddComment}
              onToggleSave={handleToggleSavePost}
              onDeletePost={handleDeletePost}
              onHidePost={handleHidePost}
              onUpdateCaption={handleUpdateCaption}
            />
          )}
        </Suspense>
      </main>

          {/* Floating Bottom Navigation (Hidden when in full-screen ChatActivity) */}
          {activeTab !== 'chat' && (
            <BottomNavigation
              activeTab={activeTab}
              onTabChange={(tab) => {
                navigateToTab(tab);
              }}
              unreadChatCount={unreadMessagesCount}
            />
          )}

          {/* Interactive Story Viewer Modal */}
          {navState.selectedStoryIndex !== null && (
            <StoryViewerModal
              stories={stories}
              initialIndex={navState.selectedStoryIndex}
              isOpen={navState.selectedStoryIndex !== null}
              currentUser={currentUser}
              allUsers={users}
              onClose={closeStoryViewer}
              onSendReply={(storyUserId, text) => {
                handleSendMessage(storyUserId, text);
                showToast('Reply sent to direct messages!');
                closeStoryViewer();
              }}
              onUserClick={handleOpenProfile}
              onToggleLike={handleToggleLikeStory}
              onStoryView={handleStoryView}
            />
          )}

          {/* Comments Drawer Modal */}
          <CommentsModal
            post={navState.activeCommentPost}
            currentUser={currentUser}
            isOpen={navState.activeCommentPost !== null}
            onClose={closeComments}
            onAddComment={handleAddComment}
            onUserClick={handleOpenProfile}
            onShowToast={showToast}
          />

          {/* Share Sheet Modal */}
          <ShareSheetModal
            post={navState.activeSharePost}
            users={users}
            isOpen={navState.activeSharePost !== null}
            onClose={closeShareSheet}
            onSendToContact={(userName) => {
              showToast(`Shared post with ${userName}!`);
            }}
          />

          {/* Notification Drawer */}
          <NotificationDrawer
            notifications={notifications}
            isOpen={navState.isNotificationOpen}
            onClose={closeNotifications}
            onMarkAllRead={() => {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              showToast('All notifications marked as read');
            }}
            onNotificationClick={handleNotificationClick}
            onViewPost={handleExplicitViewPost}
            onViewComments={handleExplicitViewComments}
            onOpenProfile={handleExplicitOpenProfile}
            onOpenChat={handleExplicitOpenChat}
          />

          {/* Settings & Preferences Modal */}
          <SettingsModal
            isOpen={navState.isSettingsOpen}
            initialSection={navState.settingsSection || 'main'}
            currentUser={currentUser}
            onClose={closeSettings}
            onUpdateUser={(updated) => {
              setCurrentUser((prev) => ({ ...prev, ...updated }));
            }}
            onShowToast={showToast}
            onResetData={() => {
              setCurrentUser(EMPTY_USER);
            }}
            users={users}
            chatThreads={chatThreads}
            onDeleteChatThreads={(ids) => {
              setChatThreads((prev) => prev.filter((t) => !ids.includes(t.id)));
            }}
            lockedChatUserIds={lockedChatUserIds}
            chatLockPasscode={chatLockPasscode}
            isChatLockEnabled={isChatLockEnabled}
            onUpdateLockedChatUserIds={handleUpdateLockedChatUserIds}
            onUpdateChatLockPasscode={handleUpdateChatLockPasscode}
            onUpdateChatLockEnabled={handleUpdateChatLockEnabled}
            theme={theme}
            onUpdateTheme={handleUpdateTheme}
            onLogout={handleLogout}
            permissionsState={permissionsState}
            onUpdatePermissions={setAllPermissions}
          />

          {/* Add / Create Story Modal */}
          <CreateStoryModal
            isOpen={isCreatingStory}
            onClose={() => setIsCreatingStory(false)}
            currentUser={currentUser}
            onPublishStory={handlePublishStory}
            onShowToast={showToast}
          />

          {/* Full Post View Modal with Android Back and In-Screen Back Support */}
          <FullPostModal
            post={posts.find((p) => p.id === navState.previewPost?.id) || navState.previewPost}
            currentUser={currentUser}
            isOpen={navState.previewPost !== null}
            onClose={closePostPreview}
            onLike={handleLikePost}
            onDislike={handleDislikePost}
            onReact={handleReaction}
            onEmojiReact={handleEmojiReaction}
            onAddComment={handleAddComment}
            onShareClick={(p) => openShareSheet(p)}
            onUserClick={handleOpenProfile}
            onToggleSave={handleToggleSavePost}
            onDeletePost={handleDeletePost}
            onHidePost={handleHidePost}
            onUpdateCaption={handleUpdateCaption}
            onShowToast={showToast}
          />
          </DeviceFrame>
        )
      )}
    </>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      sessionStorage.setItem('funshann_splash_shown', 'true');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#f4f7fb] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-[#5B9DFF] shadow-md">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2 font-['Outfit']">Funshann</h1>
          <p className="text-sm text-slate-500 max-w-xs mb-6">
            Something unexpected occurred. Tap below to refresh the experience.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl neu-active-blue text-white font-bold text-sm shadow-lg hover:brightness-105 active:scale-95 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <LanguageProvider>
          <PermissionAndMediaProvider>
            <NavigationProvider>
              <Suspense fallback={
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7fb]">
                  <div className="w-10 h-10 border-4 border-[#5B9DFF]/20 border-t-[#5B9DFF] rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 font-medium animate-pulse">Loading App...</p>
                </div>
              }>
                <AppContent />
              </Suspense>
            </NavigationProvider>
          </PermissionAndMediaProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </Router>
  );
}
