import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Heart,
  Send,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story, User } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeTime, formatDetailed12HourTime } from '../services/timeUtils';

interface FloatingHeart {
  id: number;
  x: number;
  scale: number;
  rot: number;
  color: string;
}

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex: number;
  isOpen: boolean;
  currentUser: User;
  allUsers?: User[];
  onClose: () => void;
  onSendReply?: (storyUserId: string, text: string) => void;
  onUserClick?: (user: User) => void;
  onToggleLike?: (storyId: string, isLiked: boolean) => void;
  onStoryView?: (storyId: string, viewer: User) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  isOpen,
  currentUser,
  allUsers,
  onClose,
  onSendReply,
  onUserClick,
  onToggleLike,
  onStoryView,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showCenterHeartAnim, setShowCenterHeartAnim] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [showAuthorActivitySheet, setShowAuthorActivitySheet] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'likes' | 'views'>('likes');

  const lastTapRef = useRef<number>(0);
  const heartIdCounter = useRef<number>(0);
  const recordedViewsRef = useRef<Set<string>>(new Set());

  // Sync state when story or index changes
  useEffect(() => {
    if (isOpen && stories[currentIndex]) {
      const current = stories[currentIndex];
      setLiked(!!current.isLiked);
      setLikesCount(current.likesCount ?? 0);
      setProgress(0);
      setReplyText('');
      setShowAuthorActivitySheet(false);
    }
  }, [isOpen, currentIndex, stories]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Track story view when viewed by user
  useEffect(() => {
    if (!isOpen || !stories[currentIndex] || !currentUser?.id) return;
    const activeStory = stories[currentIndex];
    if (!recordedViewsRef.current.has(activeStory.id)) {
      recordedViewsRef.current.add(activeStory.id);
      if (onStoryView) {
        onStoryView(activeStory.id, currentUser);
      }
    }
  }, [isOpen, currentIndex, stories, currentUser, onStoryView]);

  // Progress Bar timer
  useEffect(() => {
    if (!isOpen || isPaused || showAuthorActivitySheet) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 1.5;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, showAuthorActivitySheet, currentIndex, stories.length, onClose]);

  const currentStory = isOpen && stories[currentIndex] ? stories[currentIndex] : null;

  // Resolving real viewers list for the 'views' activity tab
  const storyViewersList: User[] = useMemo(() => {
    if (!currentStory) return [];
    const list: User[] = [];
    const seenUids = new Set<string>();

    // 1. Full user objects from viewers / viewedByUsers
    if (Array.isArray(currentStory.viewers)) {
      currentStory.viewers.forEach((v) => {
        if (v && v.id && !seenUids.has(v.id)) {
          seenUids.add(v.id);
          list.push(v);
        }
      });
    }

    // 2. Viewer IDs matched against allUsers or currentUser
    if (Array.isArray(currentStory.viewerIds)) {
      currentStory.viewerIds.forEach((uid) => {
        if (uid && !seenUids.has(uid)) {
          seenUids.add(uid);
          if (uid === currentUser?.id) {
            list.push(currentUser);
          } else {
            const found = allUsers?.find((u) => u.id === uid);
            if (found) {
              list.push(found);
            } else {
              list.push({
                id: uid,
                name: 'Funshann Member',
                username: `user_${uid.slice(0, 5)}`,
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                postsCount: 0,
                followersCount: 0,
                followingCount: 0,
              });
            }
          }
        }
      });
    }

    // 3. Current user viewed in this session
    if (currentUser?.id && !seenUids.has(currentUser.id)) {
      if (recordedViewsRef.current.has(currentStory.id)) {
        list.push(currentUser);
      }
    }

    return list;
  }, [currentStory, currentUser, allUsers]);

  // Views count: accurately derived from story document or recorded viewers
  const viewsCount = useMemo(() => {
    if (!currentStory) return 0;
    const fromDoc = currentStory.viewsCount ?? 0;
    const fromIds = currentStory.viewerIds?.length ?? 0;
    const fromList = storyViewersList.length;
    return Math.max(fromDoc, fromIds, fromList);
  }, [currentStory, storyViewersList.length]);

  // Liked by users list for activity view
  const likedByList = useMemo(() => {
    if (!currentStory) return [];
    return currentStory.likedBy && currentStory.likedBy.length > 0
      ? currentStory.likedBy
      : liked && currentUser
      ? [currentUser]
      : [];
  }, [currentStory, liked, currentUser]);

  const isAuthor = Boolean(
    currentStory &&
      (currentStory.userId === currentUser.id || currentStory.user?.id === currentUser.id)
  );

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  // Spawn floating heart particles
  const spawnFloatingHearts = () => {
    const colors = ['#f43f5e', '#fb7185', '#ec4899', '#f43f5e', '#e11d48'];
    const newHearts: FloatingHeart[] = Array.from({ length: 6 }).map(() => ({
      id: ++heartIdCounter.current,
      x: (Math.random() - 0.5) * 60,
      scale: 0.8 + Math.random() * 0.6,
      rot: (Math.random() - 0.5) * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setFloatingHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setFloatingHearts((prev) =>
        prev.filter((h) => !newHearts.some((nh) => nh.id === h.id))
      );
    }, 1200);
  };

  // Trigger Like / Heart Reaction
  const handleToggleLike = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(nextCount);

    if (nextLiked) {
      setShowCenterHeartAnim(true);
      spawnFloatingHearts();
      setTimeout(() => setShowCenterHeartAnim(false), 900);
    }

    if (onToggleLike) {
      onToggleLike(currentStory.id, nextLiked);
    }
  };

  // Double tap gesture on media
  const handleMediaTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> Like story
      if (!liked) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
        if (onToggleLike) {
          onToggleLike(currentStory.id, true);
        }
      }
      setShowCenterHeartAnim(true);
      spawnFloatingHearts();
      setTimeout(() => setShowCenterHeartAnim(false), 900);
    }
    lastTapRef.current = now;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onSendReply) {
      onSendReply(currentStory.userId, replyText);
    }
    setReplyText('');
  };

  const storyUser: User = currentStory.user || {
    id: currentStory.userId || 'story_user',
    name: 'Story User',
    username: 'user',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  };
  const storyUserAvatar =
    storyUser.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-0 sm:p-4">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-sm h-full sm:h-[840px] max-h-[95vh] bg-black sm:rounded-[32px] overflow-hidden flex flex-col justify-between shadow-2xl select-none"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Background Story Image / Media */}
          <div
            className="absolute inset-0 z-0 cursor-pointer"
            onClick={handleMediaTap}
          >
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
            {/* Top & Bottom gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85 pointer-events-none" />
          </div>

          {/* Center Heart Pop Animation (on Double Tap or Heart Tap) */}
          <AnimatePresence>
            {showCenterHeartAnim && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.35, 1.15], opacity: [0, 1, 1] }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <div className="relative flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="absolute w-28 h-28 rounded-full bg-rose-500/30 blur-md"
                  />
                  <div className="w-24 h-24 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                    <Heart className="w-14 h-14 text-rose-500 fill-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Heart Particles (Float up from bottom right) */}
          <div className="absolute inset-y-0 right-4 z-30 pointer-events-none overflow-hidden w-28">
            <AnimatePresence>
              {floatingHearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  initial={{
                    opacity: 1,
                    y: 650,
                    x: heart.x,
                    scale: 0.5,
                    rotate: 0,
                  }}
                  animate={{
                    opacity: [1, 0.9, 0],
                    y: 200,
                    x: heart.x + (Math.sin(heart.id) * 30),
                    scale: heart.scale,
                    rotate: heart.rot,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  className="absolute bottom-20 right-4"
                >
                  <Heart
                    className="w-6 h-6 drop-shadow-md"
                    style={{ fill: heart.color, color: heart.color }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Top Progress Bars & Header */}
          <div className="relative z-20 px-4 pt-4 pb-2">
            {/* Progress Bars */}
            <div className="flex gap-1.5 mb-3">
              {stories.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{
                      width:
                        idx === currentIndex
                          ? `${progress}%`
                          : idx < currentIndex
                          ? '100%'
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User Info Bar */}
            <div className="flex items-center justify-between">
              <div
                onClick={() => {
                  if (onUserClick) {
                    onUserClick(storyUser);
                    onClose();
                  }
                }}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full ring-2 ring-[#9333EA] p-0.5 overflow-hidden bg-white shadow group-hover:scale-105 transition-transform">
                  <img
                    src={storyUserAvatar}
                    alt={storyUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white tracking-wide group-hover:underline">
                      {isAuthor ? 'Your Story' : storyUser.name}
                    </span>
                    {storyUser.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#9333EA] fill-white" />
                    )}
                  </div>
                  <span
                    className="text-xs text-white/70"
                    title={formatDetailed12HourTime(currentStory.createdAtMs || currentStory.timestamp)}
                  >
                    {formatRelativeTime(currentStory.createdAtMs || currentStory.timestamp)}
                  </span>
                </div>
              </div>

              {/* Top Controls: Total Views Counter + Total Like Count Badge for Author + Close Button */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Views Counter Badge in Header */}
                {isAuthor ? (
                  <motion.button
                    id="story-author-views-badge"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setActiveActivityTab('views');
                      setShowAuthorActivitySheet(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/25 border border-purple-400/40 backdrop-blur-md text-white text-xs font-bold shadow-md hover:bg-purple-500/35 transition cursor-pointer"
                    title="View story viewers"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-300" />
                    <span>
                      {viewsCount} {viewsCount === 1 ? 'view' : 'views'}
                    </span>
                  </motion.button>
                ) : (
                  <div
                    id="story-viewer-views-badge"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-md text-white text-xs font-semibold shadow-md"
                    title={`${viewsCount} ${viewsCount === 1 ? 'user watched' : 'users watched'}`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#9333EA]" />
                    <span>
                      {viewsCount} {viewsCount === 1 ? 'view' : 'views'}
                    </span>
                  </div>
                )}

                {/* Author Like Count Badge in Header */}
                {isAuthor && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      setActiveActivityTab('likes');
                      setShowAuthorActivitySheet(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/25 border border-rose-400/40 backdrop-blur-md text-white text-xs font-bold shadow-md hover:bg-rose-500/35 transition cursor-pointer"
                    title="View story likes"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
                    <span>
                      {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                    </span>
                  </motion.button>
                )}

                {/* Close Button */}
                <button
                  id="close-story-btn"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition cursor-pointer"
                  aria-label="Close story"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Left/Right Tap Target Zones for Navigation */}
          <div className="absolute inset-y-16 inset-x-0 z-10 flex pointer-events-auto">
            <button
              onClick={handlePrev}
              aria-label="Previous Story"
              className="w-1/3 h-full cursor-pointer focus:outline-none flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </div>
            </button>
            <div className="w-1/3 h-full" onClick={handleMediaTap} />
            <button
              onClick={handleNext}
              aria-label="Next Story"
              className="w-1/3 h-full cursor-pointer focus:outline-none flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center">
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* Bottom Area: Caption + Interactive Heart Reaction / Author Like Viewer */}
          <div className="relative z-20 px-4 pb-6 pt-3 space-y-3">
            {/* Story Caption */}
            {currentStory.caption && (
              <p className="text-sm font-medium text-white/95 drop-shadow-md text-center max-h-16 overflow-y-auto px-2">
                {currentStory.caption}
              </p>
            )}

            {/* AUTHOR VIEW: Total Like Count & Insights Bar */}
            {isAuthor ? (
              <div className="space-y-2">
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuthorActivitySheet(true)}
                  className="w-full p-3 rounded-[20px] bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-between shadow-lg cursor-pointer hover:bg-white/25 transition group"
                >
                  {/* Total Likes Highlight */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-rose-500/30 flex items-center justify-center text-rose-400">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {likesCount} {likesCount === 1 ? t('story_heart_reaction_single') : t('story_heart_reactions')}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/70 block">
                        {likesCount > 0 ? t('story_insights_tap') : t('story_no_likes_yet')}
                      </span>
                    </div>
                  </div>

                  {/* Views & Drawer Trigger */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 text-[11px] font-semibold text-white/90">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>{viewsCount}</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center text-white transition">
                      <ChevronUp className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* VIEWER VIEW: Reply Input + Heart Reaction Button */
              <form onSubmit={handleSend} className="flex items-center gap-2.5">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('story_reply_placeholder', { name: storyUser.name })}
                    className="w-full h-11 pl-4 pr-10 text-sm text-white placeholder-white/60 bg-white/20 backdrop-blur-lg rounded-full border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#9333EA]/60"
                  />
                  {replyText.trim() && (
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#9333EA] text-white flex items-center justify-center hover:bg-purple-700 transition"
                      aria-label="Send reply"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Heart Reaction Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.8 }}
                  onClick={handleToggleLike}
                  className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-lg border transition-all duration-300 cursor-pointer shadow-lg ${
                    liked
                      ? 'bg-rose-500 border-rose-400 text-white shadow-rose-500/40'
                      : 'bg-white/20 text-white border-white/25 hover:bg-white/30 hover:scale-105'
                  }`}
                  aria-label={liked ? t('story_unlike') : t('story_like')}
                  title={liked ? t('story_unlike') : t('story_like')}
                >
                  <Heart
                    className={`w-5 h-5 transition-transform duration-300 ${
                      liked
                        ? 'fill-white text-white scale-110'
                        : 'text-white'
                    }`}
                  />
                </motion.button>
              </form>
            )}
          </div>

          {/* Author Story Activity / Liked By Drawer Sheet */}
          <AnimatePresence>
            {showAuthorActivitySheet && (
              <div
                className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end"
                onClick={() => setShowAuthorActivitySheet(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                  className="bg-white rounded-t-[28px] p-5 shadow-2xl max-h-[75vh] flex flex-col overflow-hidden text-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Sheet Drag Indicator & Header */}
                  <div className="flex flex-col items-center mb-3">
                    <div className="w-10 h-1.5 rounded-full bg-slate-200 mb-3" />
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                          <Heart className="w-4 h-4 fill-rose-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{t('story_activity_title')}</h3>
                          <p className="text-[11px] text-slate-500">
                            {likesCount} {likesCount === 1 ? t('common_likes') : t('common_likes')} • {viewsCount} {t('common_views')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAuthorActivitySheet(false)}
                        className="w-7 h-7 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Activity Tabs */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-[14px] mb-3">
                    <button
                      onClick={() => setActiveActivityTab('likes')}
                      className={`flex-1 py-1.5 rounded-[11px] text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeActivityTab === 'likes'
                          ? 'bg-white text-rose-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500" />
                      <span>{t('story_activity_liked_tab', { count: likedByList.length })}</span>
                    </button>
                    <button
                      onClick={() => setActiveActivityTab('views')}
                      className={`flex-1 py-1.5 rounded-[11px] text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        activeActivityTab === 'views'
                          ? 'bg-white text-[#9333EA] shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-[#9333EA]" />
                      <span>{t('story_activity_views_tab', { count: viewsCount })}</span>
                    </button>
                  </div>

                  {/* List Content */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px] max-h-[300px]">
                    {activeActivityTab === 'likes' ? (
                      likedByList.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-2">
                            <Heart className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{t('story_activity_no_reactions')}</p>
                          <p className="text-[11px] text-slate-400">{t('story_activity_no_reactions_desc')}</p>
                        </div>
                      ) : (
                        likedByList.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2.5 rounded-[16px] hover:bg-slate-50 transition"
                          >
                            <div
                              onClick={() => {
                                if (onUserClick) {
                                  onUserClick(user);
                                  setShowAuthorActivitySheet(false);
                                  onClose();
                                }
                              }}
                              className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                            >
                              <div className="relative w-9 h-9 rounded-full flex-shrink-0">
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center ring-2 ring-white">
                                  <Heart className="w-2.5 h-2.5 fill-white" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate">
                                  {user.name}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate">
                                  @{user.username}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-rose-500" />
                              {t('story_liked_label')}
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      /* Viewers List */
                      storyViewersList.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#9333EA] flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{t('story_activity_no_views') || 'No views yet'}</p>
                          <p className="text-[11px] text-slate-400">
                            {t('story_activity_no_views_desc') || 'When members watch this story, they will appear here.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {storyViewersList.map((viewer, i) => (
                            <div
                              key={`story_viewer_${viewer.id}_${i}`}
                              className="flex items-center justify-between p-2.5 rounded-[16px] hover:bg-slate-50 transition"
                            >
                              <div
                                onClick={() => {
                                  if (onUserClick) {
                                    onUserClick(viewer);
                                    setShowAuthorActivitySheet(false);
                                    onClose();
                                  }
                                }}
                                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                              >
                                <img
                                  src={
                                    viewer.avatar ||
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                                  }
                                  alt={viewer.name}
                                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-800 truncate">
                                    {viewer.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    @{viewer.username}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[#9333EA] bg-purple-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Eye className="w-3 h-3 text-[#9333EA]" />
                                {t('story_viewed_label')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

