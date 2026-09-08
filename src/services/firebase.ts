import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  FacebookAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromCache,
  getDocsFromCache,
  getDocFromServer,
  deleteDoc,
  updateDoc,
  runTransaction,
  increment,
  arrayUnion,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  addDoc,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  StorageReference,
} from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { User, Post, Story, ChatThread, Message, NotificationItem, UserReportItem, BugReportItem } from '../types';
import { UniversalReportItem } from '../types/safety';
import { parseTimestampToMs, formatRelativeTime, format12HourTime, formatDetailed12HourTime } from './timeUtils';

// Exact live Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCMiX4Gx8vqrFFqfl3XBsLfMZI5hCpySDg",
  authDomain: "gen-lang-client-0528558677.firebaseapp.com",
  projectId: "gen-lang-client-0528558677",
  storageBucket: "gen-lang-client-0528558677.firebasestorage.app",
  messagingSenderId: "585330478854",
  appId: "1:585330478854:web:7d80fe760d21cfcc8e9887"
};

// Initialize single Firebase App instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize single Firebase Auth instance
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence setting error:', err);
});
export { 
  onAuthStateChanged, 
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signOut,
  doc,
  collection,
  setDoc,
  serverTimestamp
};

// Suppress verbose SDK internal transport warnings
try {
  setLogLevel('error');
} catch {
  // Ignored
}

// Initialize single Firestore instance with persistent local cache (IndexedDB multi-tab)
const customDatabaseId = (firebaseAppletConfig as any)?.firestoreDatabaseId || 'ai-studio-socialapp-62fabc41-f69f-4729-9770-35262e6cbe5b';
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalAutoDetectLongPolling: true,
      },
      customDatabaseId
    );
  } catch (err) {
    console.warn('initializeFirestore with persistentLocalCache notice:', err);
    try {
      return getFirestore(app, customDatabaseId);
    } catch (e) {
      console.warn('getFirestore fallback notice:', e);
      return getFirestore(app, customDatabaseId);
    }
  }
})();

// Validate initial connection as recommended by Firebase SDK guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline fallback active.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize single Firebase Cloud Storage instance
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

// Lazy-initialize Firebase Cloud Storage client safely
let storageClient: any = null;
export const getStorageClient = () => {
  if (!storageClient) {
    try {
      storageClient = storage;
    } catch (e) {
      try {
        storageClient = getStorage(app);
      } catch (err) {
        console.warn('Firebase Storage initialization note:', err);
        return null;
      }
    }
  }
  return storageClient;
};

// ==========================================
// Network Resilience & Error Suppression
// ==========================================
// Prevent benign network/offline rejection errors from bubbling up to console crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    if (
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('network change') ||
      errorMsg.includes('ERR_NETWORK_CHANGED') ||
      errorMsg.includes('NetworkError') ||
      errorMsg.includes('transport errored') ||
      errorMsg.includes('offline') ||
      errorMsg.includes('unavailable') ||
      errorMsg.includes('INTERNAL ASSERTION FAILED')
    ) {
      event.preventDefault();
    }
  });
}

// Keep an authenticated session active and resolve instantly if available
export const ensureFirebaseAuth = async (): Promise<FirebaseUser | null> => {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(user || auth.currentUser || null);
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(auth.currentUser || null);
      }
    }, 600);
  });
};

// ==========================================
// Firebase Phone & Google Authentication
// ==========================================

export type { ConfirmationResult };

/**
 * Standardizes international and Indian mobile phone numbers into E.164 format (+91XXXXXXXXXX)
 */
export const formatPhoneNumber = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  // Standard Indian 10-digit mobile number
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  // 11-digit number starting with 0 (e.g. 09876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.slice(1)}`;
  }
  // 12-digit number starting with 91 (e.g. 919876543210)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  // Fallback if all digits
  if (/^\d+$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
};

// Singleton RecaptchaVerifier reference on window / module
/**
 * Safely clears any active RecaptchaVerifier instance and cleans up any dynamic container DOM elements
 */
export const clearRecaptchaVerifier = (buttonOrContainerId: string = 'send-otp-btn'): void => {
  const windowObj = typeof window !== 'undefined' ? (window as any) : null;
  if (windowObj && windowObj.recaptchaVerifier) {
    try {
      windowObj.recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Error clearing window.recaptchaVerifier:', e);
    }
    windowObj.recaptchaVerifier = null;
    windowObj.recaptchaWidgetId = undefined;
  }

  if (typeof document !== 'undefined') {
    const el = document.getElementById(buttonOrContainerId);
    if (el && el.tagName.toLowerCase() === 'div') {
      el.innerHTML = '';
    }
    const fallback = document.getElementById('recaptcha-container');
    if (fallback) {
      fallback.innerHTML = '';
    }
  }
};

/**
 * Initializes or re-uses the invisible RecaptchaVerifier instance bound directly to the Send OTP button.
 * Sets size to 'invisible' and badge to 'inline' so no visual puzzle, checkbox, or floating badge appears on screen.
 * Before creating a new RecaptchaVerifier instance, checks if window.recaptchaVerifier already exists.
 * If it exists, calls .clear() on it and sets it to null before re-initializing.
 */
export const initRecaptchaVerifier = (
  buttonOrContainerId: string = 'recaptcha-container'
): RecaptchaVerifier => {
  const windowObj = typeof window !== 'undefined' ? (window as any) : null;

  // 1. Check if window.recaptchaVerifier already exists, call .clear() and set to null before re-initializing
  if (windowObj && windowObj.recaptchaVerifier) {
    try {
      windowObj.recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Error clearing existing window.recaptchaVerifier:', e);
    }
    windowObj.recaptchaVerifier = null;
    windowObj.recaptchaWidgetId = undefined;
  }

  // 2. Ensure target element or container exists
  if (typeof document !== 'undefined') {
    let fallbackContainer = document.getElementById('recaptcha-container');
    if (!fallbackContainer) {
      fallbackContainer = document.createElement('div');
      fallbackContainer.id = 'recaptcha-container';
      document.body.appendChild(fallbackContainer);
    }

    // 3. Create invisible RecaptchaVerifier bound directly to recaptcha-container
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      badge: 'inline',
      callback: () => {
        // Auto-verification on click solved seamlessly
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired, automatically resetting widget');
        if (typeof window !== 'undefined' && (window as any).grecaptcha) {
          try {
            if (windowObj && windowObj.recaptchaWidgetId !== undefined) {
              (window as any).grecaptcha.reset(windowObj.recaptchaWidgetId);
            } else {
              (window as any).grecaptcha.reset();
            }
          } catch (e) {
            console.warn('Error resetting reCAPTCHA on expiry:', e);
          }
        }
      },
    });

    if (windowObj) {
      windowObj.recaptchaVerifier = verifier;
    }

    return verifier;
  }

  throw new Error('DOM environment not available for reCAPTCHA initialization.');
};

// Aliases for compatibility
export const getOrCreateRecaptchaVerifier = initRecaptchaVerifier;
export const setupRecaptchaVerifier = initRecaptchaVerifier;

export interface PhoneAuthSendResult {
  success: boolean;
  confirmationResult?: ConfirmationResult;
  error?: string;
}

/**
 * Sends a real SMS verification code to the target phone number using Firebase Phone Authentication.
 * Seamlessly verifies via invisible reCAPTCHA bound to the Send SMS button with zero puzzle / checkbox interruption.
 */
