import { useState, useEffect } from 'react';
import { Post } from '../types';
import { getUserPostsFromFirestore, subscribeToUserPosts } from '../services/firebase';

export function useUserPosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userId === 'user_fallback') {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let isMounted = true;

    // 1. Initial complete fetch from Firestore without artificial limits
    getUserPostsFromFirestore(userId)
      .then((fetched) => {
        if (isMounted) {
          setPosts(fetched);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Failed to load user posts:', err);
          setError(err?.message || 'Failed to load posts');
          setLoading(false);
        }
      });

    // 2. Real-time Firestore listener to keep user posts reactive and synced
    const unsubscribe = subscribeToUserPosts(userId, (livePosts) => {
      if (isMounted) {
        setPosts((prev) => {
          const map = new Map<string, Post>();
          // Retain temporary optimistic local posts if not yet propagated
          prev.filter((p) => p.id && p.id.startsWith('post_')).forEach((p) => map.set(p.id, p));
          livePosts.forEach((p) => map.set(p.id, p));
          const list = Array.from(map.values());
          list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          return list;
        });
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userId]);

  return { posts, loading, error };
}

export default useUserPosts;
