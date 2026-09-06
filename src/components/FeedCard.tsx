import React, { useState, useRef, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  CheckCircle2,
  MapPin,
  X,
  Link2,
  EyeOff,
  Bell,
  BellOff,
  Flag,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Smile,
  SmilePlus,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User, PostReaction } from '../types';
import { UniversalReportModal } from './UniversalReportModal';
import { EmojiPickerPopup } from './EmojiPickerPopup';
import { StickerPickerModal } from './StickerPickerModal';
import { getRecentStickers, addRecentSticker } from '../utils/stickerUtils';
import { useTranslation } from '../context/LanguageContext';
import { formatRelativeTime, formatDetailed12HourTime } from '../services/timeUtils';
import { useLongPress } from '../hooks/useLongPress';
import { EngagementUsersModal, EngagementModalType } from './EngagementUsersModal';

interface FeedCardProps {
  post: Post;
  currentUser: User;
  allUsers?: User[];
  onLike: (postId: string) => void;
  onDislike?: (postId: string) => void;
  onReact?: (postId: string, reaction: 'like' | 'dislike') => void;
  onEmojiReact?: (postId: string, emoji: string) => void;
  onCommentClick: (post: Post) => void;
  onShareClick: (post: Post) => void;
  onOpenPost?: (post: Post) => void;
  onUserClick?: (user: User) => void;
  onAddComment?: (postId: string, text: string) => void;
  onToggleSave?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onHidePost?: (postId: string) => void;
  onUpdateCaption?: (postId: string, newCaption: string) => void;
  onShowToast?: (message: string) => void;
}

interface ReactionPillItemProps {
  reaction: PostReaction;
  isUserReacted: boolean;
  onSelectEmoji: (emoji: string) => void;
  onOpenModal: (emoji: string) => void;
}