export const sendFirebasePhoneOtp = async (
  rawPhoneNumber: string,
  buttonOrContainerId: string = 'send-otp-btn'
): Promise<PhoneAuthSendResult> => {
  const formatted = formatPhoneNumber(rawPhoneNumber);
  if (!formatted || formatted.length < 8) {
    return {
      success: false,
      error: 'Please enter a valid mobile number with country code.',
    };
  }

  try {
    const windowObj = typeof window !== 'undefined' ? (window as any) : null;
    
    // Ensure clean/active verifier instance bound to Send SMS button
    let verifier = windowObj?.recaptchaVerifier;
    if (!verifier) {
      verifier = initRecaptchaVerifier(buttonOrContainerId);
    }

    // Explicitly render and trigger invisible background verification to eliminate captcha popup puzzles
    try {
      const widgetId = await verifier.render();
      if (windowObj) {
        windowObj.recaptchaWidgetId = widgetId;
      }
      if (typeof verifier.verify === 'function') {
        await verifier.verify();
      }
    } catch (renderErr) {
      console.warn('Recaptcha background verify notice:', renderErr);
    }

    // 30-second timeout race for signInWithPhoneNumber to prevent hanging indefinitely
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Verification timed out. Please try again.'));
      }, 30000);
    });

    const confirmationResult = await Promise.race([
      signInWithPhoneNumber(auth, formatted, verifier),
      timeoutPromise,
    ]);

    return {
      success: true,
      confirmationResult,
    };
  } catch (error: any) {
    console.error('Firebase signInWithPhoneNumber detailed error:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      customData: error?.customData,
    });

    // Auto-Reset: On any error or failed verification, automatically reset reCAPTCHA widget (grecaptcha.reset())
    const windowObj = typeof window !== 'undefined' ? (window as any) : null;
    if (windowObj && (window as any).grecaptcha) {
      try {
        if (windowObj.recaptchaWidgetId !== undefined) {
          (window as any).grecaptcha.reset(windowObj.recaptchaWidgetId);
        } else {
          (window as any).grecaptcha.reset();
        }
      } catch (resetErr) {
        console.warn('grecaptcha.reset error, clearing verifier for fresh retry:', resetErr);
        clearRecaptchaVerifier(buttonOrContainerId);
      }
    } else {
      clearRecaptchaVerifier(buttonOrContainerId);
    }

    let message = 'Failed to send SMS verification code. Please try again.';
    if (
      error?.code === 'auth/billing-not-enabled' ||
      error?.message?.includes('billing-not-enabled') ||
      error?.message?.includes('billing')
    ) {
      message = 'SMS auth requires active Firebase billing or configured Test Phone Numbers.';
    } else if (error?.code === 'auth/invalid-phone-number') {
      message = 'Invalid phone number format.';
    } else if (error?.code === 'auth/quota-exceeded' || error?.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    } else if (error?.code === 'auth/captcha-check-failed') {
      message = 'reCAPTCHA check failed. Please try sending the SMS code again.';
    } else if (error?.code === 'auth/invalid-app-credential') {
      message = 'Authentication credential error. Please try sending the SMS code again.';
    } else if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/admin-restricted-operation') {
      message = 'Phone Authentication must be enabled under Firebase Console > Authentication > Sign-in method.';
    } else if (error?.message) {
      message = error.message;
    }

    return {
      success: false,
      error: message,
    };
  }
};

export interface PhoneAuthVerifyResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}

/**
 * Verifies the SMS verification code entered by the user against Firebase ConfirmationResult
 */
export const verifyFirebasePhoneOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<PhoneAuthVerifyResult> => {
  try {
    if (!confirmationResult) {
      return {
        success: false,
        error: 'No active SMS verification session. Please request a new verification code.',
      };
    }

    const trimmedCode = otpCode.trim();
    if (!trimmedCode) {
      return {
        success: false,
        error: 'Please enter the SMS verification code.',
      };
    }

    const userCredential = await confirmationResult.confirm(trimmedCode);
    clearRecaptchaVerifier();
    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error: any) {
    console.error('Firebase verifyPhoneOtp detailed error:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      customData: error?.customData,
    });
    let message = 'Invalid OTP code. Please check and try again.';
    if (error?.code === 'auth/invalid-verification-code') {
      message = 'Invalid OTP code. Please check and try again.';
    } else if (error?.code === 'auth/code-expired') {
      message = 'The verification code has expired. Please request a new SMS code.';
    } else if (error?.message) {
      message = error.message;
    }

    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Signs in user with Google Account using Firebase Auth popup
 */
export const signInWithGooglePopup = async (): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return {
      success: true,
      user: result.user,
    };
  } catch (error: any) {
    console.warn('Firebase Google Sign-In note:', error);
    let errMsg = error?.message || 'Google Sign-In failed or was cancelled.';
    if (error?.code === 'auth/network-request-failed' || error?.message?.includes('network-request-failed')) {
      errMsg = 'Google Sign-In popup request failed due to iframe restrictions. Please sign in using Email or Phone Number below, or open the app in a new tab.';
    } else if (error?.code === 'auth/popup-closed-by-user') {
      errMsg = 'Google Sign-In popup was closed before completing.';
    } else if (error?.code === 'auth/popup-blocked') {
      errMsg = 'Google Sign-In popup was blocked by browser settings. Please allow popups or open the app in a new tab.';
    }
    return {
      success: false,
      error: errMsg,
    };
  }
};

// ==========================================
// Firebase Cloud Storage Helper Functions
// ==========================================

export const isValidMediaUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 5) return false;
  if (trimmed === 'undefined' || trimmed === 'null') return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('data:video/') ||
    trimmed.startsWith('blob:')
  );
};

export interface UploadStorageOptions {
  dataOrUrlOrFile: File | Blob | string;
  storagePath: string;
  contentType?: string;
}

/**
 * Universal upload function to Firebase Cloud Storage.
 * Handles Files, Blobs, and base64 Data URLs. Returns the permanent public download URL.
 */
export const uploadMediaToStorage = async (
  options: UploadStorageOptions
): Promise<string> => {
  const { dataOrUrlOrFile, storagePath, contentType } = options;
  if (!dataOrUrlOrFile) return '';

  // If already an external hosted URL (not a base64 Data URL), validate and return as is
  if (
    typeof dataOrUrlOrFile === 'string' &&
    (dataOrUrlOrFile.startsWith('http://') || dataOrUrlOrFile.startsWith('https://')) &&
    !dataOrUrlOrFile.startsWith('data:')
  ) {
    return dataOrUrlOrFile;
  }

  try {
    await ensureFirebaseAuth();
    const storage = getStorageClient();
    if (!storage) {
      if (typeof dataOrUrlOrFile === 'string' && !dataOrUrlOrFile.startsWith('blob:') && isValidMediaUrl(dataOrUrlOrFile)) {
        return dataOrUrlOrFile;
      }
      return '';
    }
    const storageRef: StorageReference = ref(storage, storagePath);

    if (dataOrUrlOrFile instanceof File || dataOrUrlOrFile instanceof Blob) {
      // Direct binary file or blob upload
      const metadata = contentType ? { contentType } : undefined;
      await uploadBytes(storageRef, dataOrUrlOrFile, metadata);
    } else if (typeof dataOrUrlOrFile === 'string' && dataOrUrlOrFile.startsWith('data:')) {
      // Base64 Data URL string upload
      await uploadString(storageRef, dataOrUrlOrFile, 'data_url');
    } else if (typeof dataOrUrlOrFile === 'string' && dataOrUrlOrFile.startsWith('blob:')) {
      // Fetch blob URL and upload as binary blob
      const res = await fetch(dataOrUrlOrFile);
      const b = await res.blob();
      const metadata = contentType ? { contentType } : undefined;
      await uploadBytes(storageRef, b, metadata);
    } else if (typeof dataOrUrlOrFile === 'string') {
      // Raw string format
      await uploadString(storageRef, dataOrUrlOrFile, 'raw', contentType ? { contentType } : undefined);
    }

    const downloadUrl = await getDownloadURL(storageRef);
    if (isValidMediaUrl(downloadUrl) && !downloadUrl.startsWith('blob:')) {
      return downloadUrl;
    }
    return typeof dataOrUrlOrFile === 'string' && !dataOrUrlOrFile.startsWith('blob:') ? dataOrUrlOrFile : '';
  } catch (error) {
    console.warn(`Firebase Cloud Storage upload fallback for ${storagePath}:`, error);
    // Never return a local blob: URL because another user's device cannot access it
    if (typeof dataOrUrlOrFile === 'string' && !dataOrUrlOrFile.startsWith('blob:') && isValidMediaUrl(dataOrUrlOrFile)) {
      return dataOrUrlOrFile;
    }
    return '';
  }
};

/**
 * Upload an avatar/profile picture to Cloud Storage
 */
