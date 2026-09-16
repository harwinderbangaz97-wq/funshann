import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  MoreHorizontal,
  Bookmark,
  Link2,
  Share2,
  Edit3,
  Trash2,
  Flag,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  X,
  SmilePlus,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User } from '../types';
import { UniversalReportModal } from './UniversalReportModal';
import { EmojiPickerPopup } from './EmojiPickerPopup';
import { StickerPickerModal } from './StickerPickerModal';
import { getRecentStickers, addRecentSticker } from '../utils/stickerUtils';

interface FullPostModalProps {
  post: Post | null;
  currentUser?: User;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (postId: string) => void;
  onDislike?: (postId: string) => void;
  onReact?: (postId: string, reaction: 'like' | 'dislike') => void;
  onEmojiReact?: (postId: string, emoji: string) => void;
  onAddComment?: (postId: string, text: string) => void;
  onShareClick?: (post: Post) => void;
  onUserClick?: (user: User) => void;
  onToggleSave?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onHidePost?: (postId: string) => void;
  onUpdateCaption?: (postId: string, newCaption: string) => void;
  onShowToast?: (message: string) => void;
}

export const FullPostModal: React.FC<FullPostModalProps> = ({
  post,
  currentUser,
  isOpen,
  onClose,
  onLike,
  onDislike,
  onReact,
  onEmojiReact,
  onShareClick,
  onUserClick,
  onToggleSave,
  onDeletePost,
  onUpdateCaption,
  onShowToast,
}) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReaction, setShowQuickReaction] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const quickReactionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post) {
      setIsSaved(Boolean(post.isSaved));
      setEditedCaption(post.caption || '');
    }
  }, [post]);

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

  if (!isOpen || !post) return null;

  const postAuthor = post.user || {
    id: post.userId || 'unknown',
    name: 'Funshann User',
    username: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isVerified: false,
  };

  const isOwnPost = Boolean(currentUser && (post.userId === currentUser.id || postAuthor.id === currentUser.id));

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
    }
    if (onShowToast) {
      onShowToast('Post deleted successfully');
    }
    onClose();
  };

  const isVideo =
    post.imageUrl.endsWith('.mp4') ||
    post.imageUrl.startsWith('data:video') ||
    post.imageUrl.includes('video');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-0 md:p-6 select-none overflow-hidden"
        onClick={onClose}
      >
        {/* Top Navigation Bar with Back & Post Management Menu */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer shadow-lg"
            aria-label="Back / Close"
          >
            <ArrowLeft className="w-5.5 h-5.5" />
          </motion.button>

          {/* Post Management Menu (3-Dot Action Button) */}
          <div className="relative" ref={menuRef}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition cursor-pointer shadow-lg"
              aria-label="Post management options"
            >
              <MoreHorizontal className="w-5.5 h-5.5" />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-13 w-60 rounded-2xl bg-white/98 backdrop-blur-md p-1.5 z-50 border border-slate-200 shadow-2xl space-y-0.5 text-left"
                  onClick={(e) => e.stopPropagation()}
                >
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
                    <span>{isSaved ? 'Remove from Saved' : 'Save Post'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <Link2 className="w-4.5 h-4.5 text-slate-500" />
                    <span>Copy Link</span>
                  </button>

                  {onShareClick && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onShareClick(post);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                    >
                      <Share2 className="w-4.5 h-4.5 text-slate-500" />
                      <span>Share Post</span>
                    </button>
                  )}

                  {isOwnPost ? (
                    <>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setEditedCaption(post.caption || '');
                          setIsEditingCaption(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-slate-700 hover:bg-blue-50 hover:text-[#5B9DFF] flex items-center gap-2.5 transition"
                      >
                        <Edit3 className="w-4.5 h-4.5 text-[#5B9DFF]" />
                        <span>Edit Caption</span>
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
                        <span>Delete Post</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowReportDialog(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl text-left text-[13.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2.5 transition"
                      >
                        <Flag className="w-4.5 h-4.5 text-rose-500" />
                        <span>Report Post</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Media Container */}
        <div
          className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-16 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative max-w-full max-h-[75vh] flex items-center justify-center">
            {isVideo ? (
              <video
                src={post.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
                controls
                autoPlay
                loop
                playsInline
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={post.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
                alt={post.caption || 'Post image'}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl select-none"
              />
            )}
          </div>

          {/* Post Footer Info / Caption Overlay */}
          <div className="absolute bottom-4 left-4 right-4 md:left-12 md:right-12 bg-black/60 backdrop-blur-md rounded-2xl p-4 text-white flex flex-col gap-2 max-w-2xl mx-auto border border-white/10">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => {
                  if (onUserClick) onUserClick(postAuthor as User);
                }}
              >
                <img
                  src={postAuthor.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={postAuthor.name}
                  loading="lazy"
                  decoding="async"
                  className="w-9 h-9 rounded-full object-cover border border-white/20"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">{postAuthor.name}</span>
                    {postAuthor.isVerified && <span className="text-blue-400 text-xs">✨</span>}
                  </div>
                  <span className="text-[10px] text-white/70">@{postAuthor.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (onReact) {
                      onReact(post.id, 'like');
                    } else if (onLike) {
                      onLike(post.id);
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/25 transition cursor-pointer ${
                    post.isLiked ? 'text-[#5B9DFF] bg-blue-500/20' : 'text-white'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-[#5B9DFF]' : ''}`} />
                  <span>{post.likesCount || 0}</span>
                </button>

                {(post.dislikesCount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onReact) {
                        onReact(post.id, 'dislike');
                      } else if (onDislike) {
                        onDislike(post.id);
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/25 transition cursor-pointer ${
                      post.isDisliked ? 'text-rose-400 bg-rose-500/20' : 'text-white/80'
                    }`}
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 ${post.isDisliked ? 'fill-rose-400' : ''}`} />
                    <span>{post.dislikesCount || 0}</span>
                  </button>
                )}

                {/* Emoji Reaction Trigger with 7 Stickers Quick Bar */}
                <div className="relative" ref={quickReactionRef}>
                  <button
                    type="button"
                    onClick={() => setShowQuickReaction((prev) => !prev)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition cursor-pointer ${
                      post.userEmojiReaction
                        ? 'bg-blue-500/30 text-blue-300 border border-[#5B9DFF]/40'
                        : 'bg-white/10 hover:bg-white/25 text-white'
                    }`}
                    title="React with sticker"
                  >
                    <SmilePlus className="w-3.5 h-3.5" />
                    <span>{post.userEmojiReaction || 'React'}</span>
                  </button>
                  <AnimatePresence>
                    {showQuickReaction && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -45 }}
                        animate={{ opacity: 1, scale: 1, y: -45 }}
                        exit={{ opacity: 0, scale: 0.8, y: -45 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute bottom-full left-0 z-40 flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-lg mb-2 whitespace-nowrap"
                      >
                        {recentStickers.map((sticker) => {
                          const isSelected = post.userEmojiReaction === sticker;
                          return (
                            <motion.button
                              key={sticker}
                              whileHover={{ scale: 1.25 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEmojiReact) {
                                  onEmojiReact(post.id, sticker);
                                }
                                addRecentSticker(sticker);
                                setShowQuickReaction(false);
                              }}
                              className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-base hover:bg-slate-100 transition-all cursor-pointer relative ${
                                isSelected ? 'bg-blue-100/90 ring-1 ring-[#5B9DFF]' : ''
                              }`}
                              title={`React with ${sticker}`}
                            >
                              <span>{sticker}</span>
                            </motion.button>
                          );
                        })}
                        {/* Plus button at the end of the bar */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQuickReaction(false);
                            setShowStickerModal(true);
                          }}
                          className="w-7.5 h-7.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                          title="More stickers..."
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/90">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Reactions badges row if reactions exist */}
            {Array.isArray(post.reactions) && post.reactions.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-1">
                {post.reactions.map((r) => {
                  const isReacted =
                    post.userEmojiReaction === r.emoji ||
                    (currentUser?.id && r.userIds?.includes(currentUser.id));
                  return (
                    <button
                      key={`modal_react_${r.emoji}`}
                      type="button"
                      onClick={() => {
                        if (onEmojiReact) {
                          onEmojiReact(post.id, r.emoji);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition cursor-pointer ${
                        isReacted
                          ? 'bg-blue-500/40 text-blue-200 border border-blue-400/50'
                          : 'bg-white/15 hover:bg-white/25 text-white/90'
                      }`}
                    >
                      <span className="text-sm">{r.emoji}</span>
                      <span className="text-[11px] font-bold">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {post.caption && (
              <p className="text-xs text-white/90 font-normal leading-relaxed line-clamp-2">
                {post.caption}
              </p>
            )}
          </div>
        </div>

        {/* Universal Report Modal */}
        {currentUser && (
          <UniversalReportModal
            isOpen={showReportDialog}
            contentType="post"
            contentId={post.id}
            targetUser={postAuthor as any}
            reporterUserId={currentUser.id}
            snippet={post.caption}
            mediaUrl={post.imageUrl}
            postId={post.id}
            onClose={() => setShowReportDialog(false)}
            onReportSubmitted={() => {
              setShowReportDialog(false);
              if (onShowToast) {
                onShowToast('Report submitted confidentially. Our safety team is reviewing.');
              }
            }}
            onShowToast={onShowToast}
          />
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-slate-800 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-slate-900">Delete Post?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This action cannot be undone and will permanently remove this post from your profile and feed.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-11 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 h-11 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition shadow-md cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Caption Modal */}
        <AnimatePresence>
          {isEditingCaption && (
            <div
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsEditingCaption(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Edit Caption</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingCaption(false)}
                    className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveEditedCaption} className="space-y-4">
                  <textarea
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    rows={4}
                    className="w-full neu-inset rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/40 resize-none"
                    placeholder="Write a caption..."
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingCaption(false)}
                      className="flex-1 h-11 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-11 rounded-full neu-active-blue text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {/* 7 Sticker Picker Modal */}
          <StickerPickerModal
            isOpen={showStickerModal}
            onClose={() => setShowStickerModal(false)}
            onSelectSticker={(emoji) => {
              if (onEmojiReact) {
                onEmojiReact(post.id, emoji);
              }
              addRecentSticker(emoji);
            }}
          />
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
