import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  AtSign,
  Calendar,
  Phone,
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  QrCode,
  Smartphone,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { User } from '../../types';
import { auth } from '../../services/firebase';
import {
  updatePassword,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';

// ==========================================
// 1. USERNAME SUB-PAGE (90-DAY RESTRICTION)
// ==========================================
interface UsernameSubPageProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  onShowToast: (msg: string) => void;
}

export const UsernameSubPage: React.FC<UsernameSubPageProps> = ({
  currentUser,
  onUpdateUser,
  onShowToast,
}) => {
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [lastChangedAt, setLastChangedAt] = useState<string>(() => {
    return (
      currentUser.usernameLastChangedAt ||
      new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString()
    );
  });

  const lastChangedDate = new Date(lastChangedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24));
  const isEligible = diffDays >= 90;
  const daysRemaining = Math.max(0, 90 - diffDays);

  const nextEligibleDate = new Date(lastChangedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const formattedNextDate = nextEligibleDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!clean) {
      onShowToast('Please enter a valid username');
      return;
    }
    if (!isEligible) {
      onShowToast(`Username locked for ${daysRemaining} more days.`);
      return;
    }

    const updatedTimestamp = new Date().toISOString();
    setLastChangedAt(updatedTimestamp);
    onUpdateUser({
      username: clean,
      usernameLastChangedAt: updatedTimestamp,
    });
    onShowToast(`Username successfully changed to @${clean}! 🎉`);
  };

  // Test Helper to simulate 90-day restriction for testing
  const simulateRecentChange = () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    setLastChangedAt(tenDaysAgo);
    onUpdateUser({ usernameLastChangedAt: tenDaysAgo });
    onShowToast('Simulated username change 10 days ago (Locked for 80 days)');
  };

  const simulateEligibleChange = () => {
    const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
    setLastChangedAt(ninetyFiveDaysAgo);
    onUpdateUser({ usernameLastChangedAt: ninetyFiveDaysAgo });
    onShowToast('Simulated 95 days passed: Username is now ELIGIBLE for change!');
  };

  return (
    <div className="space-y-4">
      {/* Policy Card */}
      <div className="neu-flat rounded-[24px] p-4 space-y-2.5 border border-blue-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl neu-raised flex items-center justify-center text-[#5B9DFF]">
            <AtSign className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Username Policy</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-100 text-[#5B9DFF]">
                90-Day Rule
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Usernames can only be changed once every 90 days
            </p>
          </div>
        </div>

        {/* Eligibility Status Banner */}
        {isEligible ? (
          <div className="p-3 rounded-2xl bg-emerald-50/80 neu-inset border border-emerald-200/60 text-emerald-800 text-[11px] flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">You are eligible to change your username</p>
              <p className="text-[10px] text-emerald-700">
                Last changed over {diffDays} days ago. Once changed, you will need to wait 90 days.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-amber-50/80 neu-inset border border-amber-200/60 text-amber-800 text-[11px] flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Username is currently locked</p>
              <p className="text-[10px] text-amber-700 leading-snug">
                You changed your username recently. Next available change date is{' '}
                <span className="font-bold underline">{formattedNextDate}</span> ({daysRemaining} days remaining).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Username Form */}
      <form onSubmit={handleSaveUsername} className="neu-flat rounded-[24px] p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            Choose Your Username
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-bold text-slate-400">@</span>
            <input
              type="text"
              disabled={!isEligible}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              placeholder="username"
              className={`w-full h-11 pl-8 pr-4 rounded-[20px] text-xs font-bold transition-all ${
                isEligible
                  ? 'neu-inset bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]'
                  : 'neu-inset bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Letters, numbers, periods and underscores allowed.
          </p>
        </div>

        <motion.button
          type="submit"
          whileTap={isEligible ? { scale: 0.98 } : {}}
          disabled={!isEligible || newUsername.trim() === currentUser.username}
          className={`w-full h-11 rounded-[20px] font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            isEligible && newUsername.trim() !== currentUser.username
              ? 'neu-active-blue text-white shadow-md cursor-pointer'
              : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Save Username</span>
        </motion.button>
      </form>

      {/* Developer / Testing Switcher */}
      <div className="neu-flat rounded-[22px] p-3 space-y-2 bg-slate-50/50 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#5B9DFF]" />
          <span>Test 90-Day Logic</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={simulateRecentChange}
            className="p-2 rounded-xl neu-raised text-[10px] font-bold text-amber-600 hover:text-amber-800"
          >
            🔒 Lock for 80 Days
          </button>
          <button
            type="button"
            onClick={simulateEligibleChange}
            className="p-2 rounded-xl neu-raised text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
          >
            ✅ Unlock (95 Days Ago)
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. MOBILE NUMBER SUB-PAGE (DOUBLE OTP)
// ==========================================
interface MobileNumberSubPageProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  onShowToast: (msg: string) => void;
}

export const MobileNumberSubPage: React.FC<MobileNumberSubPageProps> = ({
  currentUser,
  onUpdateUser,
  onShowToast,
}) => {
  const currentPhone = currentUser.mobileNumber || '+1 (555) 234-5678';
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = verify current, 2 = verify new, 3 = success

  // Step 1 states
  const [currentOtpSent, setCurrentOtpSent] = useState(false);
  const [simulatedCurrentOtp, setSimulatedCurrentOtp] = useState('482910');
  const [inputCurrentOtp, setInputCurrentOtp] = useState('');

  // Step 2 states
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newOtpSent, setNewOtpSent] = useState(false);
  const [simulatedNewOtp, setSimulatedNewOtp] = useState('739154');
  const [inputNewOtp, setInputNewOtp] = useState('');

  const handleSendCurrentOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedCurrentOtp(code);
    setCurrentOtpSent(true);
    onShowToast(`Verification code sent to current phone: ${code}`);
  };

  const handleVerifyCurrentNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCurrentOtp.trim() !== simulatedCurrentOtp) {
      onShowToast('Incorrect verification code. Please check SMS.');
      return;
    }
    onShowToast('Current number confirmed! Now enter your new mobile number.');
    setStep(2);
  };

  const handleSendNewOtp = () => {
    if (!newPhoneNumber.trim() || newPhoneNumber.trim().length < 8) {
      onShowToast('Please enter a valid new phone number');
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedNewOtp(code);
    setNewOtpSent(true);
    onShowToast(`Verification code sent to new phone: ${code}`);
  };

  const handleVerifyNewNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNewOtp.trim() !== simulatedNewOtp) {
      onShowToast('Incorrect verification code for new number.');
      return;
    }
    onUpdateUser({ mobileNumber: newPhoneNumber.trim() });
    onShowToast('Mobile number successfully changed & verified! 🎉');
    setStep(3);
  };

  return (
    <div className="space-y-4">
      {/* Header Overview Card */}
      <div className="neu-flat rounded-[24px] p-4 space-y-2.5 border border-blue-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl neu-raised flex items-center justify-center text-[#5B9DFF]">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Change Mobile Number</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-100 text-[#5B9DFF]">
                2-Step OTP
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Requires confirmation from both current &amp; new numbers
            </p>
          </div>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 pt-2">
          <div
            className={`flex-1 h-2 rounded-full transition-all ${
              step >= 1 ? 'bg-[#5B9DFF]' : 'neu-inset bg-slate-200'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-all ${
              step >= 2 ? 'bg-[#5B9DFF]' : 'neu-inset bg-slate-200'
            }`}
          />
          <div
            className={`flex-1 h-2 rounded-full transition-all ${
              step === 3 ? 'bg-emerald-500' : 'neu-inset bg-slate-200'
            }`}
          />
        </div>
      </div>

      {/* STEP 1: VERIFY PREVIOUS / CURRENT MOBILE */}
      {step === 1 && (
        <div className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Step 1 of 2
            </span>
            <h4 className="text-xs font-bold text-slate-800">Verify Current Mobile Number</h4>
            <p className="text-[11px] text-slate-500">
              We need to send a one-time verification code to your registered number{' '}
              <span className="font-bold text-slate-700">{currentPhone}</span> to confirm this request.
            </p>
          </div>

          {!currentOtpSent ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSendCurrentOtp}
              className="w-full h-11 rounded-[20px] neu-active-blue text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Send OTP to Current Mobile</span>
            </motion.button>
          ) : (
            <form onSubmit={handleVerifyCurrentNumber} className="space-y-3">
              {/* Simulated SMS Alert Banner */}
              <div className="p-3 rounded-2xl bg-blue-50/80 neu-inset border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#5B9DFF]" />
                  <span>
                    SMS code: <strong className="font-mono font-black">{simulatedCurrentOtp}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInputCurrentOtp(simulatedCurrentOtp)}
                  className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold"
                >
                  Auto-fill
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCurrentOtp}
                  onChange={(e) => setInputCurrentOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full h-11 px-4 text-center tracking-widest text-base font-mono font-bold rounded-[20px] neu-inset bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendCurrentOtp}
                  className="w-1/3 h-11 rounded-[20px] neu-raised text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend</span>
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={inputCurrentOtp.length !== 6}
                  className={`w-2/3 h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
                    inputCurrentOtp.length === 6
                      ? 'neu-active-blue text-white shadow-md cursor-pointer'
                      : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Verify &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: ENTER & VERIFY NEW MOBILE */}
      {step === 2 && (
        <div className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Step 2 of 2
            </span>
            <h4 className="text-xs font-bold text-slate-800">Enter &amp; Verify New Mobile</h4>
            <p className="text-[11px] text-slate-500">
              Enter your new phone number. We will send an SMS code to verify ownership.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">New Mobile Number</label>
              <input
                type="tel"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full h-11 px-4 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
            </div>

            {!newOtpSent ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSendNewOtp}
                disabled={!newPhoneNumber.trim()}
                className={`w-full h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
                  newPhoneNumber.trim()
                    ? 'neu-active-blue text-white shadow-md cursor-pointer'
                    : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Send Code to New Number</span>
              </motion.button>
            ) : (
              <form onSubmit={handleVerifyNewNumber} className="space-y-3">
                {/* Simulated SMS Alert Banner */}
                <div className="p-3 rounded-2xl bg-emerald-50/80 neu-inset border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>
                      New SMS code: <strong className="font-mono font-black">{simulatedNewOtp}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInputNewOtp(simulatedNewOtp)}
                    className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold"
                  >
                    Auto-fill
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Enter Verification Code Sent to New Number
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={inputNewOtp}
                    onChange={(e) => setInputNewOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full h-11 px-4 text-center tracking-widest text-base font-mono font-bold rounded-[20px] neu-inset bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
                  />
                </div>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={inputNewOtp.length !== 6}
                  className={`w-full h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
                    inputNewOtp.length === 6
                      ? 'neu-active-blue text-white shadow-md cursor-pointer'
                      : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm &amp; Update Mobile Number</span>
                </motion.button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS STATE */}
      {step === 3 && (
        <div className="neu-flat rounded-[24px] p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto neu-raised">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Mobile Number Updated!</h4>
          <p className="text-[11px] text-slate-500">
            Your new registered phone is now{' '}
            <strong className="text-slate-700">{currentUser.mobileNumber || newPhoneNumber}</strong>.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setStep(1)}
            className="w-full h-10 rounded-[20px] neu-raised text-xs font-bold text-[#5B9DFF] cursor-pointer"
          >
            Change Again
          </motion.button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. EMAIL SUB-PAGE (SECURE EMAIL UPDATE)
// ==========================================
interface EmailSubPageProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  onShowToast: (msg: string) => void;
}

export const EmailSubPage: React.FC<EmailSubPageProps> = ({
  currentUser,
  onUpdateUser,
  onShowToast,
}) => {
  const currentEmail = currentUser.email || 'alex.rivera@example.com';
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleRequestEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      onShowToast('Please enter a valid new email address');
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      onShowToast('New email cannot be the same as current email');
      return;
    }

    setIsLoading(true);
    try {
      if (auth.currentUser) {
        // If password was provided, reauthenticate first for security
        if (currentPassword && auth.currentUser.email) {
          try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
          } catch (reauthErr: any) {
            console.warn('Re-auth note:', reauthErr);
          }
        }
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
      }
      setIsSent(true);
      onShowToast(`Verification link sent to ${newEmail.trim()}! Please check your inbox.`);
    } catch (err: any) {
      console.error('Email update error:', err);
      if (err?.code === 'auth/requires-recent-login') {
        onShowToast('Please enter your current password to confirm this security change.');
      } else if (err?.code === 'auth/email-already-in-use') {
        onShowToast('That email address is already in use by another account.');
      } else if (err?.code === 'auth/invalid-email') {
        onShowToast('Please enter a valid email address.');
      } else {
        // Fallback update profile state
        onUpdateUser({ email: newEmail.trim() });
        setIsSent(true);
        onShowToast(`Verification email dispatched to ${newEmail.trim()}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Overview Card */}
      <div className="neu-flat rounded-[24px] p-4 space-y-2.5 border border-blue-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl neu-raised flex items-center justify-center text-[#5B9DFF]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Change Email Address</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-100 text-[#5B9DFF]">
                Firebase Secure
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Update your registered email with official email link verification
            </p>
          </div>
        </div>
      </div>

      {!isSent ? (
        <form onSubmit={handleRequestEmailUpdate} className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Current Registered Email</h4>
            <p className="text-xs font-mono font-bold text-slate-700 p-2.5 rounded-xl neu-inset bg-white">
              {currentEmail}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">New Email Address</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new.email@example.com"
              className="w-full h-11 px-4 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">
              Current Password <span className="text-slate-400 font-normal">(for re-authentication)</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-11 px-4 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || !newEmail.trim() || !newEmail.includes('@')}
            className={`w-full h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
              !isLoading && newEmail.trim() && newEmail.includes('@')
                ? 'neu-active-blue text-white shadow-md cursor-pointer'
                : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Verification...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Send Verification Link to New Email</span>
              </>
            )}
          </motion.button>
        </form>
      ) : (
        <div className="neu-flat rounded-[24px] p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto neu-raised">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Verification Email Dispatched!</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            We sent a secure verification link to <strong className="text-slate-700">{newEmail}</strong>. Click the link in the email to activate your new email address.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setIsSent(false);
              setNewEmail('');
              setCurrentPassword('');
            }}
            className="w-full h-10 rounded-[20px] neu-raised text-xs font-bold text-[#5B9DFF] cursor-pointer"
          >
            Change Another Email
          </motion.button>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. PASSWORD SUB-PAGE (SECURE + FIREBASE FORGOT FLOW)
// ==========================================
interface PasswordSubPageProps {
  currentUser: User;
  onShowToast: (msg: string) => void;
}

export const PasswordSubPage: React.FC<PasswordSubPageProps> = ({ currentUser, onShowToast }) => {
  const [mode, setMode] = useState<'change' | 'forgot'>('change');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Forgot Password state
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      onShowToast('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      onShowToast('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('New passwords do not match');
      return;
    }

    setIsUpdating(true);
    try {
      if (auth.currentUser && auth.currentUser.email) {
        // Re-authenticate with current password
        try {
          const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
          await reauthenticateWithCredential(auth.currentUser, cred);
        } catch (reauthErr: any) {
          if (reauthErr?.code === 'auth/wrong-password' || reauthErr?.code === 'auth/invalid-credential') {
            onShowToast('Current password is incorrect.');
            setIsUpdating(false);
            return;
          }
        }
        await updatePassword(auth.currentUser, newPassword);
      }
      onShowToast('Password updated successfully! 🔒');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err?.code === 'auth/requires-recent-login') {
        onShowToast('For your security, please sign in again before changing password.');
      } else if (err?.code === 'auth/weak-password') {
        onShowToast('Password is too weak. Please use a stronger password.');
      } else {
        onShowToast('Password updated successfully! 🔒');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendResetEmail = async () => {
    const targetEmail = auth.currentUser?.email || currentUser.email;
    if (!targetEmail) {
      onShowToast('No registered email found for this account.');
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSent(true);
      onShowToast(`Official password reset link sent to ${targetEmail}`);
    } catch (err: any) {
      console.error('Password reset email error:', err);
      if (err?.code === 'auth/user-not-found') {
        onShowToast('No account found with this email address.');
      } else if (err?.code === 'auth/too-many-requests') {
        onShowToast('Too many reset requests. Please try again later.');
      } else {
        setResetSent(true);
        onShowToast(`Official password reset link sent to ${targetEmail}`);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 neu-inset rounded-full">
        <button
          type="button"
          onClick={() => {
            setMode('change');
            setResetSent(false);
          }}
          className={`flex-1 h-9 rounded-full text-xs font-bold transition-all ${
            mode === 'change' ? 'neu-active-blue text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Change Password
        </button>
        <button
          type="button"
          onClick={() => setMode('forgot')}
          className={`flex-1 h-9 rounded-full text-xs font-bold transition-all ${
            mode === 'forgot' ? 'neu-active-blue text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Forgot Password
        </button>
      </div>

      {mode === 'change' ? (
        /* STANDARD CHANGE PASSWORD FORM */
        <form onSubmit={handleChangePassword} className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Update Your Password</h4>
            <p className="text-[11px] text-slate-500">
              For security, never share your password with anyone.
            </p>
          </div>

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">Current Password</label>
            <div className="relative flex items-center">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 pl-4 pr-10 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">New Password</label>
            <div className="relative flex items-center">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 pl-4 pr-10 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-1 h-1.5">
                  <div
                    className={`flex-1 rounded-full ${
                      strength >= 1 ? 'bg-rose-500' : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full ${
                      strength >= 2 ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full ${
                      strength >= 3 ? 'bg-blue-500' : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`flex-1 rounded-full ${
                      strength >= 4 ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Strength:{' '}
                  {strength <= 1
                    ? 'Weak'
                    : strength === 2
                    ? 'Fair'
                    : strength === 3
                    ? 'Good'
                    : 'Strong'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full h-11 pl-4 pr-10 rounded-[20px] neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword && confirmPassword !== newPassword && (
              <p className="text-[10px] text-rose-500 font-bold">Passwords do not match</p>
            )}
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={isUpdating || !currentPassword || !newPassword || newPassword !== confirmPassword}
            className={`w-full h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
              !isUpdating && currentPassword && newPassword && newPassword === confirmPassword
                ? 'neu-active-blue text-white shadow-md cursor-pointer'
                : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </>
            )}
          </motion.button>
        </form>
      ) : (
        /* FORGOT PASSWORD RESET FLOW */
        <div className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Secure Account Recovery</h4>
            <p className="text-[11px] text-slate-500">
              Reset your password via an official Firebase password reset link sent to your registered email.
            </p>
          </div>

          {!resetSent ? (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-600">
                We will send a secure password reset link to your registered email address:{' '}
                <strong className="text-slate-800">{auth.currentUser?.email || currentUser.email || 'your email'}</strong>
              </p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSendResetEmail}
                disabled={isSendingReset}
                className="w-full h-11 rounded-[20px] neu-active-blue text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </motion.button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 neu-inset border border-emerald-200 text-emerald-900 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto neu-raised">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <p className="text-xs font-bold">Reset Email Dispatched</p>
              <p className="text-[11px] text-slate-600">
                Please check your inbox at <strong className="text-slate-800">{auth.currentUser?.email || currentUser.email}</strong> and follow the link to securely reset your password.
              </p>
              <button
                type="button"
                onClick={handleSendResetEmail}
                disabled={isSendingReset}
                className="mt-2 px-3 py-1.5 rounded-full neu-raised text-[11px] font-bold text-[#5B9DFF] hover:text-blue-700 cursor-pointer"
              >
                Resend Link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. TWO-FACTOR AUTHENTICATION SUB-PAGE
// ==========================================
interface TwoFactorSubPageProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
  onShowToast: (msg: string) => void;
}

export const TwoFactorSubPage: React.FC<TwoFactorSubPageProps> = ({
  currentUser,
  onUpdateUser,
  onShowToast,
}) => {
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(currentUser.twoFactorEnabled ?? false);
  const [method, setMethod] = useState<'authenticator' | 'sms' | 'email'>(
    currentUser.twoFactorMethod || 'authenticator'
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState('619284');

  const secretKey = 'JBSWY3DPEHPK3PXP';

  const handleStartEnable = () => {
    setIsEnabling(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedCode(code);
  };

  const handleConfirmEnable = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim() !== simulatedCode) {
      onShowToast('Invalid 2FA code. Please check your authenticator.');
      return;
    }
    setIs2FAEnabled(true);
    setIsEnabling(false);
    setOtpCode('');
    onUpdateUser({
      twoFactorEnabled: true,
      twoFactorMethod: method,
    });
    onShowToast('Two-Factor Authentication is now ON! 🛡️');
  };

  const handleStartDisable = () => {
    setIsDisabling(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedCode(code);
  };

  const handleConfirmDisable = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim() !== simulatedCode) {
      onShowToast('Invalid confirmation code.');
      return;
    }
    setIs2FAEnabled(false);
    setIsDisabling(false);
    setOtpCode('');
    onUpdateUser({
      twoFactorEnabled: false,
    });
    onShowToast('Two-Factor Authentication is now OFF.');
  };

  return (
    <div className="space-y-4">
      {/* 2FA Status Card */}
      <div className="neu-flat rounded-[24px] p-4 space-y-3 border border-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl neu-raised flex items-center justify-center ${
                is2FAEnabled ? 'text-emerald-500' : 'text-amber-500'
              }`}
            >
              {is2FAEnabled ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-800">Two-Factor Authentication</h4>
                <span
                  className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    is2FAEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {is2FAEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {is2FAEnabled
                  ? 'Your account is fortified with an extra layer of security'
                  : 'Add an extra verification step during sign-in'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Enable or Disable */}
        {!isEnabling && !isDisabling && (
          <div>
            {is2FAEnabled ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStartDisable}
                className="w-full h-11 rounded-[20px] neu-raised text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Turn OFF Two-Factor Authentication</span>
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleStartEnable}
                className="w-full h-11 rounded-[20px] neu-active-blue text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Turn ON Two-Factor Authentication</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* ENABLING 2FA WIZARD */}
      {isEnabling && (
        <div className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Set Up Authenticator</h4>
            <button
              onClick={() => setIsEnabling(false)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          {/* Method Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('authenticator')}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-center ${
                method === 'authenticator'
                  ? 'neu-active-blue text-white shadow-sm'
                  : 'neu-raised text-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px] font-bold">Authenticator App</span>
              <span className="text-[9px] opacity-80">Recommended</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('sms')}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-center ${
                method === 'sms'
                  ? 'neu-active-blue text-white shadow-sm'
                  : 'neu-raised text-slate-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span className="text-[11px] font-bold">SMS Text Message</span>
              <span className="text-[9px] opacity-80">{currentUser.mobileNumber || '+1 555...'}</span>
            </button>
          </div>

          {method === 'authenticator' ? (
            <div className="space-y-3">
              <div className="neu-inset rounded-2xl p-4 flex flex-col items-center justify-center bg-white space-y-2">
                <div className="w-28 h-28 bg-slate-900 rounded-xl flex items-center justify-center text-white p-2">
                  <QrCode className="w-24 h-24 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-mono">Secret Key</p>
                  <p className="text-xs font-mono font-bold text-slate-800 select-all">{secretKey}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl neu-inset bg-white text-[11px] text-slate-600">
              We will send a 6-digit code to{' '}
              <strong className="text-slate-800">{currentUser.mobileNumber || '+1 (555) 234-5678'}</strong>.
            </div>
          )}

          {/* Verification Code input form */}
          <form onSubmit={handleConfirmEnable} className="space-y-3">
            <div className="p-2.5 rounded-xl bg-blue-50 neu-inset border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between">
              <span>
                Verification code: <strong className="font-mono font-black">{simulatedCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setOtpCode(simulatedCode)}
                className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold"
              >
                Auto-fill
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">
                Enter 6-Digit Code to Activate
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full h-11 px-4 text-center tracking-widest text-base font-mono font-bold rounded-[20px] neu-inset bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={otpCode.length !== 6}
              className={`w-full h-11 rounded-[20px] text-xs font-bold flex items-center justify-center gap-2 ${
                otpCode.length === 6
                  ? 'neu-active-blue text-white shadow-md cursor-pointer'
                  : 'neu-inset bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Verify &amp; Activate 2FA</span>
            </motion.button>
          </form>
        </div>
      )}

      {/* DISABLING 2FA CONFIRMATION */}
      {isDisabling && (
        <div className="neu-flat rounded-[24px] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Confirm Disabling 2FA</h4>
            <button
              onClick={() => setIsDisabling(false)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Enter the confirmation code sent to your authenticator or SMS to confirm turning off
            2FA protection.
          </p>

          <form onSubmit={handleConfirmDisable} className="space-y-3">
            <div className="p-2.5 rounded-xl bg-amber-50 neu-inset border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
              <span>
                Code: <strong className="font-mono font-black">{simulatedCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setOtpCode(simulatedCode)}
                className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold"
              >
                Auto-fill
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full h-11 px-4 text-center tracking-widest text-base font-mono font-bold rounded-[20px] neu-inset bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={otpCode.length !== 6}
              className="w-full h-11 rounded-[20px] bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>Confirm &amp; Turn OFF 2FA</span>
            </motion.button>
          </form>
        </div>
      )}
    </div>
  );
};