export const uploadUserAvatarToStorage = async (
  userId: string,
  media: File | Blob | string
): Promise<string> => {
  const ext = typeof media === 'string' && media.startsWith('data:image/png') ? 'png' : 'jpg';
  const path = `users/${userId}/profile/avatar_${Date.now()}.${ext}`;
  return uploadMediaToStorage({
    dataOrUrlOrFile: media,
    storagePath: path,
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
  });
};

/**
 * Upload a post image to Cloud Storage
 */
export const uploadPostImageToStorage = async (
  userId: string,
  media: File | Blob | string
): Promise<string> => {
  const path = `users/${userId}/posts/${Date.now()}_post.jpg`;
  return uploadMediaToStorage({
    dataOrUrlOrFile: media,
    storagePath: path,
    contentType: 'image/jpeg',
  });
};

/**
 * Upload a story photo or video to Cloud Storage
 */
export const uploadStoryMediaToStorage = async (
  userId: string,
  media: File | Blob | string,
  isVideo = false
): Promise<string> => {
  const ext = isVideo ? 'mp4' : 'jpg';
  const mime = isVideo ? 'video/mp4' : 'image/jpeg';
  const path = `users/${userId}/stories/${Date.now()}_story.${ext}`;
  return uploadMediaToStorage({
    dataOrUrlOrFile: media,
    storagePath: path,
    contentType: mime,
  });
};

/**
 * Upload chat attachment / voice recording to Cloud Storage
 */
export const uploadChatMediaToStorage = async (
  userId: string,
  threadId: string,
  media: File | Blob | string,
  mediaType: 'image' | 'video' | 'audio' = 'image'
): Promise<string> => {
  const extMap = { image: 'jpg', video: 'mp4', audio: 'webm' };
  const mimeMap = { image: 'image/jpeg', video: 'video/mp4', audio: 'audio/webm' };
  let mime = mimeMap[mediaType];
  let ext = extMap[mediaType];

  if (media instanceof Blob && media.type) {
    mime = media.type;
    if (mime.includes('mp4')) ext = 'mp4';
    else if (mime.includes('ogg')) ext = 'ogg';
    else if (mime.includes('wav')) ext = 'wav';
    else if (mime.includes('webm')) ext = 'webm';
  }

  const safeThreadId = (threadId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `users/${userId}/chats/${safeThreadId}/${mediaType}_${Date.now()}.${ext}`;
  const uploadedUrl = await uploadMediaToStorage({
    dataOrUrlOrFile: media,
    storagePath: path,
    contentType: mime,
  });

  // Guarantee we NEVER return a local blob: URL
  if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
    return '';
  }

  return uploadedUrl;
};

// ==========================================
// Firestore Data Sync & Persistence Helpers
// ==========================================

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const normalizeUser = (u: any): User => {
  if (!u || typeof u !== 'object') {
    return {
      id: 'user_fallback',
      name: 'Funshann Member',
      username: 'user',
      avatar: DEFAULT_AVATAR,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      following: [],
    };
  }
  return {
    id: u.id || u.userId || 'user',
    name: u.name || u.displayName || 'Funshann Member',
    username: u.username || 'user',
    avatar: u.avatar || u.photoURL || DEFAULT_AVATAR,
    bio: u.bio || '',
    location: u.location || '',
    website: u.website || '',
    interests: Array.isArray(u.interests) ? u.interests : [],
    socialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
    birthday: u.birthday || '',
    mobileNumber: u.mobileNumber || '',
    email: u.email || '',
    postsCount: typeof u.postsCount === 'number' ? u.postsCount : 0,
    followersCount: typeof u.followersCount === 'number' ? u.followersCount : 0,
    followingCount: typeof u.followingCount === 'number' ? u.followingCount : 0,
    following: Array.isArray(u.following) ? u.following : [],
    isVerified: Boolean(u.isVerified),
    isFollowing: Boolean(u.isFollowing),
    isOnline: Boolean(u.isOnline),
    lastSeen: u.lastSeen ?? null,
    role: u.role || 'user',
    status: u.status || 'active',
    registrationDate: u.registrationDate || '',
    authProvider: u.authProvider || 'Email',
  };
};

export const normalizePost = (raw: any, currentUserId?: string): Post => {
  const user = normalizeUser(
    raw?.user || {
      id: raw?.userId || raw?.authorId,
      name: raw?.userName || raw?.authorName,
      username: raw?.username || raw?.authorUsername,
      avatar: raw?.userAvatar || raw?.authorAvatar,
      isVerified: Boolean(raw?.user?.isVerified || raw?.isVerified),
    }
  );

  const rawId = String(raw?.id || `post_${Date.now()}`);
  const createdAtMs = parseTimestampToMs(
    raw?.createdAt || raw?.createdAtMs || raw?.timestamp || raw?.syncedAt || rawId
  );

  const comments = Array.isArray(raw?.comments)
    ? raw.comments.map((c: any) => {
        const cMs = parseTimestampToMs(c?.createdAt || c?.createdAtMs || c?.timestamp || c?.id);
        return {
          id: c?.id || String(Date.now()),
          userId: c?.userId || 'user',
          user: normalizeUser(c?.user || { id: c?.userId }),
          text: c?.text || '',
          timestamp: formatRelativeTime(cMs),
          createdAtMs: cMs,
          likesCount: typeof c?.likesCount === 'number' ? c.likesCount : 0,
          isLiked: Boolean(c?.isLiked),
        };
      })
    : [];

  const rawLikes: string[] = Array.isArray(raw?.likes)
    ? raw.likes.filter((id: any) => typeof id === 'string' && id.trim())
    : [];
  const rawDislikes: string[] = Array.isArray(raw?.dislikes)
    ? raw.dislikes.filter((id: any) => typeof id === 'string' && id.trim())
    : [];

  const likes = Array.from(new Set(rawLikes));
  const dislikes = Array.from(new Set(rawDislikes));
  const likesCount = likes.length;
  const dislikesCount = dislikes.length;

  const isLiked = currentUserId ? likes.includes(currentUserId) : false;
  const isDisliked = currentUserId ? dislikes.includes(currentUserId) : false;
  const userReaction: 'like' | 'dislike' | null = isLiked ? 'like' : (isDisliked ? 'dislike' : null);

  return {
    id: rawId,
    userId: raw?.userId || user.id,
    user,
    imageUrl: raw?.imageUrl || raw?.mediaUrl || '',
    caption: raw?.caption || '',
    timestamp: formatRelativeTime(createdAtMs),
    createdAtMs,
    likesCount,
    dislikesCount,
    commentsCount:
      typeof raw?.commentsCount === 'number'
        ? raw.commentsCount
        : comments.length,
    isLiked,
    isDisliked,
    userReaction,
    isSaved: Boolean(raw?.isSaved),
    isAutoRemoved: Boolean(raw?.isAutoRemoved),
    likes,
    dislikes,
    reactions: Array.isArray(raw?.reactions)
      ? raw.reactions.map((r: any) => ({
          emoji: String(r?.emoji || ''),
          count: typeof r?.count === 'number' ? r.count : 0,
          userIds: Array.isArray(r?.userIds) ? r.userIds : [],
        }))
      : [],
    userEmojiReaction: raw?.userEmojiReaction || null,
    comments,
    location: raw?.location || '',
  };
};

export const hydratePostForUser = (
  post: Post,
  user?: User | { id?: string; uid?: string } | null
): Post => {
  if (!post) return post;
  const rawLikes: string[] = Array.isArray(post.likes)
    ? post.likes.filter((id: any) => typeof id === 'string' && id.trim())
    : [];
  const rawDislikes: string[] = Array.isArray(post.dislikes)
    ? post.dislikes.filter((id: any) => typeof id === 'string' && id.trim())
    : [];

  const uniqueLikes = Array.from(new Set(rawLikes));
  const uniqueDislikes = Array.from(new Set(rawDislikes));

  const likesCount = uniqueLikes.length;
  const dislikesCount = uniqueDislikes.length;

  const userId = user?.id || (user as any)?.uid || '';
  const userUid = (user as any)?.uid || '';

  const isLiked = Boolean(
    userId && (uniqueLikes.includes(userId) || (userUid && uniqueLikes.includes(userUid)))
  );
  const isDisliked = Boolean(
    userId && (uniqueDislikes.includes(userId) || (userUid && uniqueDislikes.includes(userUid)))
  );
  const userReaction: 'like' | 'dislike' | null = isLiked
    ? 'like'
    : isDisliked
    ? 'dislike'
    : null;

  return {
    ...post,
    likes: uniqueLikes,
    dislikes: uniqueDislikes,
    likesCount,
    dislikesCount,
    isLiked,
    isDisliked,
    userReaction,
  };
};

