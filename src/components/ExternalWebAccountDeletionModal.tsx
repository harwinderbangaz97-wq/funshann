import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Trash2,
  AlertTriangle,
  Mail,
  CheckCircle2,
  ExternalLink,
  X,
  Shield,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { LEGAL_CONFIG } from '../data/legalConstants';
import { initiateAccountDeletion } from '../services/accountDeletionService';
import { User } from '../types';

interface ExternalWebAccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  onShowToast?: (msg: string) => void;
}

export const ExternalWebAccountDeletionModal: React.FC<ExternalWebAccountDeletionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [deletionScope, setDeletionScope] = useState<'full_account' | 'specific_data'>('full_account');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['posts', 'messages', 'search_history']);
  const [reason, setReason] = useState('Google Play Web Deletion Request');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [trackingId, setTrackingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      if (onShowToast) onShowToast('Please provide both username and registered email.');
      return;
    }
    setStep('otp');
    if (onShowToast) onShowToast(`Verification code sent to ${email}`);
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = clean;
    setOtp(updated);

    if (clean && index < 5) {
      document.getElementById(`web-del-otp-${index + 1}`)?.focus();
    }
  };

  const handleConfirmDeletion = () => {
    const code = otp.join('');
    if (code.length < 6) {
      if (onShowToast) onShowToast('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedTrack = `GPLAY-DEL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      setTrackingId(generatedTrack);

      const dummyUser: User = currentUser || {
        id: `web_user_${username}`,
        username: username.replace('@', ''),
        name: username,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        email: email,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
      };

      initiateAccountDeletion(dummyUser, reason, `Web Deletion Portal Scope: ${deletionScope}`, 'google_play_web_portal');

      setIsSubmitting(false);
      setStep('success');
      if (onShowToast) onShowToast('Deletion request submitted successfully.');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md max-h-[90vh] bg-white neu-flat rounded-[28px] overflow-hidden flex flex-col border border-slate-200 shadow-2xl"
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 neu-raised flex items-center justify-center text-[#5B9DFF]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Web Account Deletion Portal</h3>
              <p className="text-[10px] text-slate-500 font-mono">funshann.app/delete-account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-left">
          {/* Policy Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Google Play Data Safety & Deletion Requirement</p>
              <p className="text-amber-800/90 leading-snug">
                You can request account or selective data deletion without opening the mobile app. All primary profile and user-generated content will be permanently purged after a 30-day grace period.
              </p>
            </div>
          </div>

          {step === 'form' && (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Funshann Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full h-10 px-3.5 neu-inset rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full h-10 px-3.5 neu-inset rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Deletion Scope */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 block">Deletion Request Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletionScope('full_account')}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                      deletionScope === 'full_account'
                        ? 'border-red-400 bg-red-50/50 text-red-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Full Account Deletion</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Erase profile, posts, messages & handle</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletionScope('specific_data')}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                      deletionScope === 'specific_data'
                        ? 'border-[#5B9DFF] bg-blue-50/50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs">Specific Data Only</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Keep account, delete selected logs/media</p>
                  </button>
                </div>
              </div>

              {deletionScope === 'specific_data' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <span className="font-bold text-[11px] text-slate-500 block">Select Data Categories to Purge:</span>
                  {[
                    { id: 'posts', label: 'All uploaded Posts & Stories' },
                    { id: 'messages', label: 'Direct Chat History' },
                    { id: 'search_history', label: 'Search & Navigation Logs' },
                    { id: 'location_tags', label: 'Location Metadata on Posts' },
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDataTypes.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDataTypes([...selectedDataTypes, item.id]);
                          } else {
                            setSelectedDataTypes(selectedDataTypes.filter((x) => x !== item.id));
                          }
                        }}
                        className="rounded text-[#5B9DFF] focus:ring-0"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold shadow-md hover:from-red-600 hover:to-rose-700 transition cursor-pointer"
                >
                  Send Verification Code to Email
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full neu-raised flex items-center justify-center mx-auto text-[#5B9DFF]">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Email Verification</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter the 6-digit code sent to <strong className="text-slate-700">{email}</strong> to authenticate your deletion request.
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-1">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    id={`web-del-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[idx]}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-9 h-11 rounded-xl neu-inset bg-white text-center text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex-1 h-11 rounded-xl neu-raised text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletion}
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Request'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 neu-raised flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Deletion Request Logged</h4>
                <p className="text-xs text-[#5B9DFF] font-mono font-bold mt-1">Ticket: #{trackingId}</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed mt-2">
                  A confirmation email with your formal tracking reference and grace period details has been dispatched to <strong>{email}</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 text-left space-y-1">
                <p>• <strong>Retention Policy:</strong> 30-day grace period before permanent erasure.</p>
                <p>• <strong>Legal Records:</strong> Mandated security &amp; financial audit logs retained per law.</p>
                <p>• <strong>Support:</strong> Questions? Email <span className="font-mono text-[#5B9DFF]">{LEGAL_CONFIG.SUPPORT_EMAIL}</span>.</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-2xl neu-raised text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Close Portal
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
