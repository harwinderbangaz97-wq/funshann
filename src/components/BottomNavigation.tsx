import React, { useState, useEffect } from 'react';
import { Home, Search, Plus, MessageCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { TabType } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadChatCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
}) => {
  const { t } = useTranslation();
  const [snapshotUnreadChatCount, setSnapshotUnreadChatCount] = useState<number | null>(null);

  // Real-time Firestore onSnapshot listener to compute total unread messages across active user chats
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participantIds', 'array-contains', currentUid),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let totalUnread = 0;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lastMsg = data.lastMessage;
            const isUnread =
              data.unread === true ||
              (lastMsg && lastMsg.isRead === false && lastMsg.senderId !== currentUid) ||
              (Array.isArray(data.readBy) && !data.readBy.includes(currentUid) && lastMsg && lastMsg.senderId !== currentUid);

            if (isUnread) {
              const count = typeof data.unreadCount === 'number' && data.unreadCount > 0 ? data.unreadCount : 1;
              totalUnread += count;
            }
          });
          setSnapshotUnreadChatCount(totalUnread);
        },
        (error) => {
          console.warn('BottomNavigation chat onSnapshot notice:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('BottomNavigation chat subscription error:', err);
    }
  }, []);

  const effectiveUnreadChatCount =
    snapshotUnreadChatCount !== null ? snapshotUnreadChatCount : unreadChatCount;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-3 pt-1.5 px-3.5">
      <div className="max-w-[400px] mx-auto pointer-events-auto">
        {/* Rounded white container with soft neumorphic floating bar */}
        <nav
          aria-label={t('nav_home')}
          className="relative neu-floating-bar rounded-[28px] px-3.5 py-2 flex items-center justify-between border border-white/80"
        >
          {/* 1. Home Button */}
          <motion.button
            id="nav-home-btn"
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange('home')}
            aria-label={t('nav_home')}
            title={t('nav_home')}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer select-none touch-manipulation transition-all duration-300 ${
              activeTab === 'home'
                ? 'neu-active-blue-soft text-[#5B9DFF] ring-2 ring-[#5B9DFF]/30'
                : 'neu-raised text-slate-500 hover:text-[#5B9DFF]'
            }`}
          >
            <Home
              className={`w-5.5 h-5.5 pointer-events-none transition-transform ${
                activeTab === 'home' ? 'stroke-[2.5] scale-105' : ''
              }`}
            />
            {activeTab === 'home' && (
              <motion.span
                layoutId="activeDot"
                className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#5B9DFF] pointer-events-none"
              />
            )}
          </motion.button>

          {/* 2. Search People Button */}
          <motion.button
            id="nav-search-btn"
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange('search')}
            aria-label={t('nav_search')}
            title={t('nav_search')}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer select-none touch-manipulation transition-all duration-300 ${
              activeTab === 'search'
                ? 'neu-active-blue-soft text-[#5B9DFF] ring-2 ring-[#5B9DFF]/30'
                : 'neu-raised text-slate-500 hover:text-[#5B9DFF]'
            }`}
          >
            <Search
              className={`w-5.5 h-5.5 pointer-events-none transition-transform ${
                activeTab === 'search' ? 'stroke-[2.5] scale-105' : ''
              }`}
            />
            {activeTab === 'search' && (
              <motion.span
                layoutId="activeDot"
                className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#5B9DFF] pointer-events-none"
              />
            )}
          </motion.button>

          {/* 3. Center Upload Media (+) Button: Elevated floating button */}
          <div className="relative -top-4 flex items-center justify-center">
            <motion.button
              id="nav-upload-btn"
              type="button"
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onTabChange('upload')}
              aria-label={t('nav_upload')}
              title={t('nav_upload')}
              className="relative w-14 h-14 rounded-full cursor-pointer select-none touch-manipulation neu-raised bg-gradient-to-tr from-white to-[#f8fafd] flex items-center justify-center ring-4 ring-[#eef3f9] shadow-lg text-[#5B9DFF] hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center shadow-md shadow-[#5B9DFF]/35 pointer-events-none">
                <Plus className="w-6.5 h-6.5 stroke-[3]" />
              </div>
            </motion.button>
          </div>

          
          {/* 4. Chat Button */}
          <motion.button
            id="nav-chat-btn"
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange('chat')}
            aria-label={t('nav_chat')}
            title={t('nav_chat')}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer select-none touch-manipulation transition-all duration-300 ${
              activeTab === 'chat'
                ? 'neu-active-blue-soft text-[#5B9DFF] ring-2 ring-[#5B9DFF]/30'
                : 'neu-raised text-slate-500 hover:text-[#5B9DFF]'
            }`}
          >
            <MessageCircle
              className={`w-5.5 h-5.5 pointer-events-none transition-transform ${
                activeTab === 'chat' ? 'stroke-[2.5] scale-105' : ''
              }`}
            />
            {effectiveUnreadChatCount > 0 && (
              <span
                id="bottom-nav-unread-chat-badge"
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-md ring-2 ring-white animate-pulse pointer-events-none"
              >
                {effectiveUnreadChatCount > 99 ? '99+' : effectiveUnreadChatCount}
              </span>
            )}
            {activeTab === 'chat' && (
              <motion.span
                layoutId="activeDot"
                className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#5B9DFF] pointer-events-none"
              />
            )}
          </motion.button>

          {/* 5. Profile Button */}
          <motion.button
            id="nav-profile-btn"
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange('profile')}
            aria-label={t('nav_profile')}
            title={t('nav_profile')}
            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-full cursor-pointer select-none touch-manipulation transition-all duration-300 ${
              activeTab === 'profile'
                ? 'neu-active-blue-soft text-[#5B9DFF] ring-2 ring-[#5B9DFF]/30'
                : 'neu-raised text-slate-500 hover:text-[#5B9DFF]'
            }`}
          >
            <UserIcon
              className={`w-5.5 h-5.5 pointer-events-none transition-transform ${
                activeTab === 'profile' ? 'stroke-[2.5] scale-105' : ''
              }`}
            />
            {activeTab === 'profile' && (
              <motion.span
                layoutId="activeDot"
                className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#5B9DFF] pointer-events-none"
              />
            )}
          </motion.button>
        </nav>
      </div>
    </div>
  );
};
