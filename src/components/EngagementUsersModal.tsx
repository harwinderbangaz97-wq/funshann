import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ThumbsUp, MessageCircle, CheckCircle2, User as UserIcon, Heart } from 'lucide-react';
import { Post, User } from '../types';
import { DEFAULT_AVATAR, getUsersByIdsFromFirestore } from '../services/firebase';

export type EngagementModalType = 'reactions' | 'comments';

export interface EngagementUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: EngagementModalType;
  post: Post;
  currentUser?: User;
  allUsers?: User[];
  onUserClick?: (user: User) => void;
  initialFilterEmoji?: string | null;
}

interface ReactionUserItem {
  user: User;
  emoji: string;
  isLike?: boolean;
}

interface CommenterUserItem {
  user: User;
  commentCount: number;
  latestCommentText: string;
}

export const EngagementUsersModal: React.FC<EngagementUsersModalProps> = ({
  isOpen,
  onClose,
  type,
  post,
  currentUser,
  allUsers = [],
  onUserClick,
  initialFilterEmoji,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [asyncUsersMap, setAsyncUsersMap] = useState<Record<string, User>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Sync initial tab whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialFilterEmoji) {
        setSelectedTab(initialFilterEmoji);
      } else {
        setSelectedTab('all');
      }
    }
  }, [isOpen, initialFilterEmoji]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Resolve user by ID with fallbacks
  const resolveUser = (userId: string): User | null => {
    if (!userId) return null;
    if (currentUser && (currentUser.id === userId || (currentUser as any).uid === userId)) {
      return currentUser;
    }
    if (post.user && (post.user.id === userId || (post.user as any).uid === userId)) {
      return post.user;
    }
    if (asyncUsersMap[userId]) {
      return asyncUsersMap[userId];
    }
    const found = allUsers.find((u) => u.id === userId || (u as any).uid === userId);
    if (found) return found;

    return null;
  };

  // Compile reaction / like items
  const reactionItems = useMemo<ReactionUserItem[]>(() => {
    const items: ReactionUserItem[] = [];
    const seenUserEmoji = new Set<string>();

    // 1. If post has likes, add users who liked with thumbs-up 👍
    const likedUserIds = Array.isArray(post.likes) ? post.likes : [];
    if (post.isLiked && currentUser && !likedUserIds.includes(currentUser.id)) {
      likedUserIds.push(currentUser.id);
    }

    for (const uid of likedUserIds) {
      const key = `${uid}_👍`;
      if (!seenUserEmoji.has(key)) {
        seenUserEmoji.add(key);
        const resolved = resolveUser(uid) || {
          id: uid,
          name: uid === currentUser?.id ? currentUser.name : 'Funshann Member',
          username: uid === currentUser?.id ? currentUser.username : `user_${uid.slice(0, 6)}`,
          avatar: uid === currentUser?.id ? currentUser.avatar : DEFAULT_AVATAR,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
        };
        items.push({ user: resolved, emoji: '👍', isLike: true });
      }
    }

    // 2. Add users who reacted with emoji reactions
    if (Array.isArray(post.reactions)) {
      for (const reaction of post.reactions) {
        const uids = Array.isArray(reaction.userIds) ? reaction.userIds : [];
        // If current user has this emoji reaction
        if (
          post.userEmojiReaction === reaction.emoji &&
          currentUser &&
          !uids.includes(currentUser.id)
        ) {
          uids.push(currentUser.id);
        }

        for (const uid of uids) {
          const key = `${uid}_${reaction.emoji}`;
          if (!seenUserEmoji.has(key)) {
            seenUserEmoji.add(key);
            const resolved = resolveUser(uid) || {
              id: uid,
              name: uid === currentUser?.id ? currentUser.name : 'Funshann Member',
              username: uid === currentUser?.id ? currentUser.username : `user_${uid.slice(0, 6)}`,
              avatar: uid === currentUser?.id ? currentUser.avatar : DEFAULT_AVATAR,
              postsCount: 0,
              followersCount: 0,
              followingCount: 0,
            };
            items.push({ user: resolved, emoji: reaction.emoji });
          }
        }
      }
    }

    // 3. Fallback for mock/seed posts with likesCount > 0 but empty userIds array
    const targetLikesCount = post.likesCount || 0;
    const currentThumbsCount = items.filter((i) => i.emoji === '👍').length;
    if (targetLikesCount > currentThumbsCount) {
      const needed = Math.min(targetLikesCount - currentThumbsCount, 8);
      const candidates = allUsers.filter(
        (u) => u.id !== currentUser?.id && !items.some((i) => i.user.id === u.id)
      );
      for (let i = 0; i < Math.min(needed, candidates.length); i++) {
        items.push({ user: candidates[i], emoji: '👍', isLike: true });
      }
    }

    return items;
  }, [post, currentUser, allUsers, asyncUsersMap]);

  // Compile commenters list
  const commenterItems = useMemo<CommenterUserItem[]>(() => {
    const map = new Map<string, CommenterUserItem>();

    const rawComments = Array.isArray(post.comments) ? post.comments : [];
    for (const comment of rawComments) {
      const uid = comment.userId || comment.user?.id || 'unknown';
      const resolved =
        comment.user ||
        resolveUser(uid) || {
          id: uid,
          name: 'Funshann Member',
          username: `user_${uid.slice(0, 6)}`,
          avatar: DEFAULT_AVATAR,
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
        };

      const existing = map.get(resolved.id);
      if (existing) {
        existing.commentCount += 1;
        if (comment.text) existing.latestCommentText = comment.text;
      } else {
        map.set(resolved.id, {
          user: resolved,
          commentCount: 1,
          latestCommentText: comment.text || '',
        });
      }
    }

    // If commentsCount > 0 but comments array is empty (e.g. simulated post)
    if (map.size === 0 && (post.commentsCount || 0) > 0) {
      const candidates = allUsers.filter((u) => u.id !== currentUser?.id).slice(0, Math.min(post.commentsCount, 5));
      for (const c of candidates) {
        map.set(c.id, {
          user: c,
          commentCount: 1,
          latestCommentText: 'Great photo! ✨',
        });
      }
    }

    return Array.from(map.values());
  }, [post.comments, post.commentsCount, allUsers, currentUser, asyncUsersMap]);

  // Fetch missing user records from Firestore if needed
  useEffect(() => {
    if (!isOpen) return;

    const missingIds = new Set<string>();

    if (type === 'reactions') {
      const likedIds = Array.isArray(post.likes) ? post.likes : [];
      likedIds.forEach((id) => {
        if (!resolveUser(id)) missingIds.add(id);
      });
      if (Array.isArray(post.reactions)) {
        post.reactions.forEach((r) => {
          (r.userIds || []).forEach((id) => {
            if (!resolveUser(id)) missingIds.add(id);
          });
        });
      }
    } else {
      (post.comments || []).forEach((c) => {
        const uid = c.userId || c.user?.id;
        if (uid && !resolveUser(uid)) missingIds.add(uid);
      });
    }

    const idsToFetch = Array.from(missingIds);
    if (idsToFetch.length > 0) {
      setIsLoadingUsers(true);
      getUsersByIdsFromFirestore(idsToFetch, allUsers)
        .then((fetched) => {
          setAsyncUsersMap((prev) => {
            const next = { ...prev };
            fetched.forEach((u) => {
              if (u && u.id) next[u.id] = u;
            });
            return next;
          });
        })
        .catch(console.warn)
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isOpen, type, post, allUsers]);

  // Group reactions for tab pills
  const availableEmojiTabs = useMemo(() => {
    const tabs: { key: string; label: string; count: number; emoji?: string }[] = [];
    const totalCount = reactionItems.length;
    tabs.push({ key: 'all', label: 'All', count: totalCount });

    const thumbsLikesCount = reactionItems.filter((i) => i.emoji === '👍').length;
    if (thumbsLikesCount > 0 || (post.likesCount || 0) > 0) {
      tabs.push({
        key: '👍',
        label: 'Likes',
        emoji: '👍',
        count: Math.max(thumbsLikesCount, post.likesCount || 0),
      });
    }

    if (Array.isArray(post.reactions)) {
      for (const r of post.reactions) {
        if (r.emoji && r.emoji !== '👍') {
          tabs.push({
            key: r.emoji,
            label: r.emoji,
            emoji: r.emoji,
            count: r.count,
          });
        }
      }
    }

    return tabs;
  }, [reactionItems, post.likesCount, post.reactions]);

  // Filter reaction items by active tab
  const filteredReactionItems =
    selectedTab === 'all'
      ? reactionItems
      : selectedTab === 'likes' || selectedTab === '👍'
      ? reactionItems.filter((i) => i.emoji === '👍' || i.isLike)
      : reactionItems.filter((i) => i.emoji === selectedTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-[26px] shadow-2xl border border-slate-100 flex flex-col max-h-[82vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100/90 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center neu-raised ${
                  type === 'reactions'
                    ? 'text-rose-500 bg-rose-50/60'
                    : 'text-[#5B9DFF] bg-blue-50/60'
                }`}
              >
                {type === 'reactions' ? (
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-[#5B9DFF]" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-['Outfit'] flex items-center gap-1.5">
                  {type === 'reactions' ? 'Reacted / Liked by' : 'Commenters'}
                </h3>
                <p className="text-[11.5px] text-slate-500 font-medium">
                  {type === 'reactions'
                    ? `${reactionItems.length} total ${reactionItems.length === 1 ? 'reaction' : 'reactions'}`
                    : `${commenterItems.length} member${commenterItems.length === 1 ? '' : 's'} joined the conversation`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Reaction Tabs (only shown for reactions/likes) */}
          {type === 'reactions' && availableEmojiTabs.length > 1 && (
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-slate-50/40">
              {availableEmojiTabs.map((tab) => {
                const isActive = selectedTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                      isActive
                        ? 'bg-[#5B9DFF] text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 neu-raised'
                    }`}
                  >
                    {tab.emoji && <span className="text-sm leading-none">{tab.emoji}</span>}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* User List Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
            {isLoadingUsers && (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 font-medium gap-2">
                <div className="w-4 h-4 border-2 border-[#5B9DFF] border-t-transparent rounded-full animate-spin" />
                <span>Loading users...</span>
              </div>
            )}

            {/* Reactions Mode */}
            {type === 'reactions' && (
              <>
                {filteredReactionItems.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No reactions found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Be the first to react or like this post!
                    </p>
                  </div>
                ) : (
                  filteredReactionItems.map((item, idx) => (
                    <motion.div
                      key={`react_user_${item.user.id}_${item.emoji}_${idx}`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onClose();
                        onUserClick?.(item.user);
                      }}
                      className="flex items-center justify-between p-3 rounded-[18px] neu-raised hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.user.avatar || DEFAULT_AVATAR}
                            alt={item.user.name}
                            className="w-11 h-11 rounded-full object-cover neu-inset border border-slate-200/70"
                          />
                          {/* Corner mini emoji indicator on avatar */}
                          <span className="absolute -bottom-1 -right-1 text-xs w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center border border-slate-100">
                            {item.emoji}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate flex items-center gap-1 group-hover:text-[#5B9DFF] transition-colors">
                            {item.user.name}
                            {item.user.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9DFF] fill-current flex-shrink-0" />
                            )}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            @{item.user.username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-lg w-8.5 h-8.5 rounded-full bg-slate-50 neu-inset flex items-center justify-center">
                          {item.emoji}
                        </span>
                        <span className="text-xs font-semibold text-[#5B9DFF] group-hover:underline px-2 py-1">
                          View
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </>
            )}

            {/* Commenters Mode */}
            {type === 'comments' && (
              <>
                {commenterItems.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No commenters yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Be the first to share your thoughts on this post!
                    </p>
                  </div>
                ) : (
                  commenterItems.map((item) => (
                    <motion.div
                      key={`comment_user_${item.user.id}`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onClose();
                        onUserClick?.(item.user);
                      }}
                      className="flex items-center justify-between p-3 rounded-[18px] neu-raised hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <img
                          src={item.user.avatar || DEFAULT_AVATAR}
                          alt={item.user.name}
                          className="w-11 h-11 rounded-full object-cover neu-inset border border-slate-200/70 flex-shrink-0"
                        />

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate flex items-center gap-1 group-hover:text-[#5B9DFF] transition-colors">
                            {item.user.name}
                            {item.user.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9DFF] fill-current flex-shrink-0" />
                            )}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            @{item.user.username}
                          </p>
                          {item.latestCommentText && (
                            <p className="text-[11px] text-slate-500 italic truncate mt-0.5 max-w-[200px] sm:max-w-[240px]">
                              "{item.latestCommentText}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200/50">
                          {item.commentCount} {item.commentCount === 1 ? 'comment' : 'comments'}
                        </span>
                        <span className="text-xs font-semibold text-[#5B9DFF] group-hover:underline px-1.5 py-1">
                          View
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