export const normalizeStory = (raw: any): Story => {
  const user = normalizeUser(raw?.user || { id: raw?.userId });
  const storyMs = parseTimestampToMs(raw?.createdAt || raw?.createdAtMs || raw?.timestamp || raw?.id);
  const rawViewerIds: string[] = Array.isArray(raw?.viewerIds)
    ? raw.viewerIds.filter((id: any) => typeof id === 'string')
    : Array.isArray(raw?.viewers)
    ? raw.viewers.map((v: any) => (typeof v === 'string' ? v : v?.id)).filter(Boolean)
    : [];

  const rawViewers: User[] = Array.isArray(raw?.viewedByUsers)
    ? raw.viewedByUsers.map(normalizeUser)
    : Array.isArray(raw?.viewers) && raw.viewers.length > 0 && typeof raw.viewers[0] === 'object'
    ? raw.viewers.map(normalizeUser)
    : [];

  const rawViewsCount = typeof raw?.viewsCount === 'number'
    ? raw.viewsCount
    : rawViewerIds.length > 0
    ? rawViewerIds.length
    : typeof raw?.views === 'number'
    ? raw.views
    : 0;

  return {
    id: raw?.id || String(Date.now()),
    userId: raw?.userId || user.id,
    user,
    mediaUrl: raw?.mediaUrl || raw?.imageUrl || '',
    timestamp: formatRelativeTime(storyMs),
    createdAtMs: storyMs,
    isSeen: Boolean(raw?.isSeen),
    caption: raw?.caption || '',
    likesCount: typeof raw?.likesCount === 'number' ? raw.likesCount : 0,
    isLiked: Boolean(raw?.isLiked),
    likedBy: Array.isArray(raw?.likedBy) ? raw.likedBy.map(normalizeUser) : [],
    viewsCount: rawViewsCount,
    viewerIds: rawViewerIds,
    viewers: rawViewers,
  };
};

export const normalizeChatThread = (raw: any): ChatThread => {
  const isGroup = Boolean(raw?.isGroup);
  const participant = raw?.participant ? normalizeUser(raw.participant) : undefined;
  const groupMembers = Array.isArray(raw?.groupMembers)
    ? raw.groupMembers.map(normalizeUser)
    : [];
  const messages = Array.isArray(raw?.messages) ? raw.messages : [];

  const rawLastMsg = raw?.lastMessage || (messages.length > 0 ? messages[messages.length - 1] : null);
  const lastMsgTime = rawLastMsg
    ? format12HourTime(rawLastMsg.createdAt || rawLastMsg.createdAtMs || rawLastMsg.timestamp || Date.now())
    : format12HourTime(Date.now());

  return {
    id: raw?.id || String(Date.now()),
    participant,
    isGroup,
    groupName: raw?.groupName,
    groupAvatar: raw?.groupAvatar,
    groupDescription: raw?.groupDescription,
    groupMembers,
    lastMessage: rawLastMsg
      ? {
          text: rawLastMsg.text || '',
          imageUrl: rawLastMsg.imageUrl,
          isVoice: Boolean(rawLastMsg.isVoice || rawLastMsg.voiceNote),
          timestamp: lastMsgTime,
          isRead: Boolean(rawLastMsg.isRead),
          senderId: rawLastMsg.senderId || '',
        }
      : {
          text: '',
          timestamp: lastMsgTime,
          isRead: true,
          senderId: '',
        },
    unreadCount: typeof raw?.unreadCount === 'number' ? raw.unreadCount : 0,
    messages,
  };
};

export const normalizeNotification = (raw: any): NotificationItem => {
  const user = normalizeUser(raw?.user);
  const notifMs = parseTimestampToMs(raw?.createdAt || raw?.createdAtMs || raw?.timestamp || raw?.id);
  return {
    id: raw?.id || String(Date.now()),
    user,
    type: raw?.type || 'like',
    text: raw?.text || raw?.content || '',
    timestamp: formatRelativeTime(notifMs),
    createdAtMs: notifMs,
    read: typeof raw?.read === 'boolean' ? raw.read : Boolean(raw?.isRead),
    postId: raw?.postId,
    previewImage: raw?.previewImage,
    chatUserId: raw?.chatUserId,
    commentId: raw?.commentId,
    targetUserId: raw?.targetUserId,
  };
};

// 1. User Profiles & User Directory
export const checkIfPhoneRegistered = async (rawPhone: string): Promise<boolean> => {
  try {
    await ensureFirebaseAuth();
    const formatted = formatPhoneNumber(rawPhone);
    if (!formatted) return false;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('mobileNumber', '==', formatted));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return true;

    const qRaw = query(usersRef, where('mobileNumber', '==', rawPhone.trim()));
    const snapshotRaw = await getDocs(qRaw);
    if (!snapshotRaw.empty) return true;

    return false;
  } catch (err) {
    console.warn('Error checking phone registration:', err);
    return false;
  }
};

export const getUserProfileByPhone = async (rawPhone: string): Promise<User | null> => {
  try {
    await ensureFirebaseAuth();
    const formatted = formatPhoneNumber(rawPhone);
    const usersRef = collection(db, 'users');

    if (formatted) {
      const q = query(usersRef, where('mobileNumber', '==', formatted), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return normalizeUser(snap.docs[0].data());
      }
    }

    const qRaw = query(usersRef, where('mobileNumber', '==', rawPhone.trim()), limit(1));
    const snapRaw = await getDocs(qRaw);
    if (!snapRaw.empty) {
      return normalizeUser(snapRaw.docs[0].data());
    }

    return null;
  } catch (err) {
    console.warn('Error getting user profile by phone:', err);
    return null;
  }
};

