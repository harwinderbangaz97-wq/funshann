import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { TabType, User, Post, SettingsSection } from '../types';

export interface NavigationState {
  tab: TabType;
  tabHistory: TabType[];
  activeChatUserId: string | null;
  profileHistory: User[]; // Stack of visited user profiles (top is current)
  selectedStoryIndex: number | null;
  activeCommentPost: Post | null;
  activeSharePost: Post | null;
  isNotificationOpen: boolean;
  isSettingsOpen: boolean;
  settingsSection: SettingsSection;
  previewPost: Post | null;
  // Chat sub-overlays
  chatAttachmentOpen: boolean;
  chatWallpaperOpen: boolean;
  chatLightboxUrl: string | null;
  chatMenuOpen: boolean;
  // Profile sub-overlays
  isEditProfileOpen: boolean;
}

export interface NavigationContextType {
  navState: NavigationState;
  goBack: () => void;
  // Nav actions
  navigateToTab: (tab: TabType) => void;
  openUserProfile: (user: User, fromTab?: TabType) => void;
  popUserProfile: () => void;
  openChatThread: (userId: string) => void;
  closeChatThread: () => void;
  openStoryViewer: (index: number) => void;
  closeStoryViewer: () => void;
  openComments: (post: Post) => void;
  closeComments: () => void;
  openShareSheet: (post: Post) => void;
  closeShareSheet: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  openSettings: (section?: SettingsSection) => void;
  setSettingsSection: (section: SettingsSection) => void;
  closeSettings: () => void;
  openPostPreview: (post: Post) => void;
  closePostPreview: () => void;
  setChatAttachmentOpen: (open: boolean) => void;
  setChatWallpaperOpen: (open: boolean) => void;
  setChatLightboxUrl: (url: string | null) => void;
  setChatMenuOpen: (open: boolean) => void;
  setIsEditProfileOpen: (open: boolean) => void;
  resetNavigation: () => void;
  // Query helpers
  canGoBack: boolean;
  isRootScreen: boolean;
}

