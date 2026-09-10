import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, DEFAULT_AVATAR, getUserProfileFromFirestore } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  authInitialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authInitialized: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [userProfile, setUserProfile] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('funshann_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.uid)) {
          return parsed;
        }
      }
    } catch {}
    const fbUser = auth.currentUser;
    if (fbUser) {
      const name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
      const avatar = fbUser.photoURL || DEFAULT_AVATAR;
      return {
        id: fbUser.uid,
        name,
        username: (name || `user_${fbUser.uid.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, ''),
        avatar,
        email: fbUser.email || '',
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      setAuthInitialized(true);

      if (firebaseUser) {
        // 1. Instantly extract displayName and photoURL directly from the authenticated Firebase user
        const extractedName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '';
        const extractedAvatar = firebaseUser.photoURL || DEFAULT_AVATAR;
        const extractedUsername = (extractedName || `user_${firebaseUser.uid.slice(0, 6)}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '');

        let cached: Partial<User> = {};
        try {
          const raw = localStorage.getItem('funshann_current_user');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (parsed.id === firebaseUser.uid || parsed.uid === firebaseUser.uid)) {
              cached = parsed;
            }
          }
        } catch {}

        const instantProfile: User = {
          id: firebaseUser.uid,
          name: (cached.name && cached.name !== 'Funshann Member' && cached.name.trim())
            ? cached.name
            : (extractedName || 'User'),
          username: (cached.username && cached.username !== 'user' && cached.username.trim())
            ? cached.username
            : extractedUsername,
          avatar: (cached.avatar && cached.avatar !== DEFAULT_AVATAR && cached.avatar.trim())
            ? cached.avatar
            : extractedAvatar,
          email: firebaseUser.email || cached.email || '',
          bio: cached.bio || 'Building real connections on Funshann 📸✨',
          postsCount: cached.postsCount ?? 0,
          followersCount: cached.followersCount ?? 0,
          followingCount: cached.followingCount ?? 0,
          following: cached.following || [],
          followers: cached.followers || [],
          isVerified: Boolean(cached.isVerified),
        };

        // Instantly store in state memory and localStorage
        setUserProfile(instantProfile);
        try {
          localStorage.setItem('funshann_current_user', JSON.stringify(instantProfile));
        } catch {}

        // 2. Update state asynchronously when the Firestore user document finishes fetching
        getUserProfileFromFirestore(firebaseUser.uid)
          .then((remote) => {
            if (remote) {
              setUserProfile((prev) => {
                const merged: User = {
                  ...(prev || instantProfile),
                  ...remote,
                  id: firebaseUser.uid,
                  name: remote.name || prev?.name || extractedName || 'User',
                  avatar: remote.avatar || prev?.avatar || extractedAvatar || DEFAULT_AVATAR,
                  username: remote.username || prev?.username || extractedUsername,
                  email: remote.email || firebaseUser.email || prev?.email || '',
                };
                try {
                  localStorage.setItem('funshann_current_user', JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          })
          .catch(console.warn);
      } else {
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, authInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
