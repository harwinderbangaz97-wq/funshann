import React, { useEffect, useRef } from 'react';
import { StoriesSection } from '../StoriesSection';
import { FeedCard } from '../FeedCard';
import { User, Post, Story } from '../../types';
import { Loader2 } from 'lucide-react';

interface HomeTabProps {
  stories: Story[];
  currentUser: User;
  posts: Post[];
  onSelectStory: (index: number) => void;
  onAddStory: () => void;
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
  onReact: (postId: string, reaction: 'like' | 'dislike') => void;
  onEmojiReact?: (postId: string, emoji: string) => void;
  onCommentClick: (post: Post) => void;
  onShareClick: (post: Post) => void;
  onOpenPost: (post: Post) => void;
  onUserClick: (user: User) => void;
  onAddComment: (postId: string, text: string) => void;
  onToggleSave: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onHidePost: (postId: string) => void;
  onUpdateCaption: (postId: string, caption: string) => void;
  onShowToast: (msg: string) => void;
  allUsers?: User[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  stories,
  currentUser,
  posts,
  allUsers,
  onSelectStory,
  onAddStory,
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
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  onRefresh,
  isRefreshing = false,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDownDistance, setPullDownDistance] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const pull = Math.max(0, currentY - touchStartY.current);
      setPullDownDistance(Math.min(pull, 100));
      if (pull > 80 && onRefresh && !isRefreshing) {
        onRefresh().then(() => setPullDownDistance(0));
        touchStartY.current = 0;
      }
    }
  };

  const handleTouchEnd = () => {
    setPullDownDistance(0);
    touchStartY.current = 0;
  };

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '400px' }
    );

    const el = sentinelRef.current;
    if (el) {
      observer.observe(el);
    }
    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, [onLoadMore, hasMore, isLoadingMore]);

  return (
    <div 
        className="w-full pb-28 pt-1"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {isRefreshing && (
          <div className="w-full py-4 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#5B9DFF]" />
          </div>
      )}
      
      <StoriesSection
        stories={stories}
        currentUser={currentUser}
        onSelectStory={onSelectStory}
        onAddStory={onAddStory}
      />
      <div className="mt-3">
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            currentUser={currentUser}
            allUsers={allUsers}
            onLike={onLike}
            onDislike={onDislike}
            onReact={onReact}
            onEmojiReact={onEmojiReact}
            onCommentClick={onCommentClick}
            onShareClick={onShareClick}
            onOpenPost={onOpenPost}
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

      {/* Infinite scroll sentinel and subtle loader */}
      <div ref={sentinelRef} className="w-full py-4 flex items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#5B9DFF]" />
            <span>Loading more posts...</span>
          </div>
        )}
      </div>
    </div>
  );
};
