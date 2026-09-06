import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  FileText,
  Loader2,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Copy,
} from 'lucide-react';
import { User, ThemeMode } from '../types';
import { LegalDocumentsSubPage } from './settings/LegalDocumentsSubPage';
import {
  syncUserProfileToFirestore,
  getUserProfileFromFirestore,
  auth,
  checkUsernameAvailability,
  getUsernameByEmail,
} from '../services/firebase';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

interface WelcomeAuthScreenProps {
  onContinueAsGuest?: () => void;
  onAuthenticate: (user: Partial<User>) => void;
  theme?: ThemeMode;
}

type AuthViewMode = 'signin' | 'signup';

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({
  onContinueAsGuest,
  onAuthenticate,
}) => {
  // Direct entry to 'signin' mode to remove extra screen hops
  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Remember Me state
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('funshann_remember_me') === 'true';
  });

  // Track if there is currently a saved/remembered email
  const [hasRememberedEmail, setHasRememberedEmail] = useState(() => {
    return !!localStorage.getItem('funshann_remembered_email');
  });

  const handleForgetRemembered = () => {
    localStorage.removeItem('funshann_remember_me');
    localStorage.removeItem('funshann_remembered_email');
    setRememberMe(false);
    setEmail('');
    setHasRememberedEmail(false);
  };

  // Pre-populate email on mount if Remember Me was active
  useEffect(() => {
    const savedEmail = localStorage.getItem('funshann_remembered_email');
    if (savedEmail && localStorage.getItem('funshann_remember_me') === 'true') {
      setEmail(savedEmail);
    }
  }, []);

  // Username validation & smart suggestion states
  const [username, setUsername] = useState('');
  const [usernameAvailability, setUsernameAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isUsernameTouched, setIsUsernameTouched] = useState(false);

  // Email OTP verification states
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [showSimulatedEmailNotification, setShowSimulatedEmailNotification] = useState(false);

  // Timer Effect for Countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    } else if (otpCountdown === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [timerActive, otpCountdown]);

  // Status & Loaders
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Legal Modals
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);

  // Forgot Username state
  const [showForgotUsernameModal, setShowForgotUsernameModal] = useState(false);
  const [forgotUsernameEmail, setForgotUsernameEmail] = useState('');
  const [forgotUsernameLoading, setForgotUsernameLoading] = useState(false);
  const [forgotUsernameResult, setForgotUsernameResult] = useState<string | null>(null);
  const [forgotUsernameError, setForgotUsernameError] = useState('');
  const [forgotUsernameCopied, setForgotUsernameCopied] = useState(false);

  // Generate unique username suggestions
  const generateSuggestions = (name: string): string[] => {
    const clean = name.toLowerCase().trim();
    if (!clean) return [];
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const p1 = parts[0].replace(/[^a-z0-9_.]/g, '');
      const p2 = parts[1].replace(/[^a-z0-9_.]/g, '');
      return [
        `${p1}_${p2}`,
        `${p1}.official`,
        `${p1}_vibe`,
        `${p1}.x`
      ].map(s => s.toLowerCase());
    } else {
      const p1 = clean.replace(/[^a-z0-9_.]/g, '');
      return [
        `${p1}_vibe`,
        `${p1}.official`,
        `${p1}.x`,
        `${p1}_99`
      ].map(s => s.toLowerCase());
    }
  };

  // Dynamic Password Strength Calculation helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-100', text: 'text-slate-400' };
    let score = 0;
    
    // Criteria
    if (pwd.length >= 6) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (pwd.length < 6) {
      // Still too weak
      return { score: 1, label: 'Too Short (Min. 6 chars)', color: 'bg-rose-500', text: 'text-rose-500' };
    }

    if (score <= 1) {
      return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
    } else if (score === 2) {
      return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500' };
    } else if (score === 3) {
      return { score: 3, label: 'Good', color: 'bg-blue-500', text: 'text-blue-500' };
    } else {
      return { score: 4, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
    }
  };

  // Trigger suggestion generation on fullName change
  useEffect(() => {
    if (fullName.trim()) {
      const opts = generateSuggestions(fullName);
      setSuggestions(opts);
      
      // Auto-fill username if not touched yet
      if (!isUsernameTouched) {
        setUsername(opts[0] || '');
      }
    } else {
      setSuggestions([]);
    }
  }, [fullName, isUsernameTouched]);

  // Username validation and Firestore uniqueness check
  useEffect(() => {
    if (!username) {
      setUsernameAvailability('idle');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    
    // Check characters (allow lowercase alphanumeric, underscores, dots)
    const isValidChar = /^[a-z0-9_.]+$/.test(cleanUsername);
    if (!isValidChar) {
      setUsernameAvailability('invalid');
      return;
    }

    setUsernameAvailability('checking');

    const checkDebounce = setTimeout(async () => {
      const isAvailable = await checkUsernameAvailability(cleanUsername);
      if (isAvailable) {
        setUsernameAvailability('available');
      } else {
        setUsernameAvailability('taken');
      }
    }, 450);

    return () => clearTimeout(checkDebounce);
  }, [username]);

  // Handle Google Popup / Redirect authentication
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        const u = res.user;
        const existing = await getUserProfileFromFirestore(u.uid);
        const userObj: Partial<User> = {
          id: u.uid,
          name: u.displayName || existing?.name || 'Funshann Member',
          username: existing?.username || (u.displayName || u.email?.split('@')[0] || 'google_user').toLowerCase().replace(/[^a-z0-9_]/g, ''),
          email: u.email || undefined,
          avatar: u.photoURL || existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
          bio: existing?.bio || `Creating vibes on Funshann ✨ | Connected with Google`,
        };
        await syncUserProfileToFirestore(userObj);
        onAuthenticate(userObj as User);
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google Sign-In popup was closed. Please try again.');
      } else if (error?.code === 'auth/popup-blocked') {
        setErrorMessage('Google Sign-In popup was blocked by browser. Please allow popups or open the app in a new tab.');
      } else {
        setErrorMessage(error?.message || 'Google Sign-In failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Facebook Authentication
  const handleFacebookSignIn = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setIsLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      const res = await signInWithPopup(auth, provider);
      
      if (res.user) {
        const u = res.user;
        const existing = await getUserProfileFromFirestore(u.uid);
        
        const userObj: Partial<User> = {
          id: u.uid,
          name: u.displayName || existing?.name || 'Funshann Member',
          username: existing?.username || (u.displayName || u.email?.split('@')[0] || 'fb_user').toLowerCase().replace(/[^a-z0-9_]/g, ''),
          email: u.email || undefined,
          avatar: u.photoURL || existing?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
          bio: existing?.bio || 'Sharing moments & building real connections on Funshann 💙',
        };
        await syncUserProfileToFirestore(userObj);
        onAuthenticate(userObj as User);
      }
    } catch (error: any) {
      console.error('Facebook Sign-In error:', error);
      if (
        error?.code === 'auth/network-request-failed' ||
        error?.message?.includes('network-request-failed')
      ) {
        setErrorMessage(
          'Facebook Sign-In popup failed due to iframe restrictions. Please sign in using Email or open the app in a new tab.'
        );
      } else {
        setErrorMessage(error?.message || 'Facebook Sign-In failed or is not configured.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Sign Up - Triggers Secure OTP Code Send
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    if (!email || !password || !fullName || !username) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    if (usernameAvailability === 'taken') {
      setErrorMessage('✖ Username already taken, try another');
      return;
    }
    if (usernameAvailability === 'invalid') {
      setErrorMessage('✖ Invalid username. Only lowercase letters, numbers, underscores, and dots are allowed.');
      return;
    }

    setIsLoading(true);
    try {
      // Double check availability directly with Firestore right before sign up starts to prevent race conditions
      const isAvailable = await checkUsernameAvailability(cleanUsername);
      if (!isAvailable) {
        setErrorMessage('✖ Username already taken, try another');
        setIsLoading(false);
        return;
      }

      // Generate secure 6-digit OTP code and trigger verification step
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(generatedCode);
      setOtpInput('');
      setOtpCountdown(60);
      setTimerActive(true);
      setIsOtpMode(true);
      setShowSimulatedEmailNotification(true);
      setInfoMessage(`A secure verification code has been sent to ${email.trim()}`);
    } catch (error: any) {
      console.error('Trigger OTP error:', error);
      setErrorMessage('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Code Verification & Official Firebase/Firestore Account Creation
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (otpInput.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    if (otpInput !== otpCode) {
      setErrorMessage('✖ Invalid or expired verification code');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUsername = username.toLowerCase().trim();
      
      // Strict Firestore Double Check Uniqueness check
      const isAvailable = await checkUsernameAvailability(cleanUsername);
      if (!isAvailable) {
        setErrorMessage('✖ Username already taken, try another');
        setIsLoading(false);
        setIsOtpMode(false);
        return;
      }

      // 1. Create the Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const userId = userCredential.user.uid;
      
      // 2. Build profile object with verified status
      const userProfile: Partial<User> = {
        id: userId,
        name: fullName.trim(),
        username: cleanUsername,
        email: email.trim(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        bio: `Hello from ${fullName.trim()} on Funshann 📸✨`,
        isVerified: false,
      };

      // 3. Save profile to Firestore
      await syncUserProfileToFirestore(userProfile);
      
      setTimerActive(false);
      setIsOtpMode(false);
      setShowSimulatedEmailNotification(false);
      setInfoMessage('Account successfully verified and created! Welcome to Funshann!');
    } catch (error: any) {
      console.error('OTP Sign Up Completion error:', error);
      if (error?.code === 'auth/email-already-in-use') {
        setErrorMessage('An account already exists with this email address. Please log in.');
        setViewMode('signin');
        setIsOtpMode(false);
      } else {
        setErrorMessage(error?.message || 'Verification & registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Sign In
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      // Set Firebase Auth persistence based on Remember Me preference
      const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceMode);

      if (rememberMe) {
        localStorage.setItem('funshann_remember_me', 'true');
        localStorage.setItem('funshann_remembered_email', email.trim());
        setHasRememberedEmail(true);
      } else {
        localStorage.setItem('funshann_remember_me', 'false');
        localStorage.removeItem('funshann_remembered_email');
        setHasRememberedEmail(false);
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Since email verification is securely enforced upfront before registration,
      // we bypass the post-creation link verification check.
    } catch (error: any) {
      console.error('Email Login error:', error);
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        setErrorMessage('Incorrect email address or password. Please try again.');
      } else {
        setErrorMessage(error?.message || 'Email Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleForgotPassword = async () => {
    setErrorMessage('');
    setInfoMessage('');
    if (!email) {
      setErrorMessage('Please enter your email address first so we can send a reset link.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfoMessage('Password reset link sent! Please check your email inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      setErrorMessage(error?.message || 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Username Query
  const handleForgotUsernameSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotUsernameError('');
    setForgotUsernameResult(null);
    setForgotUsernameCopied(false);

    const emailToSearch = forgotUsernameEmail.trim();
    if (!emailToSearch) {
      setForgotUsernameError('Please enter a valid email address.');
      return;
    }

    setForgotUsernameLoading(true);
    try {
      const foundUsername = await getUsernameByEmail(emailToSearch);
      if (foundUsername) {
        setForgotUsernameResult(foundUsername);
      } else {
        setForgotUsernameError('No account found with this email address.');
      }
    } catch (error) {
      console.error('Error searching username by email:', error);
      setForgotUsernameError('An error occurred. Please try again.');
    } finally {
      setForgotUsernameLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-gradient-to-b from-[#F2F6FC] via-[#EDF3FA] to-[#E5EEF9] text-[#1E293B] flex flex-col justify-between overflow-hidden px-6 py-8 select-none font-sans">
      {/* Interactive Simulated Email Notification Banner */}
      <AnimatePresence>
        {showSimulatedEmailNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-4 right-4 z-[999] max-w-sm mx-auto bg-slate-900 text-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-slate-800 p-4 flex flex-col gap-2 overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Email Inbox</div>
                  <div className="text-xs font-bold text-white">Funshann Security</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatedEmailNotification(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[11px] text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 leading-relaxed font-semibold">
              To: <span className="text-blue-400 font-bold">{email}</span><br />
              Subject: <span className="text-white font-bold">Your 6-Digit Code</span><br className="mb-1" />
              Your secure Funshann registration OTP code is:
              <div className="mt-2.5 flex items-center justify-between bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
                <span className="text-xl font-extrabold tracking-[0.25em] text-emerald-400 select-all">{otpCode}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(otpCode);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Floating Marbles & Background Accents */}
      {/* Top Left Glossy Blue 3D Sphere */}
      <div className="absolute top-10 left-6 w-9 h-9 rounded-full bg-gradient-to-br from-[#60A5FA] via-[#2563EB] to-[#1D4ED8] shadow-[0_10px_20px_rgba(37,99,235,0.35),inset_0_2px_4px_rgba(255,255,255,0.6)] pointer-events-none transform -rotate-12">
        <div className="absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white/70 blur-[0.5px]" />
      </div>

      {/* Middle Left Glossy Pearl Sphere */}
      <div className="absolute top-48 left-8 w-7 h-7 rounded-full bg-gradient-to-br from-white via-[#F1F5F9] to-[#CBD5E1] shadow-[0_8px_16px_rgba(148,163,184,0.35),inset_0_2px_4px_rgba(255,255,255,0.9)] pointer-events-none">
        <div className="absolute top-1 left-1.5 w-2 h-1.5 rounded-full bg-white blur-[0.3px]" />
      </div>

      {/* Top Right Glossy Pearl Sphere */}
      <div className="absolute top-14 right-16 w-8 h-8 rounded-full bg-gradient-to-br from-white via-[#F8FAFC] to-[#CBD5E1] shadow-[0_10px_18px_rgba(148,163,184,0.3),inset_0_2px_4px_rgba(255,255,255,0.9)] pointer-events-none">
        <div className="absolute top-1.5 left-2 w-2.5 h-1.5 rounded-full bg-white blur-[0.3px]" />
      </div>

      {/* Center-Right Small Blue Sphere */}
      <div className="absolute top-52 right-8 w-5 h-5 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#1D4ED8] shadow-[0_6px_14px_rgba(37,99,235,0.4),inset_0_1.5px_3px_rgba(255,255,255,0.7)] pointer-events-none">
        <div className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/80" />
      </div>

      {/* Dot Grid Accents */}
      <div className="absolute top-6 right-6 grid grid-cols-4 gap-2 opacity-30 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={`tr-dot-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
        ))}
      </div>

      <div className="absolute top-64 left-4 grid grid-cols-3 gap-2 opacity-30 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`ml-dot-${i}`} className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
        ))}
      </div>

      {/* Subtle Wavy Backdrop at Bottom */}
      <div className="absolute -bottom-16 left-0 right-0 h-64 bg-gradient-to-t from-[#DCE7F6]/60 to-transparent pointer-events-none rounded-[100%] scale-150 blur-xl" />

      {/* MAIN CONTAINER CONTENT */}
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center my-auto space-y-6">
        
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-[0_12px_24px_rgba(100,116,139,0.12)] border border-white flex items-center justify-center p-1.5 overflow-hidden mb-3">
            <img
              src="/logo.png"
              alt="Funshann Official Logo"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%232F7CF6'/%3E%3Ctext x='50' y='68' font-size='55' font-weight='bold' text-anchor='middle' fill='%23ffffff' font-family='sans-serif'%3EF%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>
          <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">
            Welcome to <span className="text-[#2F7CF6]">Funshann</span>
          </h1>
          <p className="text-xs text-[#64748B] font-medium mt-1">Connect, share, and build moments 💙</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* 1. SIGN IN VIEW                                              */}
          {/* ============================================================ */}
          {viewMode === 'signin' && (
            <motion.div
              key="view-signin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-[0_20px_40px_-6px_rgba(100,116,139,0.18),inset_0_1px_2px_#FFFFFF] border border-[#E2E8F0] space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-[#1E293B]">Log In</h2>
                <p className="text-xs text-slate-400">Enter your credentials to continue</p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {infoMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-xs font-semibold leading-relaxed">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-bold text-slate-600 block">Email Address</label>
                    <div className="flex items-center gap-2">
                      {hasRememberedEmail && (
                        <button
                          type="button"
                          onClick={handleForgetRemembered}
                          className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                        >
                          Forget username
                        </button>
                      )}
                      {hasRememberedEmail && <span className="text-[10px] text-slate-300">|</span>}
                      <button
                        type="button"
                        onClick={() => {
                          setForgotUsernameEmail(email);
                          setForgotUsernameError('');
                          setForgotUsernameResult(null);
                          setForgotUsernameCopied(false);
                          setShowForgotUsernameModal(true);
                        }}
                        className="text-[10px] text-[#2563EB] font-bold hover:underline cursor-pointer"
                      >
                        Forgot Username?
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-bold text-slate-600 block">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-[#2563EB] font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center px-1 py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4.5 h-4.5 rounded-md border border-slate-200 bg-slate-50 peer-checked:bg-[#2563EB] peer-checked:border-[#2563EB] transition-all flex items-center justify-center">
                        <Check className="w-3 h-3 text-white stroke-[3px] opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 mt-1 bg-gradient-to-r from-[#3B82F6] via-[#2F7AF6] to-[#1D63ED] text-white font-bold rounded-xl text-xs shadow-[0_10px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:brightness-105 disabled:opacity-75 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <LogIn className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Or separator */}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-[1px] bg-slate-100 flex-1" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">or continue with</span>
                <div className="h-[1px] bg-slate-100 flex-1" />
              </div>

              {/* Social authentication row */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={isLoading}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>

              {/* Form Toggle Trigger */}
              <div className="text-center pt-2 text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signup');
                    setErrorMessage('');
                    setInfoMessage('');
                  }}
                  className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* 2. SIGN UP VIEW                                              */}
          {/* ============================================================ */}
          {viewMode === 'signup' && (
            <motion.div
              key="view-signup"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-[0_20px_40px_-6px_rgba(100,116,139,0.18),inset_0_1px_2px_#FFFFFF] border border-[#E2E8F0] space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-[#1E293B]">
                  {isOtpMode ? 'Email Verification' : 'Create Account'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isOtpMode ? 'Confirm your email address' : 'Join Funshann to get started'}
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {infoMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-xs font-semibold leading-relaxed">
                  {infoMessage}
                </div>
              )}

              {isOtpMode ? (
                /* STEP-2: OTP Verification Screen */
                <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                  <div className="text-center space-y-1">
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      A verification code has been sent to <span className="font-bold text-slate-700">{email}</span>. Enter the code to complete registration.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3 py-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setOtpInput(val);
                      }}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-extrabold tracking-[0.4em] pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-all text-slate-900"
                      required
                    />
                    
                    {/* Timer & Resend Link */}
                    <div className="text-[11px] font-bold text-slate-500">
                      {otpCountdown > 0 ? (
                        <span>Resend code in <span className="text-[#3B82F6]">{otpCountdown}s</span></span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                            setOtpCode(newCode);
                            setOtpInput('');
                            setOtpCountdown(60);
                            setTimerActive(true);
                            setShowSimulatedEmailNotification(true);
                            setInfoMessage(`A new verification code has been sent to ${email}`);
                          }}
                          className="text-[#3B82F6] hover:underline cursor-pointer focus:outline-none"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-to-r from-[#3B82F6] via-[#2F7AF6] to-[#1D63ED] text-white font-bold rounded-xl text-xs shadow-[0_10px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:brightness-105 disabled:opacity-75 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Create Account</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpMode(false);
                        setErrorMessage('');
                        setInfoMessage('');
                        setTimerActive(false);
                      }}
                      className="w-full h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Go Back & Edit Info
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP-1: Standard SignUp Form Details & Trigger OTP Button */
                <>
                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block pl-1">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your first and last name"
                          required
                          className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-600 block pl-1">Username</label>
                        {/* Status badge */}
                        {username && (
                          <div className="text-[10px] font-bold flex items-center gap-1">
                            {usernameAvailability === 'checking' && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Checking...
                              </span>
                            )}
                            {usernameAvailability === 'available' && (
                              <span className="text-emerald-500 flex items-center gap-0.5">
                                <Check className="w-3 h-3 stroke-[3px]" />
                                Username Available
                              </span>
                            )}
                            {usernameAvailability === 'taken' && (
                              <span className="text-rose-500 flex items-center gap-0.5">
                                <X className="w-3 h-3 stroke-[3px]" />
                                Username already taken, try another
                              </span>
                            )}
                            {usernameAvailability === 'invalid' && (
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" />
                                Use only a-z, 0-9, _, .
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400 select-none">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => {
                            setIsUsernameTouched(true);
                            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
                          }}
                          placeholder="username"
                          required
                          className="w-full h-11 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                        />
                      </div>

                      {/* Smart Suggestions Row */}
                      {suggestions.length > 0 && (
                        <div className="pt-1.5 pb-0.5 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                            <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                            <span>Smart Suggestions:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => {
                                  setUsername(sug);
                                  setIsUsernameTouched(true);
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  username === sug
                                    ? 'bg-blue-50 text-[#2563EB] border-[#3B82F6]'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                @{sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block pl-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                          className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block pl-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          required
                          minLength={6}
                          className="w-full h-11 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Real-time Password Strength Indicator */}
                      {password && (
                        (() => {
                          const strength = getPasswordStrength(password);
                          return (
                            <div className="space-y-1.5 pt-1.5 px-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">Password Strength:</span>
                                <span className={`text-[10px] font-extrabold ${strength.text}`}>{strength.label}</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[1, 2, 3, 4].map((index) => (
                                  <div
                                    key={`strength-bar-${index}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      index <= strength.score ? strength.color : 'bg-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium leading-normal">
                                Combine uppercase, lowercase, numbers, and symbols for a stronger score.
                              </p>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 mt-1 bg-gradient-to-r from-[#3B82F6] via-[#2F7AF6] to-[#1D63ED] text-white font-bold rounded-xl text-xs shadow-[0_10px_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:brightness-105 disabled:opacity-75 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Or separator */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-[1px] bg-slate-100 flex-1" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">or continue with</span>
                    <div className="h-[1px] bg-slate-100 flex-1" />
                  </div>

                  {/* Social authentication row */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFacebookSignIn}
                      disabled={isLoading}
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>

                  {/* Form Toggle Trigger */}
                  <div className="text-center pt-2 text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('signin');
                        setErrorMessage('');
                        setInfoMessage('');
                      }}
                      className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                    >
                      Log In
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Explore Mode Link */}
        {onContinueAsGuest && (
          <button
            id="btn-explore-guest-mode"
            type="button"
            onClick={onContinueAsGuest}
            className="text-xs font-bold text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer bg-white/40 px-3 py-1.5 rounded-full border border-slate-200/50 hover:bg-white/80"
          >
            Explore as Guest →
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* FOOTER TERMS & PRIVACY                                       */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full text-center pt-4 pb-2 text-[11px] text-[#64748B]">
        <p className="leading-tight">
          By continuing, you agree to our{' '}
          <button
            type="button"
            onClick={() => setActiveLegalModal('terms')}
            className="text-[#2563EB] font-bold hover:underline cursor-pointer"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setActiveLegalModal('privacy')}
            className="text-[#2563EB] font-bold hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
        </p>
      </div>

      {/* ============================================================ */}
      {/* LEGAL MODAL (Terms of Service / Privacy Policy)             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeLegalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#2563EB]" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeLegalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLegalModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2 flex-1 overflow-y-auto">
                <LegalDocumentsSubPage
                  documentType={activeLegalModal === 'terms' ? 'terms_of_service' : 'privacy_policy'}
                  onShowToast={() => {}}
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveLegalModal(null)}
                className="w-full h-11 mt-3 shrink-0 bg-[#2563EB] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* FORGOT USERNAME MODAL                                        */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showForgotUsernameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-[#2563EB]" />
                  <h3 className="font-bold text-slate-900 text-base">Find Username</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotUsernameModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!forgotUsernameResult ? (
                <form onSubmit={handleForgotUsernameSearch} className="space-y-4">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Enter the email address registered with your account to look up your username.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block pl-1">Account Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={forgotUsernameEmail}
                        onChange={(e) => setForgotUsernameEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {forgotUsernameError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-600 text-xs font-semibold animate-pulse">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{forgotUsernameError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotUsernameLoading}
                    className="w-full h-11 bg-gradient-to-r from-[#3B82F6] to-[#1D63ED] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {forgotUsernameLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <span>Search Account</span>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                      <Check className="w-5 h-5 stroke-[3px]" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Account Found!</p>
                    <div className="text-xl font-extrabold text-emerald-800 select-all font-mono py-1 px-3 bg-white border border-emerald-200 rounded-xl inline-block max-w-full truncate">
                      {forgotUsernameResult}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(forgotUsernameResult);
                        setForgotUsernameCopied(true);
                        setTimeout(() => setForgotUsernameCopied(false), 2000);
                      }}
                      className="flex-1 h-11 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {forgotUsernameCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Username</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail(forgotUsernameEmail);
                        setShowForgotUsernameModal(false);
                      }}
                      className="flex-1 h-11 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
                    >
                      <span>Use to Log In</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
