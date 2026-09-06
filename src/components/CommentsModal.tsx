import React, { useState } from 'react';
import { X, Send, Heart, CheckCircle2, MoreHorizontal, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User, Comment } from '../types';
import { UniversalReportModal } from './UniversalReportModal';
import { formatRelativeTime, formatDetailed12HourTime } from '../services/timeUtils';

interface CommentsModalProps {
  post: Post | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
  onUserClick?: (user: User) => void;
  onShowToast?: (msg: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  post,
  currentUser,
  isOpen,
  onClose,
  onAddComment,
  onUserClick,
  onShowToast,
}) => {
  const [commentText, setCommentText] = useState('');
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [selectedCommentForReport, setSelectedCommentForReport] = useState<Comment | null>(null);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);

  if (!isOpen || !post) return null;

  const postAuthor: User = post.user || {
    id: post.userId || 'author_fallback',
    name: 'Funshann Member',
    username: 'user',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  };
  const commentsList = Array.isArray(post.comments) ? post.comments : [];
  const currentAvatar =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  const handleUserSelect = (user?: User) => {
    if (user && onUserClick) {
      onUserClick(user);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText('');
  };

  const handleToggleCommentLike = (commentId: string) => {
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full max-w-lg neu-flat rounded-t-[32px] sm:rounded-[32px] max-h-[88vh] h-[580px] flex flex-col p-5 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/90">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 font-['Outfit']">
                Comments
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#5B9DFF]/15 text-[#5B9DFF] text-xs font-bold">
                {commentsList.length}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </motion.button>
          </div>

          {/* Original Post mini summary */}
          <div className="py-3 px-1 flex items-start gap-3 border-b border-slate-100">
            <div
              onClick={() => handleUserSelect(postAuthor)}
              className="w-9 h-9 rounded-full neu-raised p-0.5 flex-shrink-0 cursor-pointer hover:scale-105 transition"
            >
              <img
                src={postAuthor.avatar}
                alt={postAuthor.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="flex-1 text-xs">
              <span
                onClick={() => handleUserSelect(postAuthor)}
                className="font-bold text-slate-900 mr-1.5 cursor-pointer hover:text-[#5B9DFF] transition"
              >
                {postAuthor.name}
              </span>
              <span className="text-slate-700">{post.caption}</span>
              <div
                className="text-[11px] text-slate-400 mt-1"
                title={formatDetailed12HourTime(post.createdAtMs || post.timestamp)}
              >
                {formatRelativeTime(post.createdAtMs || post.timestamp)}
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3.5">
            {commentsList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No comments yet. Be the first to share your thoughts!
              </div>
            ) : (
              commentsList.map((comment) => {
                const commentUser: User = comment.user || {
                  id: comment.userId || 'user',
                  name: 'Member',
                  username: 'user',
                  avatar:
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  postsCount: 0,
                  followersCount: 0,
                  followingCount: 0,
                };
                const isCommentLiked = likedComments[comment.id] || comment.isLiked;
                return (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-3 px-1"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div
                        onClick={() => handleUserSelect(commentUser)}
                        className="w-8.5 h-8.5 rounded-full neu-raised p-0.5 flex-shrink-0 cursor-pointer hover:scale-105 transition"
                      >
                        <img
                          src={commentUser.avatar}
                          alt={commentUser.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => handleUserSelect(commentUser)}
                            className="text-xs font-bold text-slate-800 cursor-pointer hover:text-[#5B9DFF] transition"
                          >
                            {commentUser.name}
                          </span>
                          {commentUser.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9DFF] fill-[#5B9DFF]/20" />
                          )}
                          <span
                            className="text-[10px] text-slate-400 ml-1"
                            title={formatDetailed12HourTime((comment as any).createdAtMs || comment.timestamp)}
                          >
                            {formatRelativeTime((comment as any).createdAtMs || comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-700 mt-0.5 leading-relaxed">
                          {comment.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Like comment"
                        onClick={() => handleToggleCommentLike(comment.id)}
                        className="flex flex-col items-center text-slate-400 hover:text-rose-500 pt-1 transition"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isCommentLiked ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                        {(comment.likesCount > 0 || isCommentLiked) && (
                          <span className="text-[10px] font-bold mt-0.5 text-slate-500">
                            {comment.likesCount + (isCommentLiked && !comment.isLiked ? 1 : 0)}
                          </span>
                        )}
                      </button>

                      {/* Comment Options Dropdown Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenCommentMenuId(openCommentMenuId === comment.id ? null : comment.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          aria-label="Comment options"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 pointer-events-none" />
                        </button>

                        {openCommentMenuId === comment.id && (
                          <div className="absolute right-0 top-8 z-30 w-36 bg-white rounded-2xl p-1.5 shadow-xl border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenCommentMenuId(null);
                                setSelectedCommentForReport(comment);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-rose-500" />
                              <span>Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Universal Report Modal for Comments */}
          {selectedCommentForReport && (
            <UniversalReportModal
              isOpen={Boolean(selectedCommentForReport)}
              contentType="comment"
              contentId={selectedCommentForReport.id}
              targetUser={selectedCommentForReport.user}
              reporterUserId={currentUser?.id || 'anonymous'}
              snippet={selectedCommentForReport.text}
              postId={post.id}
              onClose={() => setSelectedCommentForReport(null)}
              onShowToast={onShowToast}
            />
          )}

          {/* Clean Comments Input Field */}
          <form
            onSubmit={handleSubmit}
            className="pt-3 flex items-center gap-2.5 border-t border-slate-100/90"
          >
            <div className="w-9 h-9 rounded-full neu-raised overflow-hidden flex-shrink-0">
              <img
                src={currentAvatar}
                alt="Me"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative flex-1 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full text-sm h-12 pl-4 pr-12 rounded-full neu-inset text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/40"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <motion.button
                  type="submit"
                  disabled={!commentText.trim()}
                  whileTap={{ scale: 0.9 }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    commentText.trim()
                      ? 'neu-active-blue text-white shadow-md cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  aria-label="Send comment"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