const ReactionPillItem: React.FC<ReactionPillItemProps> = ({
  reaction,
  isUserReacted,
  onSelectEmoji,
  onOpenModal,
}) => {
  const handlers = useLongPress({
    onLongPress: () => {
      onOpenModal(reaction.emoji);
    },
    onClick: () => {
      onSelectEmoji(reaction.emoji);
    },
    delay: 500,
  });

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      {...handlers}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer select-none ${
        isUserReacted
          ? 'bg-blue-50 border border-blue-200 text-[#2563eb] font-bold shadow-2xs ring-1 ring-blue-300/60'
          : 'bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 font-medium'
      }`}
      title={`${reaction.count} reaction${reaction.count === 1 ? '' : 's'} (Hold to view users)`}
    >
      <span className="text-sm leading-none">{reaction.emoji}</span>
      <span className="text-[11.5px] font-['Outfit']">{reaction.count}</span>
    </motion.button>
  );
};

const FeedCardComponent: React.FC<FeedCardProps> = ({
  post,
  currentUser,
  allUsers = [],
  onLike,
  onDislike,
  onReact,
  onEmojiReact,
  onCommentClick,
  onShareClick,
  onOpenPost,
  onUserClick,
  onAddComment,
  onToggleSave,
  onDeletePost,
  onHidePost,
  onUpdateCaption,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [commentInput, setCommentInput] = useState('');
  const [showLikeOverlay, setShowLikeOverlay] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReaction, setShowQuickReaction] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false); // POST REACTION sticker mode
  const [showCommentStickerModal, setShowCommentStickerModal] = useState(false); // COMMENT sticker mode
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [activeBurstEmoji, setActiveBurstEmoji] = useState<string | null>(null);
  const [engagementModal, setEngagementModal] = useState<{
    isOpen: boolean;
    type: EngagementModalType;
    initialFilterEmoji?: string | null;
  }>({
    isOpen: false,
    type: 'reactions',
    initialFilterEmoji: null,
  });
  const emojiPickerContainerRef = useRef<HTMLDivElement>(null);
  const quickReactionRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentUserId = currentUser?.id;
  const postAuthor: User = post.user || {
    id: post.userId || 'author_fallback',
    name: 'Funshann Member',
    username: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  };

  const authorAvatar =
    postAuthor.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const myAvatar =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  const mediaUrl =
    post.imageUrl && post.imageUrl.trim() !== ''
      ? post.imageUrl
      : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
  const postComments = Array.isArray(post.comments) ? post.comments : [];

  const handleSelectEmojiReaction = (emoji: string) => {
    if (onEmojiReact) {
      onEmojiReact(post.id, emoji);
    }
    setActiveBurstEmoji(emoji);
    setTimeout(() => setActiveBurstEmoji(null), 1200);
    setShowEmojiPicker(false);
  };

  // Long-press engagement handlers (~500ms opens modal; short tap triggers action)
  const likeLongPress = useLongPress({
    onLongPress: () => {
      setEngagementModal({
        isOpen: true,
        type: 'reactions',
        initialFilterEmoji: '👍',
      });
    },
    onClick: () => {
      if (onReact) {
        onReact(post.id, 'like');
      } else {
        onLike(post.id);
      }
    },
    delay: 500,
  });

  const commentsLongPress = useLongPress({
    onLongPress: () => {
      setEngagementModal({
        isOpen: true,
        type: 'comments',
      });
    },
    onClick: () => {
      onCommentClick(post);
    },
    delay: 500,
  });

  const commentsLinkLongPress = useLongPress({
    onLongPress: () => {
      setEngagementModal({
        isOpen: true,
        type: 'comments',
      });
    },
    onClick: () => {
      onCommentClick(post);
    },
    delay: 500,
  });

  const isOwnPost = Boolean(
    currentUserId && (post.userId === currentUserId || postAuthor.id === currentUserId)
  );

  // Extract URL from caption if present for high-performance link preview
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matchUrls = post.caption ? post.caption.match(urlRegex) : null;
  const sharedUrl = matchUrls ? matchUrls[0] : null;

  let domainName = '';
  let cleanUrlTitle = '';
  if (sharedUrl) {
    try {
      const parsedUrl = new URL(sharedUrl);
      domainName = parsedUrl.hostname.replace('www.', '');
      cleanUrlTitle = parsedUrl.pathname !== '/' ? parsedUrl.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') : domainName;
    } catch {
      domainName = sharedUrl;
      cleanUrlTitle = sharedUrl;
    }
  }

  const [ogData, setOgData] = useState<{
    title?: string;
    description?: string;
    image?: string;
    publisher?: string;
  } | null>(null);
  const [isLoadingOg, setIsLoadingOg] = useState<boolean>(false);

  useEffect(() => {
    if (!sharedUrl) {
      setOgData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingOg(true);

    fetch(`https://api.microlink.io?url=${encodeURIComponent(sharedUrl)}`)
      .then(res => res.json())
      .then(result => {
        if (!isMounted) return;
        if (result && result.status === 'success' && result.data) {
          setOgData({
            title: result.data.title,
            description: result.data.description,
            image: result.data.image?.url,
            publisher: result.data.publisher || domainName,
          });
        }
      })
      .catch(err => {
        console.warn('Failed to fetch Open Graph metadata:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOg(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sharedUrl, domainName]);

  // Sync isSaved when post prop updates
  useEffect(() => {
    setIsSaved(post.isSaved || false);
  }, [post.isSaved]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsMenu]);

  // Load recent stickers on mount or state change
  useEffect(() => {
    setRecentStickers(getRecentStickers());
  }, [showQuickReaction, showStickerModal]);

  // Close quick reaction on click outside
  useEffect(() => {
    const handleQuickReactionOutside = (e: MouseEvent) => {
      if (quickReactionRef.current && !quickReactionRef.current.contains(e.target as Node)) {
        setShowQuickReaction(false);
      }
    };
    if (showQuickReaction) {
      document.addEventListener('mousedown', handleQuickReactionOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleQuickReactionOutside);
    };
  }, [showQuickReaction]);

  // Media tap handling (Single tap -> Open Post, Double tap -> Like)
  const handleMediaTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      if (!post.isLiked) {
        if (onReact) {
          onReact(post.id, 'like');
        } else {
          onLike(post.id);
        }
      }
      setShowLikeOverlay(true);
      setTimeout(() => setShowLikeOverlay(false), 900);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        if (onOpenPost) {
          onOpenPost(post);
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleCardClick = () => {
    if (onOpenPost) {
      onOpenPost(post);
    }
  };

  const handleQuickCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!commentInput.trim() || !onAddComment) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput('');
    if (onShowToast) {
      onShowToast('Comment posted! 💬');
    }
  };

  const handleSaveToggle = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (onToggleSave) {
      onToggleSave(post.id);
    } else if (onShowToast) {
      onShowToast(nextSaved ? 'Saved to your collection! 🔖' : 'Removed from saved posts');
    }
  };

  const handleCopyLink = async () => {
    setShowOptionsMenu(false);
    const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl);
      }
    } catch {
      // Fallback
    }
    if (onShowToast) {
      onShowToast('Post link copied to clipboard! 📋');
    }
  };

  const handleToggleNotifications = () => {
    setShowOptionsMenu(false);
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    if (onShowToast) {
      onShowToast(
        nextState
          ? 'Post notifications turned on! 🔔'
          : 'Post notifications turned off'
      );
    }
  };

  const handleHide = () => {
    setShowOptionsMenu(false);
    if (onHidePost) {
      onHidePost(post.id);
    } else if (onShowToast) {
      onShowToast('Post hidden from your feed');
    }
  };

  const handleSaveEditedCaption = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCaption) {
      onUpdateCaption(post.id, editedCaption.trim());
    }
    setIsEditingCaption(false);
    if (onShowToast) {
      onShowToast('Caption updated successfully! ✨');
    }
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    if (onDeletePost) {
      onDeletePost(post.id);
    } else if (onShowToast) {
      onShowToast('Post deleted');
    }
  };

  const handleReport = (reason: string) => {
    setShowReportDialog(false);
    if (onShowToast) {
      onShowToast(`Report submitted: ${reason}. Thank you for keeping Funshann safe.`);
    }
  };

  const isVideo = post.imageUrl.endsWith('.mp4') || post.imageUrl.startsWith('data:video');

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="w-full max-w-[600px] md:max-w-[650px] mx-auto px-1 sm:px-2 mb-2"
    >
      <div
        className="w-full bg-white rounded-[24px] border border-slate-100/90 shadow-[0_2px_14px_rgba(0,0,0,0.05)] overflow-hidden transition-all group"
      >
        {/* Author Header */}
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-3 cursor-pointer group/user min-w-0 flex-1"
            onClick={(e) => {
              e.stopPropagation();
              if (onUserClick) onUserClick(postAuthor);
            }}
          >
            {/* Circular profile picture */}
            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-[#5B9DFF] to-blue-400 overflow-hidden flex-shrink-0 transition-transform group-hover/user:scale-105">
              <img
                src={authorAvatar}
                alt={postAuthor.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full rounded-full object-cover border border-white"
              />
            </div>

            {/* Username and details */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[15.5px] text-slate-900 tracking-tight group-hover/user:text-[#5B9DFF] transition-colors font-['Outfit'] truncate">
                  {postAuthor.name}
                </span>
                {postAuthor.isVerified && (
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#5B9DFF] fill-[#5B9DFF]/20 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-slate-500 min-w-0">
                <span className="truncate">@{postAuthor.username}</span>
                {post.location && (
                  <div className="relative inline-flex items-center flex-shrink-0">
                    <span className="text-slate-300">•</span>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLocation(!showLocation);
                      }}
                      title={`Location: ${post.location}`}
                      aria-label={`View location: ${post.location}`}
                      className="inline-flex items-center p-0.5 text-slate-400 hover:text-[#5B9DFF] transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#5B9DFF]" />
                    </motion.button>

                    {/* Full Location Popover on Tap */}
                    <AnimatePresence>
                      {showLocation && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -4 }}
                          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1.5 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-xl border border-white/15 whitespace-nowrap"
                        >
                          <MapPin className="w-4 h-4 text-[#5B9DFF] flex-shrink-0" />
                          <span>{post.location}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLocation(false);
                            }}
                            className="ml-1 w-4.5 h-4.5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time on right & options */}
          <div
            className="flex items-center gap-2 flex-shrink-0 relative"
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="text-[12.5px] font-medium text-slate-400 tracking-tight whitespace-nowrap"
              title={formatDetailed12HourTime(post.createdAtMs || post.timestamp)}
            >
              {formatRelativeTime(post.createdAtMs || post.timestamp)}
            </span>
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              aria-label="Post options"
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <MoreHorizontal className="w-5.5 h-5.5" />
            </motion.button>

            {/* 3-Dot Options Action Dropdown Menu */}
            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-11 w-60 rounded-2xl bg-white/98 backdrop-blur-md p-1.5 z-50 border border-slate-200 shadow-2xl space-y-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Save / Unsave */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      handleSaveToggle();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-blue-50 hover:text-[#5B9DFF] flex items-center gap-2.5 transition"
                  >
                    <Bookmark
                      className={`w-4.5 h-4.5 ${
                        isSaved ? 'fill-[#5B9DFF] text-[#5B9DFF]' : 'text-slate-500'
                      }`}
                    />
                    <span>{isSaved ? t('feed_remove_saved') : t('feed_save_button')}</span>
                  </button>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <Link2 className="w-4.5 h-4.5 text-slate-500" />
                    <span>{t('feed_copy_link')}</span>
                  </button>

                  {/* Share Post */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onShareClick(post);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <Share2 className="w-4.5 h-4.5 text-slate-500" />
                    <span>{t('feed_share_to')}</span>
                  </button>

                  {/* Post Notifications */}
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    {notificationsEnabled ? (
                      <BellOff className="w-4.5 h-4.5 text-slate-500" />
                    ) : (
                      <Bell className="w-4.5 h-4.5 text-slate-500" />
                    )}
                    <span>
                      {notificationsEnabled
                        ? t('feed_turn_off_notifications')
                        : t('feed_turn_on_notifications')}
                    </span>
                  </button>

                  {/* Own Post Actions: Edit & Delete */}
                  {isOwnPost ? (
                    <>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setEditedCaption(post.caption);
                          setIsEditingCaption(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-blue-50 hover:text-[#5B9DFF] flex items-center gap-2.5 transition"
                      >
                        <Edit3 className="w-4.5 h-4.5 text-[#5B9DFF]" />
                        <span>{t('feed_edit_caption')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                        <span>{t('feed_delete_post')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-slate-100 my-1" />
                      {/* Hide Post */}
                      <button
                        type="button"
                        onClick={handleHide}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                      >
                        <EyeOff className="w-4.5 h-4.5 text-slate-500" />
                        <span>{t('feed_hide_post')}</span>
                      </button>

                      {/* Report Post */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowReportDialog(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition"
                      >
                        <Flag className="w-4.5 h-4.5 text-rose-500" />
                        <span>{t('feed_report_post')}</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Middle: 4:5 Portrait Media Content with Floating Overlaid Engagement Controls */}
        <div className="px-1 sm:px-1.5 py-0">
          <div
            className="relative w-full aspect-[4/5] rounded-[22px] overflow-hidden bg-slate-950 cursor-pointer select-none shadow-xs"
            onClick={handleMediaTap}
          >
            {isVideo ? (
              <video
                src={mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={mediaUrl}
                alt={post.caption || 'Post image'}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'
                }`}
              />
            )}

            {/* Floating Emoji Reaction Burst Animation */}
            <AnimatePresence>
              {activeBurstEmoji && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0, y: 30 }}
                  animate={{ scale: [0.4, 1.4, 1.1], opacity: [0, 1, 0], y: -60 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30"
                >
                  <span className="text-6xl filter drop-shadow-2xl">{activeBurstEmoji}</span>
                  <span className="mt-2 text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-md shadow-lg">
                    Reaction Added!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Double-tap ThumbsUp Animation */}
            <AnimatePresence>
              {showLikeOverlay && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.3, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  <div className="w-18 h-18 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center shadow-2xl">
                    <ThumbsUp className="w-10 h-10 text-[#5B9DFF] fill-[#5B9DFF]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Overlaid Engagement Controls on Right Edge (Like, Dislike, Comments, Share) */}
            <div
              className="absolute bottom-3.5 right-3 sm:right-3.5 flex flex-col items-center gap-3.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 😊 Reaction Button with 7 Sticker popup */}
              <div className="relative flex flex-col items-center" ref={quickReactionRef}>
                <motion.button
                  id={`reaction-btn-${post.id}`}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuickReaction((prev) => !prev);
                  }}
                  aria-label="React with sticker"
                  title="React with sticker"
                  className="flex flex-col items-center gap-0.5 cursor-pointer group select-none touch-manipulation focus:outline-none animate-fade-in"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-[0_4px_14px_rgba(0,0,0,0.35)] ${
                      post.userEmojiReaction
                        ? 'bg-[#5B9DFF] text-white ring-2 ring-white/70 shadow-[0_4px_16px_rgba(91,157,255,0.5)]'
                        : 'bg-black/40 hover:bg-black/55 text-white border border-white/30'
                    }`}
                  >
                    {post.userEmojiReaction ? (
                      <span className="text-lg leading-none scale-110">{post.userEmojiReaction}</span>
                    ) : (
                      <Smile className="w-4.5 h-4.5 text-white group-hover:scale-110 drop-shadow-sm" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-white font-['Outfit'] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {post.userEmojiReaction ? 'Reacted' : 'React'}
                  </span>
                </motion.button>

                {/* 7 Recent/Most Used Stickers Quick Reaction Bar */}
                <AnimatePresence>
                  {showQuickReaction && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: 25, y: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0, y: -20 }}
                      exit={{ opacity: 0, scale: 0.8, x: 25, y: -20 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-12 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/90 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                    >
                      {recentStickers.map((sticker) => {
                        const isSelected = post.userEmojiReaction === sticker;
                        return (
                          <motion.button
                            key={sticker}
                            whileHover={{ scale: 1.25, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEmojiReaction(sticker);
                              addRecentSticker(sticker);
                              setShowQuickReaction(false);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-slate-100 transition-all cursor-pointer relative ${
                              isSelected ? 'bg-blue-100/90 ring-1 ring-[#5B9DFF]' : ''
                            }`}
                            title={`React with ${sticker}`}
                          >
                            <span>{sticker}</span>
                            {isSelected && (
                              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#5B9DFF]" />
                            )}
                          </motion.button>
                        );
                      })}
                      {/* Plus button at the end of the bar */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQuickReaction(false);
                          setShowStickerModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                        title="More stickers..."
                      >
                        <Plus className="w-4 h-4 text-slate-600" />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 👍 1. Like Action (Short tap: Like/Unlike, Long-press: Reacted/Liked by list) */}
              <motion.button
                id={`like-btn-${post.id}`}
                type="button"
                whileTap={{ scale: 0.88 }}
                {...likeLongPress}
                aria-label={post.isLiked ? 'Unlike (Hold to view likes)' : 'Like (Hold to view likes)'}
                title="Hold to see who liked or reacted"
                className="flex flex-col items-center gap-0.5 cursor-pointer group select-none touch-manipulation focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-[0_4px_14px_rgba(0,0,0,0.35)] ${
                    post.isLiked
                      ? 'bg-[#5B9DFF] text-white ring-2 ring-white/70 shadow-[0_4px_16px_rgba(91,157,255,0.5)]'
                      : 'bg-black/40 hover:bg-black/55 text-white border border-white/30'
                  }`}
                >
                  <ThumbsUp
                    className={`w-4.5 h-4.5 transition-transform ${
                      post.isLiked
                        ? 'fill-white text-white scale-110'
                        : 'text-white group-hover:scale-110 drop-shadow-sm'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-white font-['Outfit'] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {post.likesCount.toLocaleString()}
                </span>
              </motion.button>

              {/* 👎 2. Dislike Action */}
              <motion.button
                id={`dislike-btn-${post.id}`}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onReact) {
                    onReact(post.id, 'dislike');
                  } else if (onDislike) {
                    onDislike(post.id);
                  }
                }}
                aria-label={post.isDisliked ? 'Remove Dislike' : 'Dislike'}
                className="flex flex-col items-center gap-0.5 cursor-pointer group select-none touch-manipulation focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-[0_4px_14px_rgba(0,0,0,0.35)] ${
                    post.isDisliked
                      ? 'bg-rose-500 text-white ring-2 ring-white/70 shadow-[0_4px_16px_rgba(244,63,94,0.5)]'
                      : 'bg-black/40 hover:bg-black/55 text-white border border-white/30'
                  }`}
                >
                  <ThumbsDown
                    className={`w-4.5 h-4.5 transition-transform ${
                      post.isDisliked
                        ? 'fill-white text-white scale-110'
                        : 'text-white group-hover:scale-110 drop-shadow-sm'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-white font-['Outfit'] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {(post.dislikesCount || 0).toLocaleString()}
                </span>
              </motion.button>

              {/* 💬 3. Comments Action (Short tap: Open comments, Long-press: Commenters list) */}
              <motion.button
                id={`comment-btn-${post.id}`}
                type="button"
                whileTap={{ scale: 0.88 }}
                {...commentsLongPress}
                aria-label="Comments (Hold to view commenters)"
                title="Hold to see who commented"
                className="flex flex-col items-center gap-0.5 cursor-pointer group select-none touch-manipulation focus:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/55 text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                  <MessageCircle className="w-4.5 h-4.5 text-white transition-transform group-hover:scale-110 drop-shadow-sm" />
                </div>
                <span className="text-[11px] font-bold text-white font-['Outfit'] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {post.commentsCount}
                </span>
              </motion.button>

              {/* 📤 4. Share Action */}
              <motion.button
                id={`share-btn-${post.id}`}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onShareClick(post);
                }}
                aria-label={t('feed_share_button')}
                className="flex flex-col items-center gap-0.5 cursor-pointer group select-none touch-manipulation focus:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/55 text-white border border-white/30 backdrop-blur-md flex items-center justify-center transition-all shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                  <Share2 className="w-4.5 h-4.5 text-white transition-transform group-hover:scale-110 drop-shadow-sm" />
                </div>
                <span className="text-[11px] font-bold text-white font-['Outfit'] tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  {t('feed_share_button')}
                </span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Caption & Post Details Section Below Media */}
        <div className="px-4 pb-3.5 pt-1.5 space-y-2">
          {isEditingCaption ? (
            <form
              onSubmit={handleSaveEditedCaption}
              onClick={(e) => e.stopPropagation()}
              className="space-y-2"
            >
              <textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={2}
                className="w-full text-[14.5px] p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-[#5B9DFF] focus:bg-white"
                placeholder={t('feed_edit_caption')}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCaption(false)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#5B9DFF] text-white text-xs font-bold flex items-center gap-1 hover:bg-blue-600 shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {t('common_save')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1.5">
              {/* Main Caption Line */}
              <div className="text-[15px] text-slate-800 leading-relaxed font-normal">
                {isExpanded ? (
                  <span>{post.caption}</span>
                ) : (
                  <span>
                    {(post.caption || '').length > 75
                      ? `${(post.caption || '').slice(0, 72)}...`
                      : post.caption || ''}
                  </span>
                )}

                {/* Inline Read More */}
                {!isExpanded && (post.caption || '').length > 75 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                    }}
                    className="inline-flex items-center gap-0.5 text-[13px] font-bold text-slate-400 hover:text-[#5B9DFF] ml-1.5 transition cursor-pointer"
                  >
                    <span>{t('common_read_more')}</span>
                  </button>
                )}
              </div>

              {/* High-Performance Thumbnail Preview for Shared Links and Images with Open Graph Metadata */}
              {sharedUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2.5 p-2.5 rounded-2xl bg-slate-50/95 hover:bg-slate-100/90 border border-slate-200/80 flex items-center gap-3.5 cursor-pointer transition group/preview shadow-2xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(sharedUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 relative shadow-xs">
                    <img
                      src={ogData?.image || post.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'}
                      alt={ogData?.title || domainName}
                      className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover/preview:bg-transparent transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5B9DFF] uppercase tracking-wider mb-0.5">
                      <Link2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{ogData?.publisher || domainName}</span>
                    </div>
                    <h5 className="text-[13.5px] font-bold text-slate-800 truncate group-hover/preview:text-[#5B9DFF] transition-colors">
                      {ogData?.title || (cleanUrlTitle ? cleanUrlTitle : domainName)}
                    </h5>
                    <p className="text-[11.5px] text-slate-400 truncate">
                      {ogData?.description || sharedUrl}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500 group-hover/preview:bg-[#5B9DFF] group-hover/preview:text-white group-hover/preview:border-transparent transition-all flex-shrink-0 mr-1">
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
              )}

              {/* View Comments Link (Tap: comments, Hold: commenters list) */}
              {postComments.length > 0 && (
                <div>
                  <button
                    type="button"
                    {...commentsLinkLongPress}
                    title="Tap to view comments, hold to see commenters"
                    className="text-[13px] font-semibold text-slate-400 hover:text-[#5B9DFF] transition-colors cursor-pointer select-none"
                  >
                    {t('feed_comments_view_all', { count: postComments.length })}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Emoji Reaction Badges (Clean UI: Only Emoji Pills with Count, Long-press to view users list) */}
          {Array.isArray(post.reactions) && post.reactions.length > 0 && (
            <div className="pt-2 pb-0.5 flex items-center flex-wrap gap-1.5 min-w-0 border-t border-slate-100/90">
              {post.reactions.map((reaction) => {
                const isUserReacted =
                  post.userEmojiReaction === reaction.emoji ||
                  (currentUser?.id && reaction.userIds?.includes(currentUser.id));

                return (
                  <ReactionPillItem
                    key={`reaction_${reaction.emoji}`}
                    reaction={reaction}
                    isUserReacted={Boolean(isUserReacted)}
                    onSelectEmoji={handleSelectEmojiReaction}
                    onOpenModal={(emoji) => {
                      setEngagementModal({
                        isOpen: true,
                        type: 'reactions',
                        initialFilterEmoji: emoji,
                      });
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Clean Comments Input Box with Emoji Trigger */}
          <form
            onSubmit={handleQuickCommentSubmit}
            onClick={(e) => e.stopPropagation()}
            className="pt-1.5 flex items-center gap-2.5"
          >
            <div className="w-8.5 h-8.5 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 shadow-xs">
              <img
                src={myAvatar}
                alt="Me"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={t('feed_write_comment_placeholder')}
                className="w-full text-xs h-9 pl-3.5 pr-16 rounded-full neu-inset text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/40"
              />
              <div className="absolute right-1.5 flex items-center gap-1" ref={emojiPickerContainerRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker((prev) => !prev);
                  }}
                  className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-slate-400 hover:text-[#5B9DFF] hover:bg-slate-100 transition cursor-pointer"
                  title="Add reaction emoji"
                  aria-label="Add reaction emoji"
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommentStickerModal(true);
                  }}
                  className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-slate-400 hover:text-[#5B9DFF] hover:bg-slate-100 transition cursor-pointer"
                  title="Open sticker picker for comment"
                  aria-label="Open sticker picker for comment"
                >
                  <SmilePlus className="w-3.5 h-3.5" />
                </button>
                {commentInput.trim() && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    className="w-7.5 h-7.5 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-blue-600 transition"
                    aria-label="Post comment"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </motion.button>
                )}

                {/* Popup Emoji Picker Component (COMMENT sticker mode) */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <EmojiPickerPopup
                      selectedEmoji={null}
                      onSelectEmoji={(emoji) => {
                        if (onAddComment) {
                          onAddComment(post.id, emoji);
                          addRecentSticker(emoji);
                          if (onShowToast) {
                            onShowToast('Comment posted! 💬');
                          }
                        }
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                      align="right"
                      position="top"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-[26px] p-5 neu-flat text-center space-y-3 shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center neu-raised">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Delete Post?</h4>
              <p className="text-xs text-slate-500">
                This action cannot be undone and will permanently remove this post from your feed and profile.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 rounded-full neu-raised text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Universal 13-Reason Report Modal Dialog */}
      <UniversalReportModal
        isOpen={showReportDialog}
        contentType="post"
        contentId={post.id}
        targetUser={post.user}
        reporterUserId={currentUser.id}
        snippet={post.caption}
        mediaUrl={post.imageUrl}
        postId={post.id}
        onClose={() => setShowReportDialog(false)}
        onShowToast={onShowToast}
      />

      {/* Engagement Users List Modal (Reactions / Likes & Comments) */}
      <EngagementUsersModal
        isOpen={engagementModal.isOpen}
        onClose={() => setEngagementModal((prev) => ({ ...prev, isOpen: false }))}
        type={engagementModal.type}
        post={post}
        currentUser={currentUser}
        allUsers={allUsers}
        onUserClick={onUserClick}
        initialFilterEmoji={engagementModal.initialFilterEmoji}
      />

      {/* POST REACTION Sticker Picker Modal */}
      <StickerPickerModal
        isOpen={showStickerModal}
        onClose={() => setShowStickerModal(false)}
        onSelectSticker={(emoji) => {
          handleSelectEmojiReaction(emoji);
          addRecentSticker(emoji);
          setShowStickerModal(false);
        }}
      />

      {/* COMMENT Sticker Picker Modal */}
      <StickerPickerModal
        isOpen={showCommentStickerModal}
        onClose={() => setShowCommentStickerModal(false)}
        onSelectSticker={(sticker) => {
          if (onAddComment) {
            onAddComment(post.id, sticker);
            addRecentSticker(sticker);
            if (onShowToast) {
              onShowToast('Comment posted! 💬');
            }
          }
          setShowCommentStickerModal(false);
        }}
      />
    </motion.article>
  );
};

export const FeedCard = React.memo(FeedCardComponent);