export const syncUserProfileToFirestore = async (user: Partial<User>): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!user || !user.id) return;
    const userRef = doc(db, 'users', user.id);
    const snap = await getDoc(userRef);
    const displayNameVal = user.displayName || user.name || '';
    const usernameVal = (user.username || displayNameVal || `user_${user.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const emailVal = user.email || '';

    const payload = {
      ...user,
      id: user.id,
      displayName: displayNameVal,
      name: displayNameVal || user.name || 'Funshann Member',
      username: usernameVal,
      email: emailVal,
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      (payload as any).createdAt = serverTimestamp();
    }
    await setDoc(userRef, payload, { merge: true });
  } catch (error) {
    console.warn('Firestore user profile sync fallback to local:', error);
  }
};

export const getUserFollowingsFromFirestore = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    const followsRef = collection(db, 'follows');
    const q1 = query(followsRef, where('followerUid', '==', userId));
    const q2 = query(followsRef, where('followerId', '==', userId));
    const [snap1, snap2] = await Promise.all([
      getDocs(q1).catch(async () => {
        try {
          return await getDocsFromCache(q1);
        } catch {
          return null;
        }
      }),
      getDocs(q2).catch(async () => {
        try {
          return await getDocsFromCache(q2);
        } catch {
          return null;
        }
      }),
    ]);
    const followingIdsSet = new Set<string>();
    const extractIds = (snap: any) => {
      if (!snap) return;
      snap.forEach((docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const targetId = data.followingUid || data.followingId || (docSnap.id.includes('_') ? docSnap.id.split('_')[1] : null);
          if (targetId && targetId !== userId) {
            followingIdsSet.add(targetId);
          }
        }
      });
    };
    extractIds(snap1);
    extractIds(snap2);
    return Array.from(followingIdsSet);
  } catch (error) {
    console.warn('Failed to fetch user followings:', error);
    return [];
  }
};

export const getUserFollowersFromFirestore = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return [];
    const followsRef = collection(db, 'follows');
    const q1 = query(followsRef, where('followingUid', '==', userId));
    const q2 = query(followsRef, where('followingId', '==', userId));
    const [snap1, snap2] = await Promise.all([
      getDocs(q1).catch(async () => {
        try {
          return await getDocsFromCache(q1);
        } catch {
          return null;
        }
      }),
      getDocs(q2).catch(async () => {
        try {
          return await getDocsFromCache(q2);
        } catch {
          return null;
        }
      }),
    ]);
    const followerIdsSet = new Set<string>();
    const extractIds = (snap: any) => {
      if (!snap) return;
      snap.forEach((docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const targetId = data.followerUid || data.followerId || (docSnap.id.includes('_') ? docSnap.id.split('_')[0] : null);
          if (targetId && targetId !== userId) {
            followerIdsSet.add(targetId);
          }
        }
      });
    };
    extractIds(snap1);
    extractIds(snap2);
    return Array.from(followerIdsSet);
  } catch (error) {
    console.warn('Failed to fetch user followers:', error);
    return [];
  }
};

export interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  followerUid?: string;
  followingUid?: string;
}

export const subscribeToFollows = (
  callback: (records: FollowRecord[]) => void
): (() => void) => {
  try {
    const followsRef = collection(db, 'follows');
    const unsubscribe = onSnapshot(
      followsRef,
      (snapshot) => {
        const records: FollowRecord[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const idParts = docSnap.id.includes('_') ? docSnap.id.split('_') : [];
            const followerId = data.followerUid || data.followerId || idParts[0] || '';
            const followingId = data.followingUid || data.followingId || idParts[1] || '';
            if (followerId && followingId) {
              records.push({ id: docSnap.id, followerId, followingId });
            }
          }
        });
        callback(records);
      },
      async (error) => {
        console.warn('Firestore subscribeToFollows snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(followsRef);
          const records: FollowRecord[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const idParts = docSnap.id.includes('_') ? docSnap.id.split('_') : [];
              const followerId = data.followerUid || data.followerId || idParts[0] || '';
              const followingId = data.followingUid || data.followingId || idParts[1] || '';
              if (followerId && followingId) {
                records.push({ id: docSnap.id, followerId, followingId });
              }
            }
          });
          if (records.length > 0) callback(records);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToFollows notice:', err);
    return () => {};
  }
};

export const isPostByUserId = (post: Post, targetUserId: string): boolean => {
  if (!post || !targetUserId) return false;
  const raw = post as any;
  return Boolean(
    post.userId === targetUserId ||
    post.user?.id === targetUserId ||
    raw.authorId === targetUserId ||
    raw.authorUid === targetUserId ||
    raw.uid === targetUserId ||
    raw.user?.uid === targetUserId
  );
};

export const getUserPostsCountFromFirestore = async (userId: string): Promise<number> => {
  try {
    if (!userId) return 0;
    const postsRef = collection(db, 'posts');
    const q1 = query(postsRef, where('userId', '==', userId));
    const q2 = query(postsRef, where('authorId', '==', userId));
    const q3 = query(postsRef, where('uid', '==', userId));
    const q4 = query(postsRef, where('user.id', '==', userId));

    const [s1, s2, s3, s4] = await Promise.all([
      getDocs(q1).catch(() => null),
      getDocs(q2).catch(() => null),
      getDocs(q3).catch(() => null),
      getDocs(q4).catch(() => null),
    ]);

    const postIds = new Set<string>();
    const addIds = (snap: any) => {
      if (!snap) return;
      snap.forEach((docSnap: any) => {
        if (docSnap.exists()) {
          postIds.add(docSnap.id);
        }
      });
    };
    addIds(s1);
    addIds(s2);
    addIds(s3);
    addIds(s4);
    return postIds.size;
  } catch (error) {
    console.warn('Failed to fetch user post count from Firestore:', error);
    return 0;
  }
};

export const getUsersByIdsFromFirestore = async (userIds: string[], knownUsers: User[] = []): Promise<User[]> => {
  if (!userIds || userIds.length === 0) return [];
  const knownMap = new Map<string, User>();
  for (const u of knownUsers) {
    if (u && u.id) knownMap.set(u.id, u);
  }

  const result: User[] = [];
  const missingIds: string[] = [];

  for (const id of userIds) {
    if (!id) continue;
    if (knownMap.has(id)) {
      result.push(knownMap.get(id)!);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const fetchPromises = missingIds.map(async (uid) => {
      try {
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          return normalizeUser({ ...userSnap.data(), id: userSnap.id });
        }
      } catch (err) {
        console.warn('Error fetching user document for follow list:', uid, err);
      }
      return {
        id: uid,
        name: 'Funshann Member',
        username: `user_${uid.slice(0, 6)}`,
        avatar: DEFAULT_AVATAR,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      } as User;
    });

    const fetched = await Promise.all(fetchPromises);
    for (const u of fetched) {
      if (u) result.push(u);
    }
  }

  return filterAndDeduplicateUsers(result);
};

export const getFollowersListForUser = async (targetUserId: string, knownUsers: User[] = []): Promise<User[]> => {
  if (!targetUserId) return [];
  try {
    await ensureFirebaseAuth();
    const followsRef = collection(db, 'follows');
    
    // Query where followingUid == targetUserId or followingId == targetUserId
    const q1 = query(followsRef, where('followingUid', '==', targetUserId));
    const q2 = query(followsRef, where('followingId', '==', targetUserId));

    const [snap1, snap2] = await Promise.all([
      getDocs(q1).catch(() => null),
      getDocs(q2).catch(() => null),
    ]);

    const followerIdsSet = new Set<string>();

    const processSnap = (snap: any) => {
      if (!snap) return;
      snap.forEach((docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fid = data.followerId || data.followerUid || (docSnap.id.includes('_') ? docSnap.id.split('_')[0] : null);
          if (fid && fid !== targetUserId) {
            followerIdsSet.add(fid);
          }
        }
      });
    };

    processSnap(snap1);
    processSnap(snap2);

    // Also check knownUsers if any user's following list contains targetUserId
    for (const u of knownUsers) {
      if (u && u.id && u.id !== targetUserId && Array.isArray(u.following) && u.following.includes(targetUserId)) {
        followerIdsSet.add(u.id);
      }
    }

    return await getUsersByIdsFromFirestore(Array.from(followerIdsSet), knownUsers);
  } catch (error) {
    console.warn('Failed to get followers list for user:', targetUserId, error);
    return [];
  }
};

export const getFollowingListForUser = async (targetUserId: string, knownUsers: User[] = []): Promise<User[]> => {
  if (!targetUserId) return [];
  try {
    await ensureFirebaseAuth();
    const followsRef = collection(db, 'follows');
    
    // Query where followerUid == targetUserId or followerId == targetUserId
    const q1 = query(followsRef, where('followerUid', '==', targetUserId));
    const q2 = query(followsRef, where('followerId', '==', targetUserId));

    const [snap1, snap2] = await Promise.all([
      getDocs(q1).catch(() => null),
      getDocs(q2).catch(() => null),
    ]);

    const followingIdsSet = new Set<string>();

    const processSnap = (snap: any) => {
      if (!snap) return;
      snap.forEach((docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const fid = data.followingId || data.followingUid || (docSnap.id.includes('_') ? docSnap.id.split('_')[1] : null);
          if (fid && fid !== targetUserId) {
            followingIdsSet.add(fid);
          }
        }
      });
    };

    processSnap(snap1);
    processSnap(snap2);

    // Also check if target user object in knownUsers has following array
    const targetInKnown = knownUsers.find((u) => u && u.id === targetUserId);
    if (targetInKnown && Array.isArray(targetInKnown.following)) {
      for (const fId of targetInKnown.following) {
        if (fId && fId !== targetUserId) {
          followingIdsSet.add(fId);
        }
      }
    }

    return await getUsersByIdsFromFirestore(Array.from(followingIdsSet), knownUsers);
  } catch (error) {
    console.warn('Failed to get following list for user:', targetUserId, error);
    return [];
  }
};

export const getUserProfileFromFirestore = async (userId: string): Promise<User | null> => {
  try {
    await ensureFirebaseAuth();
    if (!userId) return null;
    const userRef = doc(db, 'users', userId);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch {
      snap = await getDocFromCache(userRef).catch(() => null);
    }
    if (snap && snap.exists()) {
      const u = normalizeUser(snap.data());
      const followings = await getUserFollowingsFromFirestore(userId);
      return {
        ...u,
        following: followings,
        followingCount: followings.length > 0 ? followings.length : u.followingCount,
      };
    }
    return null;
  } catch (error) {
    console.warn('Firestore read user profile fallback:', error);
    return null;
  }
};

export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    if (!userId) return false;
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists();
  } catch (error) {
    try {
      const cacheSnap = await getDocFromCache(doc(db, 'users', userId));
      return cacheSnap.exists();
    } catch {
      return true; // Fallback to true to prevent accidental deletion on network errors
    }
  }
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    if (!username) return false;
    const cleanUsername = username.toLowerCase().trim();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', cleanUsername), limit(1));
    const snap = await getDocs(q);
    return snap.empty;
  } catch (err) {
    console.error('Error checking username availability:', err);
    return true;
  }
};

export const getUsernameByEmail = async (email: string): Promise<string | null> => {
  try {
    await ensureFirebaseAuth();
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', cleanEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return data.username || null;
    }
    return null;
  } catch (err) {
    console.error('Error getting username by email:', err);
    return null;
  }
};

function filterAndDeduplicateUsers(users: User[]): User[] {
  const emailMap = new Map<string, User>();
  const usernameMap = new Map<string, User>();
  const result: User[] = [];

  for (const u of users) {
    if (!u || !u.id) continue;
    
    // Identify Demo users
    const isDemo = 
      u.email?.toLowerCase().includes('example.com') ||
      u.email?.toLowerCase().includes('demo') ||
      u.email?.toLowerCase().includes('test') ||
      u.username?.toLowerCase().includes('demo') ||
      u.username?.toLowerCase().includes('test') ||
      u.name?.toLowerCase().includes('demo') ||
      u.name?.toLowerCase().includes('test') ||
      (u.name && u.name.includes('Mock')) ||
      (u.username && u.username.includes('mock'));

    if (isDemo) {
      // Fire and forget delete if we happen to fetch a demo user
      // Even if it fails due to quota, we hide it from the UI immediately
      try { deleteDoc(doc(db, 'users', u.id)).catch(() => {}); } catch(e){}
      continue;
    }

    // Identify duplicates by email
    if (u.email) {
      const email = u.email.toLowerCase();
      if (emailMap.has(email)) {
        try { deleteDoc(doc(db, 'users', u.id)).catch(() => {}); } catch(e){}
        continue;
      }
      emailMap.set(email, u);
    }

    // Identify duplicates by username
    if (u.username) {
      const username = u.username.toLowerCase();
      if (usernameMap.has(username)) {
        try { deleteDoc(doc(db, 'users', u.id)).catch(() => {}); } catch(e){}
        continue;
      }
      usernameMap.set(username, u);
    }

    result.push(u);
  }
  return result;
};

export const subscribeToUsers = (callback: (users: User[]) => void, limitCount = 50): (() => void) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(limitCount));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map = new Map<string, User>();
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const u = normalizeUser({ ...docSnap.data(), id: docSnap.id });
            if (u && u.id) {
              map.set(u.id, u);
            }
          }
        });
        callback(filterAndDeduplicateUsers(Array.from(map.values())));
      },
      async (error) => {
        console.warn('Firestore subscribeToUsers snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const map = new Map<string, User>();
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const u = normalizeUser({ ...docSnap.data(), id: docSnap.id });
              if (u && u.id) {
                map.set(u.id, u);
              }
            }
          });
          if (map.size > 0) callback(filterAndDeduplicateUsers(Array.from(map.values())));
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToUsers notice:', err);
    return () => {};
  }
};

export const getUsersFromFirestore = async (limitCount = 30): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(limitCount));
  try {
    await ensureFirebaseAuth();
    const querySnapshot = await getDocs(q);
    const map = new Map<string, User>();
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const u = normalizeUser({ ...docSnap.data(), id: docSnap.id });
        if (u && u.id) {
          map.set(u.id, u);
        }
      }
    });
    return filterAndDeduplicateUsers(Array.from(map.values()));
  } catch (error) {
    console.warn('Firestore getUsers remote fallback, checking cache:', error);
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      const map = new Map<string, User>();
      cacheSnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          const u = normalizeUser({ ...docSnap.data(), id: docSnap.id });
          if (u && u.id) {
            map.set(u.id, u);
          }
        }
      });
      return filterAndDeduplicateUsers(Array.from(map.values()));
    } catch {
      return [];
    }
  }
};

// 2. Posts & Live Feed
export const syncPostToFirestore = async (post: Post): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!post || !post.id) return;
    const postRef = doc(db, 'posts', post.id);
    const userId = post.userId || post.user?.id || 'user';
    const createdAtMs = parseTimestampToMs(
      post.createdAtMs ||
      (post as any).createdAt ||
      post.timestamp ||
      (post.id.startsWith('post_') ? parseInt(post.id.replace('post_', ''), 10) : null)
    );

    const uniqueLikes = Array.from(
      new Set(Array.isArray(post.likes) ? post.likes.filter((id) => typeof id === 'string' && id.trim()) : [])
    );
    const uniqueDislikes = Array.from(
      new Set(Array.isArray(post.dislikes) ? post.dislikes.filter((id) => typeof id === 'string' && id.trim()) : [])
    );

    await setDoc(
      postRef,
      {
        id: post.id,
        userId,
        user: {
          id: post.user?.id || userId,
          name: post.user?.name || 'Funshann Member',
          username: post.user?.username || 'user',
          avatar: post.user?.avatar || DEFAULT_AVATAR,
          isVerified: Boolean(post.user?.isVerified),
        },
        imageUrl: post.imageUrl || '',
        caption: post.caption || '',
        location: post.location || '',
        timestamp: formatRelativeTime(createdAtMs),
        createdAtMs,
        createdAt: serverTimestamp(),
        likes: uniqueLikes,
        dislikes: uniqueDislikes,
        likesCount: uniqueLikes.length,
        dislikesCount: uniqueDislikes.length,
        commentsCount:
          typeof post.commentsCount === 'number'
            ? post.commentsCount
            : (post.comments?.length || 0),
        isSaved: Boolean(post.isSaved),
        isAutoRemoved: Boolean(post.isAutoRemoved),
        comments: Array.isArray(post.comments)
          ? post.comments.map((c) => {
              const cMs = parseTimestampToMs((c as any).createdAt || (c as any).createdAtMs || c.timestamp || c.id);
              return {
                ...c,
                timestamp: formatRelativeTime(cMs),
                createdAtMs: cMs,
              };
            })
          : [],
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Firestore post sync fallback to local:', error);
  }
};

export const togglePostReactionInFirestore = async (
  postId: string,
  userId: string,
  reaction: 'like' | 'dislike'
): Promise<{ likes: string[]; dislikes: string[]; likesCount: number; dislikesCount: number } | null> => {
  if (!postId || !userId) return null;
  try {
    await ensureFirebaseAuth();
    const postRef = doc(db, 'posts', postId);

    const result = await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error(`Post with id ${postId} does not exist in Firestore`);
      }

      const data = postDoc.data();
      const existingLikes: string[] = Array.isArray(data.likes)
        ? data.likes.filter((id: any) => typeof id === 'string' && id.trim())
        : [];
      const existingDislikes: string[] = Array.isArray(data.dislikes)
        ? data.dislikes.filter((id: any) => typeof id === 'string' && id.trim())
        : [];

      const likesSet = new Set(existingLikes);
      const dislikesSet = new Set(existingDislikes);

      const isCurrentlyLiked = likesSet.has(userId);
      const isCurrentlyDisliked = dislikesSet.has(userId);

      if (reaction === 'like') {
        if (isCurrentlyLiked) {
          // User already liked -> remove like
          likesSet.delete(userId);
        } else {
          // User wants to like -> add like, remove dislike if exists
          likesSet.add(userId);
          dislikesSet.delete(userId);
        }
      } else if (reaction === 'dislike') {
        if (isCurrentlyDisliked) {
          // User already disliked -> remove dislike
          dislikesSet.delete(userId);
        } else {
          // User wants to dislike -> add dislike, remove like if exists
          dislikesSet.add(userId);
          likesSet.delete(userId);
        }
      }

      const newLikes = Array.from(likesSet);
      const newDislikes = Array.from(dislikesSet);
      const newLikesCount = newLikes.length;
      const newDislikesCount = newDislikes.length;

      transaction.update(postRef, {
        likes: newLikes,
        dislikes: newDislikes,
        likesCount: newLikesCount,
        dislikesCount: newDislikesCount,
        updatedAt: serverTimestamp(),
      });

      return {
        likes: newLikes,
        dislikes: newDislikes,
        likesCount: newLikesCount,
        dislikesCount: newDislikesCount,
      };
    });

    return result;
  } catch (error) {
    console.warn('Firestore toggle post reaction fallback:', error);
    return null;
  }
};

export const deletePostFromFirestore = async (postId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!postId) return;
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.warn('Firestore delete post fallback:', error);
  }
};

export const updatePostInFirestore = async (postId: string, updates: Partial<Post>): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!postId) return;
    const postRef = doc(db, 'posts', postId);
    await setDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore update post fallback:', error);
  }
};

let lastPostDocSnapshot: any = null;

export const getPostsFromFirestore = async (limitCount = 15, resetPagination = true): Promise<Post[]> => {
  const postsRef = collection(db, 'posts');
  let q = query(postsRef, limit(limitCount));
  if (!resetPagination && lastPostDocSnapshot) {
    q = query(postsRef, startAfter(lastPostDocSnapshot), limit(limitCount));
  }
  try {
    await ensureFirebaseAuth();
    const querySnapshot = await getDocs(q);
    const result: Post[] = [];
    if (!querySnapshot.empty) {
      lastPostDocSnapshot = querySnapshot.docs[querySnapshot.docs.length - 1];
    } else if (resetPagination) {
      lastPostDocSnapshot = null;
    }
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const p = normalizePost({ ...docSnap.data(), id: docSnap.id });
        if (p && p.id) {
          result.push(p);
        }
      }
    });
    result.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    return result;
  } catch (error) {
    console.warn('Firestore getPosts remote fallback, checking cache:', error);
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      const result: Post[] = [];
      cacheSnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          const p = normalizePost({ ...docSnap.data(), id: docSnap.id });
          if (p && p.id) {
            result.push(p);
          }
        }
      });
      result.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      return result;
    } catch {
      return [];
    }
  }
};

export const loadMorePostsFromFirestore = async (limitCount = 15): Promise<Post[]> => {
  return getPostsFromFirestore(limitCount, false);
};

export const subscribeToPosts = (callback: (posts: Post[]) => void, limitCount = 50): (() => void) => {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, limit(limitCount));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: Post[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const p = normalizePost({ ...data, id: docSnap.id });
            if (p && p.id) {
              result.push(p);
            }
          }
        });
        // Sort descending so newly added posts (highest timestamp) stay at the top
        result.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        callback(result);
      },
      async (error) => {
        console.warn('Firestore subscribeToPosts snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const result: Post[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const p = normalizePost({ ...docSnap.data(), id: docSnap.id });
              if (p && p.id) {
                result.push(p);
              }
            }
          });
          if (result.length > 0) {
            result.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
            callback(result);
          }
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToPosts notice:', err);
    return () => {};
  }
};

// 3. Chat Threads & Direct Messages
export const syncChatThreadToFirestore = async (thread: ChatThread): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!thread || !thread.id) return;
    const threadRef = doc(db, 'chat_threads', thread.id);
    const { messages, ...threadWithoutMessages } = thread;
    await setDoc(threadRef, {
      ...threadWithoutMessages,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore chat thread sync fallback to local:', error);
  }
};

export const deleteChatThreadFromFirestore = async (threadId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!threadId) return;
    const threadRef = doc(db, 'chat_threads', threadId);
    await deleteDoc(threadRef);
  } catch (error) {
    console.warn('Firestore delete chat thread fallback:', error);
  }
};

export const syncChatMessageToFirestore = async (threadId: string, message: Omit<Message, 'id'> | Message): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!threadId || !message) return;
    const messagesRef = collection(db, 'chat_threads', threadId, 'messages');
    if ('id' in message && message.id) {
       const msgRef = doc(db, 'chat_threads', threadId, 'messages', message.id);
       await setDoc(msgRef, {
         ...message,
         syncedAt: serverTimestamp(),
       }, { merge: true });
    } else {
       await addDoc(messagesRef, {
         ...message,
         syncedAt: serverTimestamp(),
       });
    }
  } catch (error) {
    console.warn('Firestore message sync fallback:', error);
  }
};

export const subscribeToChatMessages = (threadId: string, callback: (messages: Message[]) => void): (() => void) => {
  if (!threadId) return () => {};
  try {
    const messagesRef = collection(db, 'chat_threads', threadId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            msgs.push({ 
              id: docSnap.id, 
              ...data,
              isDelivered: !docSnap.metadata.hasPendingWrites
            } as Message);
          }
        });
        callback(msgs);
      },
      async (error) => {
        console.warn('Firestore subscribeToChatMessages snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const msgs: Message[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              msgs.push({ 
                id: docSnap.id, 
                ...data,
                isDelivered: true
              } as Message);
            }
          });
          if (msgs.length > 0) callback(msgs);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToChatMessages notice:', err);
    return () => {};
  }
};

export const getChatThreadsFromFirestore = async (limitCount = 50): Promise<ChatThread[]> => {
  const threadsRef = collection(db, 'chat_threads');
  const q = query(threadsRef, limit(limitCount));
  try {
    await ensureFirebaseAuth();
    const querySnapshot = await getDocs(q);
    const result: ChatThread[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        result.push(normalizeChatThread(docSnap.data()));
      }
    });
    return result;
  } catch (error) {
    console.warn('Firestore getChatThreads remote fallback, checking cache:', error);
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      const result: ChatThread[] = [];
      cacheSnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          result.push(normalizeChatThread(docSnap.data()));
        }
      });
      return result;
    } catch {
      return [];
    }
  }
};

export const subscribeToChatThreads = (callback: (threads: ChatThread[]) => void, userId: string, limitCount = 50): (() => void) => {
  if (!userId) return () => {};
  try {
    const threadsRef = collection(db, 'chat_threads');
    const q = query(
      threadsRef, 
      where('participantIds', 'array-contains', userId),
      limit(limitCount)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: ChatThread[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            result.push(normalizeChatThread(docSnap.data()));
          }
        });
        callback(result);
      },
      async (error) => {
        console.warn('Firestore subscribeToChatThreads snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const result: ChatThread[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              result.push(normalizeChatThread(docSnap.data()));
            }
          });
          if (result.length > 0) callback(result);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToChatThreads notice:', err);
    return () => {};
  }
};

// 4. Stories
export const syncStoryToFirestore = async (story: Story): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!story || !story.id) return;
    const storyRef = doc(db, 'stories', story.id);
    await setDoc(storyRef, {
      ...story,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore story sync fallback to local:', error);
  }
};

export const recordStoryViewInFirestore = async (
  storyId: string,
  viewer: User
): Promise<{ viewsCount: number; viewerIds: string[] } | null> => {
  try {
    await ensureFirebaseAuth();
    if (!storyId || !viewer || !viewer.id) return null;
    const storyRef = doc(db, 'stories', storyId);

    const viewerSummary = {
      id: viewer.id,
      name: viewer.name || 'Funshann Member',
      username: viewer.username || 'user',
      avatar: viewer.avatar || '',
      isVerified: Boolean(viewer.isVerified),
      viewedAt: Date.now(),
    };

    try {
      await updateDoc(storyRef, {
        viewerIds: arrayUnion(viewer.id),
        viewedByUsers: arrayUnion(viewerSummary),
        viewsCount: increment(1),
        lastViewedAt: serverTimestamp(),
      });
    } catch {
      // Fallback: setDoc with merge if document or fields do not exist yet
      await setDoc(
        storyRef,
        {
          id: storyId,
          viewerIds: arrayUnion(viewer.id),
          viewedByUsers: arrayUnion(viewerSummary),
          viewsCount: increment(1),
          lastViewedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    return { viewsCount: 1, viewerIds: [viewer.id] };
  } catch (error) {
    console.warn('Firestore recordStoryView error:', error);
    return null;
  }
};

export const deleteStoryFromFirestore = async (storyId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!storyId) return;
    const storyRef = doc(db, 'stories', storyId);
    await deleteDoc(storyRef);
  } catch (error) {
    console.warn('Firestore delete story fallback:', error);
  }
};

export const getStoriesFromFirestore = async (): Promise<Story[]> => {
  const storiesRef = collection(db, 'stories');
  const q = query(storiesRef, limit(30));
  try {
    await ensureFirebaseAuth();
    const querySnapshot = await getDocs(q);
    const result: Story[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        result.push(normalizeStory(docSnap.data()));
      }
    });
    return result;
  } catch (error) {
    console.warn('Firestore getStories remote fallback, checking cache:', error);
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      const result: Story[] = [];
      cacheSnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          result.push(normalizeStory(docSnap.data()));
        }
      });
      return result;
    } catch {
      return [];
    }
  }
};

export const subscribeToStories = (callback: (stories: Story[]) => void): (() => void) => {
  try {
    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef, limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: Story[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            result.push(normalizeStory(docSnap.data()));
          }
        });
        callback(result);
      },
      async (error) => {
        console.warn('Firestore subscribeToStories snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const result: Story[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              result.push(normalizeStory(docSnap.data()));
            }
          });
          if (result.length > 0) callback(result);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToStories notice:', err);
    return () => {};
  }
};

// 5. Communities
export const syncCommunityToFirestore = async (community: any): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!community || !community.id) return;
    const commRef = doc(db, 'communities', community.id);
    await setDoc(commRef, {
      ...community,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore community sync fallback:', error);
  }
};

// 6. Notifications
export const syncNotificationToFirestore = async (notification: NotificationItem): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!notification || !notification.id) return;
    const notifRef = doc(db, 'notifications', notification.id);
    await setDoc(notifRef, {
      ...notification,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore notification sync fallback to local:', error);
  }
};

export const getNotificationsFromFirestore = async (): Promise<NotificationItem[]> => {
  const notifsRef = collection(db, 'notifications');
  const q = query(notifsRef, limit(30));
  try {
    await ensureFirebaseAuth();
    const querySnapshot = await getDocs(q);
    const result: NotificationItem[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        result.push(normalizeNotification(docSnap.data()));
      }
    });
    return result;
  } catch (error) {
    console.warn('Firestore getNotifications remote fallback, checking cache:', error);
    try {
      const cacheSnapshot = await getDocsFromCache(q);
      const result: NotificationItem[] = [];
      cacheSnapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          result.push(normalizeNotification(docSnap.data()));
        }
      });
      return result;
    } catch {
      return [];
    }
  }
};

export const subscribeToNotifications = (callback: (notifications: NotificationItem[]) => void, userId: string): (() => void) => {
  if (!userId) return () => {};
  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef, 
      where('targetUserId', '==', userId),
      limit(30)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            result.push(normalizeNotification(docSnap.data()));
          }
        });
        callback(result);
      },
      async (error) => {
        console.warn('Firestore subscribeToNotifications snapshot notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const result: NotificationItem[] = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              result.push(normalizeNotification(docSnap.data()));
            }
          });
          if (result.length > 0) callback(result);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToNotifications notice:', err);
    return () => {};
  }
};

// 7. User Reports & Grievances
export const syncUserReportToFirestore = async (report: UserReportItem | UniversalReportItem | Record<string, any>): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!report || !report.id) return;
    const reportRef = doc(db, 'universal_reports', report.id);
    await setDoc(reportRef, {
      ...report,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore user report sync fallback to local:', error);
  }
};

export const followUser = async (followerUid: string, followingUid: string): Promise<void> => {
  if (!followerUid || !followingUid || followerUid === followingUid) return;
  try {
    await ensureFirebaseAuth();
    const followRef = doc(db, 'follows', `${followerUid}_${followingUid}`);
    const followerRef = doc(db, 'users', followerUid);
    const followingRef = doc(db, 'users', followingUid);

    await runTransaction(db, async (transaction) => {
      const followDoc = await transaction.get(followRef);
      if (followDoc.exists()) return; // Already following

      transaction.set(followRef, {
        followerUid,
        followingUid,
        followerId: followerUid,
        followingId: followingUid,
        createdAt: serverTimestamp(),
      });
      transaction.set(followerRef, { followingCount: increment(1) }, { merge: true });
      transaction.set(followingRef, { followersCount: increment(1) }, { merge: true });
    });
  } catch (error) {
    console.warn('Firestore followUser fallback:', error);
    // Direct set fallback
    const followRef = doc(db, 'follows', `${followerUid}_${followingUid}`);
    await setDoc(followRef, {
      followerUid,
      followingUid,
      followerId: followerUid,
      followingId: followingUid,
      createdAt: serverTimestamp(),
    }, { merge: true }).catch(console.warn);
  }
};

export const unfollowUser = async (followerUid: string, followingUid: string): Promise<void> => {
  if (!followerUid || !followingUid) return;
  try {
    await ensureFirebaseAuth();
    const followRef = doc(db, 'follows', `${followerUid}_${followingUid}`);
    const followerRef = doc(db, 'users', followerUid);
    const followingRef = doc(db, 'users', followingUid);

    await runTransaction(db, async (transaction) => {
      const followDoc = await transaction.get(followRef);
      if (!followDoc.exists()) return; // Not following

      transaction.delete(followRef);
      transaction.set(followerRef, { followingCount: increment(-1) }, { merge: true });
      transaction.set(followingRef, { followersCount: increment(-1) }, { merge: true });
    });
  } catch (error) {
    console.warn('Firestore unfollowUser fallback:', error);
    const followRef = doc(db, 'follows', `${followerUid}_${followingUid}`);
    await deleteDoc(followRef).catch(console.warn);
  }
};

export const syncBugReportToFirestore = async (report: BugReportItem): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!report || !report.id) return;
    const reportRef = doc(db, 'bug_reports', report.id);
    await setDoc(reportRef, {
      ...report,
      syncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore bug report sync fallback to local:', error);
  }
};

// ==========================================
// Admin Panel Management Helpers
// ==========================================

export const subscribeToUniversalReports = (callback: (reports: any[]) => void): (() => void) => {
  try {
    const reportsRef = collection(db, 'universal_reports');
    const q = query(reportsRef, orderBy('syncedAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: any[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            reports.push({ ...docSnap.data(), id: docSnap.id });
          }
        });
        callback(reports);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'universal_reports');
        } catch {
          // Handled and error logged via handleFirestoreError
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, 'universal_reports');
    } catch {
      // Handled and error logged via handleFirestoreError
    }
    return () => {};
  }
};

export const updateUserInFirestore = async (userId: string, data: Partial<User>): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.warn('Failed to update user in Firestore:', error);
  }
};

export const deleteUserFromFirestore = async (userId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.warn('Failed to delete user from Firestore:', error);
  }
};

export const deleteUniversalReportFromFirestore = async (reportId: string): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!reportId) return;
    const reportRef = doc(db, 'universal_reports', reportId);
    await deleteDoc(reportRef);
  } catch (error) {
    console.warn('Failed to delete report from Firestore:', error);
  }
};

export const subscribeToAllPosts = (callback: (posts: Post[]) => void): (() => void) => {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsList: Post[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            postsList.push(normalizePost({ ...docSnap.data(), id: docSnap.id }));
          }
        });
        callback(postsList);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'posts');
        } catch {
          // Handled and error logged via handleFirestoreError
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, 'posts');
    } catch {
      // Handled and error logged via handleFirestoreError
    }
    return () => {};
  }
};