const initialNavState: NavigationState = {
  tab: 'home',
  tabHistory: ['home'],
  activeChatUserId: null,
  profileHistory: [],
  selectedStoryIndex: null,
  activeCommentPost: null,
  activeSharePost: null,
  isNotificationOpen: false,
  isSettingsOpen: false,
  settingsSection: 'main',
  previewPost: null,
  chatAttachmentOpen: false,
  chatWallpaperOpen: false,
  chatLightboxUrl: null,
  chatMenuOpen: false,
  isEditProfileOpen: false,
};

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: React.ReactNode;
  currentUser?: User;
  onShowToast?: (msg: string) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  currentUser,
  onShowToast,
}) => {
  const [navState, setNavState] = useState<NavigationState>(initialNavState);
  const stateRef = useRef<NavigationState>(navState);
  stateRef.current = navState;

  const lastBackPressTimeRef = useRef<number>(0);
  const historyDepthRef = useRef<number>(0);
  const isHandlingPopStateRef = useRef<boolean>(false);

  // Push entry into browser history stack whenever a new screen/modal is pushed forward
  const pushBrowserHistory = useCallback(() => {
    try {
      historyDepthRef.current += 1;
      window.history.pushState(
        { depth: historyDepthRef.current, timestamp: Date.now() },
        '',
        window.location.href
      );
    } catch {
      // ignore
    }
  }, []);

  // Check if we are at root
  const checkCanGoBack = (state: NavigationState): boolean => {
    // 1. Any sub-overlay open?
    if (
      state.chatLightboxUrl !== null ||
      state.chatAttachmentOpen ||
      state.chatWallpaperOpen ||
      state.chatMenuOpen ||
      state.previewPost !== null ||
      state.isEditProfileOpen
    ) {
      return true;
    }
    // 2. Any main modal / drawer open?
    if (
      state.selectedStoryIndex !== null ||
      state.activeCommentPost !== null ||
      state.activeSharePost !== null ||
      state.isNotificationOpen ||
      state.isSettingsOpen
    ) {
      return true;
    }
    // 3. Inside chat thread?
    if (state.activeChatUserId !== null) {
      return true;
    }
    // 4. In profile view stack (another user or navigated profile)?
    if (state.profileHistory.length > 0) {
      return true;
    }
    // 5. In non-home tab with history?
    if (state.tab !== 'home' || state.tabHistory.length > 1) {
      return true;
    }
    return false;
  };

  // Perform Android Back resolution step on the current state
  const resolveBackStep = useCallback((): boolean => {
    const s = stateRef.current;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // 1. Dismiss topmost floating lightboxes & popovers
    if (s.chatLightboxUrl !== null) {
      setNavState((prev) => ({ ...prev, chatLightboxUrl: null }));
      return true;
    }
    if (s.previewPost !== null) {
      setNavState((prev) => ({ ...prev, previewPost: null }));
      return true;
    }
    if (s.chatAttachmentOpen) {
      setNavState((prev) => ({ ...prev, chatAttachmentOpen: false }));
      return true;
    }
    if (s.chatWallpaperOpen) {
      setNavState((prev) => ({ ...prev, chatWallpaperOpen: false }));
      return true;
    }
    if (s.chatMenuOpen) {
      setNavState((prev) => ({ ...prev, chatMenuOpen: false }));
      return true;
    }
    if (s.isEditProfileOpen) {
      setNavState((prev) => ({ ...prev, isEditProfileOpen: false }));
      return true;
    }

    // 2. Dismiss full modals / drawers
    if (s.selectedStoryIndex !== null) {
      setNavState((prev) => ({ ...prev, selectedStoryIndex: null }));
      return true;
    }
    if (s.activeCommentPost !== null) {
      setNavState((prev) => ({ ...prev, activeCommentPost: null }));
      return true;
    }
    if (s.activeSharePost !== null) {
      setNavState((prev) => ({ ...prev, activeSharePost: null }));
      return true;
    }
    if (s.isNotificationOpen) {
      setNavState((prev) => ({ ...prev, isNotificationOpen: false }));
      return true;
    }
    if (s.isSettingsOpen) {
      if (s.settingsSection !== 'main') {
        // Go back to main settings section
        setNavState((prev) => ({ ...prev, settingsSection: 'main' }));
        return true;
      }
      setNavState((prev) => ({ ...prev, isSettingsOpen: false }));
      return true;
    }

    // 3. If in individual chat thread -> return to chat list
    if (s.activeChatUserId !== null) {
      setNavState((prev) => ({ ...prev, activeChatUserId: null }));
      return true;
    }

    // 4. If in nested Profile stack -> return to previous profile or previous tab
    if (s.profileHistory.length > 0) {
      if (s.profileHistory.length > 1) {
        // Pop current profile and show previous profile in chain
        const updated = [...s.profileHistory];
        updated.pop();
        setNavState((prev) => ({
          ...prev,
          profileHistory: updated,
        }));
        return true;
      } else {
        // Only 1 profile was pushed (e.g. from Search/Feed/Chat) -> pop it and return to previous tab
        const prevTab = s.tabHistory.length > 1 ? s.tabHistory[s.tabHistory.length - 2] : 'home';
        setNavState((prev) => ({
          ...prev,
          profileHistory: [],
          tab: prevTab,
        }));
        return true;
      }
    }

    // 5. If in non-home tab -> return to previous tab in tabHistory, or home
    if (s.tab !== 'home' || s.tabHistory.length > 1) {
      const history = [...s.tabHistory];
      if (history.length > 1) {
        history.pop(); // remove current tab
        const targetTab = history[history.length - 1] || 'home';
        setNavState((prev) => ({
          ...prev,
          tab: targetTab,
          tabHistory: history,
        }));
      } else {
        setNavState((prev) => ({
          ...prev,
          tab: 'home',
          tabHistory: ['home'],
        }));
      }
      return true;
    }

    // 6. At root screen (Home with no overlays)
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 2000) {
      // User pressed back twice within 2 seconds -> Allow native browser / app exit
      return false;
    } else {
      lastBackPressTimeRef.current = now;
      if (onShowToast) {
        onShowToast('Press back again to exit Funshann');
      }
      // Push state again so history entry buffer remains intact
      pushBrowserHistory();
      return true;
    }
  }, [onShowToast, pushBrowserHistory]);

  // Programmatic goBack function (used by UI back buttons, swipe gesture, and hardware keys)
  const goBack = useCallback(() => {
    if (checkCanGoBack(stateRef.current)) {
      // Execute the navigation back step synchronously
      isHandlingPopStateRef.current = true;
      resolveBackStep();

      // Safely synchronize window history stack
      try {
        if (historyDepthRef.current > 0) {
          historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
          window.history.back();
        }
      } catch {
        // ignore
      }

      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 150);
    } else {
      resolveBackStep();
    }
  }, [resolveBackStep]);

  // Listen for browser popstate (triggered by Android hardware back button & swipe back gesture)
  useEffect(() => {
    // Prime initial history state
    try {
      window.history.replaceState({ depth: 0, root: true }, '', window.location.href);
      pushBrowserHistory();
    } catch {
      // ignore
    }

    const handlePopState = (event: PopStateEvent) => {
      // If back step was already triggered programmatically by a UI click, ignore the echoing popstate
      if (isHandlingPopStateRef.current) {
        return;
      }

      if (historyDepthRef.current > 0) {
        historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      }

      resolveBackStep();
    };

    // Listen for Cordova / Capacitor / WebView hardware back button
    const handleCordovaBackButton = (e: Event) => {
      e.preventDefault();
      goBack();
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('backbutton', handleCordovaBackButton, false);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('backbutton', handleCordovaBackButton);
    };
  }, [resolveBackStep, goBack, pushBrowserHistory]);

  // Actions
  const navigateToTab = useCallback(
    (tab: TabType) => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setNavState((prev) => {
        if (prev.tab === tab && prev.profileHistory.length === 0 && prev.activeChatUserId === null) {
          return prev;
        }
        const updatedHistory = prev.tab === tab ? prev.tabHistory : [...prev.tabHistory, tab];
        return {
          ...prev,
          tab,
          tabHistory: updatedHistory,
          // Reset sub-screens when switching tab directly
          activeChatUserId: null,
          profileHistory: tab === 'profile' ? prev.profileHistory : [],
          chatAttachmentOpen: false,
          chatWallpaperOpen: false,
          chatMenuOpen: false,
          chatLightboxUrl: null,
          previewPost: null,
          isEditProfileOpen: false,
        };
      });
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const openUserProfile = useCallback(
    (user: User, fromTab?: TabType) => {
      if (!user) return;
      window.scrollTo({ top: 0, behavior: 'instant' });
      setNavState((prev) => {
        const currentUserId = currentUser?.id || '';
        const isSelf = user.id === currentUserId;
        const updatedHistory: TabType[] = prev.tab !== 'profile' ? [...prev.tabHistory, 'profile' as TabType] : prev.tabHistory;

        if (isSelf) {
          return {
            ...prev,
            tab: 'profile',
            tabHistory: updatedHistory,
            profileHistory: [],
            activeCommentPost: null,
            selectedStoryIndex: null,
            isNotificationOpen: false,
            previewPost: null,
          };
        }

        return {
          ...prev,
          tab: 'profile',
          tabHistory: updatedHistory,
          profileHistory: [...prev.profileHistory, user],
          activeCommentPost: null,
          selectedStoryIndex: null,
          isNotificationOpen: false,
          previewPost: null,
        };
      });
      pushBrowserHistory();
    },
    [currentUser?.id, pushBrowserHistory]
  );

  const popUserProfile = useCallback(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    goBack();
  }, [goBack]);

  const openChatThread = useCallback(
    (userId: string) => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setNavState((prev) => ({
        ...prev,
        tab: 'chat',
        tabHistory: prev.tab !== 'chat' ? [...prev.tabHistory, 'chat'] : prev.tabHistory,
        activeChatUserId: userId,
        chatAttachmentOpen: false,
        chatWallpaperOpen: false,
        chatMenuOpen: false,
      }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closeChatThread = useCallback(() => {
    setNavState((prev) => ({
      ...prev,
      activeChatUserId: null,
      chatAttachmentOpen: false,
      chatWallpaperOpen: false,
      chatMenuOpen: false,
    }));
  }, []);

  const openStoryViewer = useCallback(
    (index: number) => {
      setNavState((prev) => ({ ...prev, selectedStoryIndex: index }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closeStoryViewer = useCallback(() => {
    goBack();
  }, [goBack]);

  const openComments = useCallback(
    (post: Post) => {
      setNavState((prev) => ({ ...prev, activeCommentPost: post }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closeComments = useCallback(() => {
    goBack();
  }, [goBack]);

  const openShareSheet = useCallback(
    (post: Post) => {
      setNavState((prev) => ({ ...prev, activeSharePost: post }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closeShareSheet = useCallback(() => {
    goBack();
  }, [goBack]);

  const openNotifications = useCallback(() => {
    setNavState((prev) => ({ ...prev, isNotificationOpen: true }));
    pushBrowserHistory();
  }, [pushBrowserHistory]);

  const closeNotifications = useCallback(() => {
    goBack();
  }, [goBack]);

  const openSettings = useCallback(
    (section: SettingsSection = 'main') => {
      setNavState((prev) => ({
        ...prev,
        isSettingsOpen: true,
        settingsSection: section,
      }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const setSettingsSection = useCallback(
    (section: SettingsSection) => {
      setNavState((prev) => ({
        ...prev,
        settingsSection: section,
      }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closeSettings = useCallback(() => {
    goBack();
  }, [goBack]);

  const openPostPreview = useCallback(
    (post: Post) => {
      setNavState((prev) => ({ ...prev, previewPost: post }));
      pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const closePostPreview = useCallback(() => {
    goBack();
  }, [goBack]);

  const setChatAttachmentOpen = useCallback(
    (open: boolean) => {
      setNavState((prev) => ({ ...prev, chatAttachmentOpen: open }));
      if (open) pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const setChatWallpaperOpen = useCallback(
    (open: boolean) => {
      setNavState((prev) => ({ ...prev, chatWallpaperOpen: open }));
      if (open) pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const setChatLightboxUrl = useCallback(
    (url: string | null) => {
      setNavState((prev) => ({ ...prev, chatLightboxUrl: url }));
      if (url) pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const setChatMenuOpen = useCallback(
    (open: boolean) => {
      setNavState((prev) => ({ ...prev, chatMenuOpen: open }));
      if (open) pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const setIsEditProfileOpen = useCallback(
    (open: boolean) => {
      setNavState((prev) => ({ ...prev, isEditProfileOpen: open }));
      if (open) pushBrowserHistory();
    },
    [pushBrowserHistory]
  );

  const resetNavigation = useCallback(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    setNavState(initialNavState);
  }, []);

  const canGoBack = checkCanGoBack(navState);
  const isRootScreen = !canGoBack;

  return (
    <NavigationContext.Provider
      value={{
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
        setSettingsSection,
        closeSettings,
        openPostPreview,
        closePostPreview,
        setChatAttachmentOpen,
        setChatWallpaperOpen,
        setChatLightboxUrl,
        setChatMenuOpen,
        setIsEditProfileOpen,
        resetNavigation,
        canGoBack,
        isRootScreen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
