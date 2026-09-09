import React, { useState, useEffect, useCallback, Component, ErrorInfo, Suspense } from 'react';
import { deleteDoc } from 'firebase/firestore';
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
import { AuthProvider, useAuth } from './context/AuthContext';
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
  togglePostReactionInFirestore,
  hydratePostForUser,
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
  getStoriesFromFirestore,
  getUsersFromFirestore,
  getUserFollowingsFromFirestore,
  getUserFollowersFromFirestore,
  subscribeToFollows,
  checkUserExists,
  isPostByUserId,
  getUserPostsCountFromFirestore,
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

import { HomeTab } from './components/tabs/HomeTab';
import { SearchTab } from './components/tabs/SearchTab';
import { UploadTab } from './components/tabs/UploadTab';
import { ChatTab } from './components/tabs/ChatTab';
import { ProfileTab } from './components/tabs/ProfileTab';

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
    resetNavigation,
    canGoBack,
  } = useNavigation();
  const { user, loading, authInitialized } = useAuth();
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('funshann_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return {
            ...EMPTY_USER,
            ...parsed,
            avatar: parsed.avatar || DEFAULT_AVATAR,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load currentUser from localStorage:', e);
    }
    return EMPTY_USER;
  });

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    // Fetch following from Firestore
    getUserFollowingsFromFirestore(currentUser.id)
      .then((followings) => {
        if (followings) {
          setCurrentUser((prev) => {
            if (prev.followingCount === followings.length && JSON.stringify(prev.following) === JSON.stringify(followings)) return prev;
            return {
              ...prev,
              following: followings,
              followingCount: followings.length,
            };
          });
        }
      })
      .catch(console.warn);

    // Fetch followers from Firestore
    getUserFollowersFromFirestore(currentUser.id)
      .then((followers) => {
        if (followers) {
          setCurrentUser((prev) => {
            if (prev.followersCount === followers.length && JSON.stringify(prev.followers) === JSON.stringify(followers)) return prev;
            return {
              ...prev,
              followers,
              followersCount: followers.length,
            };
          });
        }
      })
      .catch(console.warn);

    // Subscribe to follows collection changes for real-time updates
    const unsubscribeFollows = subscribeToFollows(async (records) => {
      const myRecords = records.filter(
        (f) =>
          f.followerId === currentUser.id ||
          f.followerUid === currentUser.id ||
          f.followingId === currentUser.id ||
          f.followingUid === currentUser.id
      );

      const validFollowing = new Set<string>();
      const validFollowers = new Set<string>();

      for (const f of myRecords) {
        const isMeFollower =
          f.followerId === currentUser.id || f.followerUid === currentUser.id;
        const otherId = isMeFollower
          ? f.followingId || f.followingUid
          : f.followerId || f.followerUid;

        if (!otherId || otherId === currentUser.id) continue;

        const exists = await checkUserExists(otherId);
        if (exists) {
          if (isMeFollower) validFollowing.add(otherId);
          else validFollowers.add(otherId);
        } else {
          try {
            // Delete dangling ghost record directly
            await deleteDoc(doc(db, 'follows', f.id));
          } catch (e) {
            console.warn('Failed to delete dangling follow', e);
          }
        }
      }

      const myFollowingList = Array.from(validFollowing);
      const myFollowersList = Array.from(validFollowers);

      setCurrentUser((prev) => {
        if (
          prev.followingCount === myFollowingList.length &&
          prev.followersCount === myFollowersList.length &&
          JSON.stringify(prev.following) === JSON.stringify(myFollowingList) &&
          JSON.stringify(prev.followers) === JSON.stringify(myFollowersList)
        ) {
          return prev;
        }
        return {
          ...prev,
          following: myFollowingList,
          followingCount: myFollowingList.length,
          followers: myFollowersList,
          followersCount: myFollowersList.length,
        };
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          const isNowFollowing = myFollowingList.includes(u.id);
          if (u.isFollowing !== isNowFollowing) {
            return {
              ...u,
              isFollowing: isNowFollowing,
            };
          }
          return u;
        })
      );
    });

    return () => unsubscribeFollows();
  }, [currentUser?.id]);

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isUserDataReady, setIsUserDataReady] = useState<boolean>(false);
  const [initTimeoutReached, setInitTimeoutReached] = useState<boolean>(false);

  useEffect(() => {
    // Safety fallback so splash screen never hangs if network/offline issue occurs
    const timer = setTimeout(() => {
      setInitTimeoutReached(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  // The app is ready when Firebase auth has completed initialization,
  // AND either there is no logged-in user (ready for auth screen)
  // OR the logged-in user's profile data has finished loading from Firestore.
  const isAppReady = initTimeoutReached || (authInitialized && (!user || (Boolean(currentUser?.id) && isUserDataReady)));

  const handleAuthenticate = (user: Partial<User>) => {
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // Keep currentUser.postsCount synchronized with actual posts
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    const myPosts = posts.filter((p) => isPostByUserId(p, currentUser.id));
    setCurrentUser((prev) => {
      if (prev.postsCount === myPosts.length) return prev;
      return {
        ...prev,
        postsCount: myPosts.length,
      };
    });
  }, [currentUser?.id, posts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Re-fetch posts - assuming we want the latest from Firestore
    try {
        const freshPosts = await getPostsFromFirestore(15);
        if (freshPosts) {
            setPosts(freshPosts.map((p) => hydratePostForUser(p, currentUser)));
            setHasMorePosts(true);
        }
        showToast('Feed updated!');
    } catch (err) {
        console.error('Refresh error:', err);
        showToast('Failed to refresh feed');
    } finally {
        setIsRefreshing(false);
    }
  };

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
              map.set(p.id, hydratePostForUser(p, currentUser));
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
  }, [isLoadingMorePosts, hasMorePosts, currentUser]);

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
          setCurrentUser((prev) => {
            if (prev && prev.id) return prev;
            return {
              ...EMPTY_USER,
              id: user.uid,
              name: user.displayName || 'Funshann Member',
              username: (user.displayName || user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, ''),
              email: user.email || '',
              avatar: user.photoURL || DEFAULT_AVATAR,
            };
          });
        } finally {
          setIsUserDataReady(true);
        }
      } else {
        setCurrentUser(EMPTY_USER);
        setNotifications([]);
        setChatThreads([]);
        setIsUserDataReady(true);
        try {
          localStorage.removeItem('funshann_current_user');
        } catch {
          // ignore
        }
      }
    });

    // Initial fetch from Firestore to ensure existing posts, stories, and users load immediately
    getPostsFromFirestore(50).then((initialPosts) => {
      if (initialPosts && initialPosts.length > 0) {
        setPosts((prevPosts) => {
          const map = new Map<string, Post>();
          prevPosts.forEach((p) => map.set(p.id, p));
          initialPosts.forEach((p) => {
            if (p && p.id) {
              map.set(p.id, hydratePostForUser(p, currentUser));
            }
          });
          return Array.from(map.values()).sort((a, b) => {
            const timeA = a.createdAtMs || (a.id.startsWith('post_') ? parseInt(a.id.replace('post_', ''), 10) || 0 : 0);
            const timeB = b.createdAtMs || (b.id.startsWith('post_') ? parseInt(b.id.replace('post_', ''), 10) || 0 : 0);
            return timeB - timeA;
          });
        });
      }
    }).catch(console.warn);

    getStoriesFromFirestore().then((initialStories) => {
      if (initialStories && initialStories.length > 0) {
        setStories((prevStories) => {
          const map = new Map<string, Story>();
          prevStories.forEach((s) => map.set(s.id, s));
          initialStories.forEach((s) => {
            if (s && s.id) {
              map.set(s.id, s);
            }
          });
          return Array.from(map.values());
        });
      }
    }).catch(console.warn);

    getUsersFromFirestore(50).then((initialUsers) => {
      if (initialUsers && initialUsers.length > 0) {
        setUsers((prevUsers) => {
          const map = new Map<string, User>();
          prevUsers.forEach((u) => map.set(u.id, u));
          initialUsers.forEach((u) => {
            if (u && u.id) {
              map.set(u.id, u);
            }
          });
          return Array.from(map.values());
        });
      }
    }).catch(console.warn);

    // 2. Real-time Firestore Subscriptions for Posts, Stories, Chat Threads, Users, and Notifications
    const unsubPosts = subscribeToPosts((remotePosts) => {
      if (remotePosts) {
          setPosts((prevPosts) => {
            const map = new Map<string, Post>();
            // Keep local in-memory posts
            prevPosts.forEach((p) => map.set(p.id, p));
            // Overlay remote posts from Firestore hydrated for currentUser
            remotePosts.forEach((p) => {
              if (p && p.id) {
                map.set(p.id, hydratePostForUser(p, currentUser));
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

  // Re-hydrate all posts whenever currentUser identity changes (e.g. login/logout or profile load)
  useEffect(() => {
    setPosts((prevPosts) => prevPosts.map((p) => hydratePostForUser(p, currentUser)));
  }, [currentUser?.id, (currentUser as any)?.uid]);

  // Floating Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Like or Dislike Reaction on a Post (Atomic Firestore transaction with user-specific arrays)
  const handleReaction = async (postId: string, reaction: 'like' | 'dislike') => {
    const userId = currentUser.id || (currentUser as any).uid;
    if (!userId) {
      showToast('Please log in to react');
      return;
    }

    // 1. Optimistic Local State Update for instantaneous UI response
    setPosts((prevPosts) => {
      return prevPosts.map((target) => {
        if (target.id !== postId) return target;

        const currentLikes = Array.isArray(target.likes)
          ? target.likes.filter((id) => typeof id === 'string' && id.trim())
          : [];
        const currentDislikes = Array.isArray(target.dislikes)
          ? target.dislikes.filter((id) => typeof id === 'string' && id.trim())
          : [];

        const likesSet = new Set(currentLikes);
        const dislikesSet = new Set(currentDislikes);

        const isCurrentlyLiked = likesSet.has(userId);
        const isCurrentlyDisliked = dislikesSet.has(userId);

        if (reaction === 'like') {
          if (isCurrentlyLiked) {
            likesSet.delete(userId);
          } else {
            likesSet.add(userId);
            dislikesSet.delete(userId);
          }
        } else if (reaction === 'dislike') {
          if (isCurrentlyDisliked) {
            dislikesSet.delete(userId);
          } else {
            dislikesSet.add(userId);
            likesSet.delete(userId);
          }
        }

        const nextLikes = Array.from(likesSet);
        const nextDislikes = Array.from(dislikesSet);
        const nextLikesCount = nextLikes.length;
        const nextDislikesCount = nextDislikes.length;
        const nextIsLiked = nextLikes.includes(userId);
        const nextIsDisliked = nextDislikes.includes(userId);
        const nextUserReaction: 'like' | 'dislike' | null = nextIsLiked
          ? 'like'
          : nextIsDisliked
          ? 'dislike'
          : null;

        return {
          ...target,
          likes: nextLikes,
          dislikes: nextDislikes,
          likesCount: nextLikesCount,
          dislikesCount: nextDislikesCount,
          isLiked: nextIsLiked,
          isDisliked: nextIsDisliked,
          userReaction: nextUserReaction,
        };
      });
    });

    // Also update previewPost and activeCommentPost if currently open
    if (navState.previewPost && navState.previewPost.id === postId) {
      const p = navState.previewPost;
      const pLikes = new Set(
        Array.isArray(p.likes)
          ? p.likes.filter((id) => typeof id === 'string' && id.trim())
          : []
      );
      const pDislikes = new Set(
        Array.isArray(p.dislikes)
          ? p.dislikes.filter((id) => typeof id === 'string' && id.trim())
          : []
      );
      if (reaction === 'like') {
        if (pLikes.has(userId)) {
          pLikes.delete(userId);
        } else {
          pLikes.add(userId);
          pDislikes.delete(userId);
        }
      } else {
        if (pDislikes.has(userId)) {
          pDislikes.delete(userId);
        } else {
          pDislikes.add(userId);
          pLikes.delete(userId);
        }
      }
      const nLikes = Array.from(pLikes);
      const nDislikes = Array.from(pDislikes);
      const nIsLiked = nLikes.includes(userId);
      const nIsDisliked = nDislikes.includes(userId);
      openPostPreview({
        ...p,
        likes: nLikes,
        dislikes: nDislikes,
        likesCount: nLikes.length,
        dislikesCount: nDislikes.length,
        isLiked: nIsLiked,
        isDisliked: nIsDisliked,
        userReaction: nIsLiked ? 'like' : nIsDisliked ? 'dislike' : null,
      });
    }

    if (navState.activeCommentPost && navState.activeCommentPost.id === postId) {
      const c = navState.activeCommentPost;
      const cLikes = new Set(
        Array.isArray(c.likes)
          ? c.likes.filter((id) => typeof id === 'string' && id.trim())
          : []
      );
      const cDislikes = new Set(
        Array.isArray(c.dislikes)
          ? c.dislikes.filter((id) => typeof id === 'string' && id.trim())
          : []
      );
      if (reaction === 'like') {
        if (cLikes.has(userId)) {
          cLikes.delete(userId);
        } else {
          cLikes.add(userId);
          cDislikes.delete(userId);
        }
      } else {
        if (cDislikes.has(userId)) {
          cDislikes.delete(userId);
        } else {
          cDislikes.add(userId);
          cLikes.delete(userId);
        }
      }
      const nLikes = Array.from(cLikes);
      const nDislikes = Array.from(cDislikes);
      const nIsLiked = nLikes.includes(userId);
      const nIsDisliked = nDislikes.includes(userId);
      openComments({
        ...c,
        likes: nLikes,
        dislikes: nDislikes,
        likesCount: nLikes.length,
        dislikesCount: nDislikes.length,
        isLiked: nIsLiked,
        isDisliked: nIsDisliked,
        userReaction: nIsLiked ? 'like' : nIsDisliked ? 'dislike' : null,
      });
    }

    // 2. Atomic Firestore transaction so simultaneous reactions never overwrite each other
    try {
      const serverResult = await togglePostReactionInFirestore(postId, userId, reaction);
      if (serverResult) {
        setPosts((prevPosts) => {
          return prevPosts.map((target) => {
            if (target.id !== postId) return target;
            const nextLikes = serverResult.likes;
            const nextDislikes = serverResult.dislikes;
            const nextIsLiked = nextLikes.includes(userId);
            const nextIsDisliked = nextDislikes.includes(userId);
            const nextUserReaction: 'like' | 'dislike' | null = nextIsLiked
              ? 'like'
              : nextIsDisliked
              ? 'dislike'
              : null;
            return {
              ...target,
              likes: nextLikes,
              dislikes: nextDislikes,
              likesCount: serverResult.likesCount,
              dislikesCount: serverResult.dislikesCount,
              isLiked: nextIsLiked,
              isDisliked: nextIsDisliked,
              userReaction: nextUserReaction,
            };
          });
        });
      }
    } catch (err) {
      console.warn('Failed to sync post reaction to Firestore:', err);
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
    memberIds: string[],
    isPrivate?: boolean,
    category?: string
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
    skipFirestoreWrite?: boolean,
    images?: string[]
  ) => {
    const deterministicId = [currentUser.id, receiverId].sort().join('_');

    // Only perform write if not already performed by ChatView's explicit addDoc call
    if (!skipFirestoreWrite) {
      sendChatMessage(currentUser.id, receiverId, {
        text,
        imageUrl: imageUrl || (images && images[0]),
        images,
        voiceNote,
        privacyMode,
        isForwarded,
        forwardedFrom,
      }).catch(console.warn);
    }

    // Update thread preview metadata in thread list without pushing to local messages state
    setChatThreads((prevThreads) => {
      const count = images?.length || (imageUrl ? 1 : 0);
      const summaryText = voiceNote
        ? `Voice note (0:${voiceNote.durationSeconds < 10 ? '0' : ''}${voiceNote.durationSeconds})`
        : (text || (count > 1 ? `📷 ${count} photos` : (imageUrl ? '📷 Photo' : '')));

      const currentUid = currentUser.uid || currentUser.id;
      const lastMessageObj = {
        text: summaryText,
        imageUrl: imageUrl || (images && images[0]),
        images,
        mediaCount: count,
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
    } else if (voiceNote?.audioUrl && (voiceNote.audioUrl.startsWith('data:') || voiceNote.audioUrl.startsWith('blob:'))) {
      uploadChatMediaToStorage(currentUser.id, receiverId, voiceNote.audioUrl, 'audio')
        .then((downloadUrl) => {
          if (downloadUrl && downloadUrl !== voiceNote.audioUrl && !downloadUrl.startsWith('blob:')) {
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

  const profileUserPosts = posts.filter((p) => isPostByUserId(p, displayedUserId));

  const userPosts = profileUserPosts;
  const savedPosts = posts.filter((p) => p.isSaved);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = chatThreads
    .filter((t) => !(isChatLockEnabled && lockedChatUserIds.includes(t.participant?.id)))
    .reduce((acc, t) => acc + t.unreadCount, 0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      try {
        localStorage.removeItem('funshann_current_user');
      } catch (e) {
        console.warn('Failed to clear funshann_current_user from localStorage:', e);
      }
      setCurrentUser(EMPTY_USER);
      setNotifications([]);
      setChatThreads([]);
      resetNavigation();
      showToast('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Failed to log out');
    }
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
        {(showSplash || !isAppReady) && (
          <SplashScreen isReady={isAppReady} onFinish={handleFinishSplash} />
        )}
      </AnimatePresence>

      {!showSplash && isAppReady && !user ? (
        <WelcomeAuthScreen theme={theme} onAuthenticate={handleAuthenticate} />
      ) : (
        !showSplash && isAppReady && (
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
      <main className="w-full flex-1">
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
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'search' && (
            <SearchTab
              currentUser={currentUser}
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
    console.error('App ErrorBoundary caught error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
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
        <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center mb-4 border border-slate-100">
            <img src="/logo.png" alt="Funshann" className="w-12 h-12 rounded-full object-cover" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Funshann encountered a temporary issue</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">
            Tap below to resume and reload the app smoothly.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.handleReload();
            }}
            className="px-6 py-2.5 rounded-full bg-[#5B9DFF] text-white text-xs font-bold shadow-md hover:bg-blue-600 transition active:scale-95 cursor-pointer"
          >
            Reload Funshann
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
              <Suspense fallback={<SplashScreen isReady={false} />}>
                <AppContent />
              </Suspense>
            </NavigationProvider>
          </PermissionAndMediaProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </Router>
  );
}
