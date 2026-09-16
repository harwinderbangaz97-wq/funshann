import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LifeBuoy,
  Mail,
  Smartphone,
  ShieldCheck,
  KeyRound,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { User } from '../../types';

interface AccountRecoverySubPageProps {
  currentUser: User;
  onShowToast: (msg: string) => void;
}

export const AccountRecoverySubPage: React.FC<AccountRecoverySubPageProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [method, setMethod] = useState<'options' | 'email_flow' | 'sms_flow' | 'support_ticket'>('options');
  const [targetContact, setTargetContact] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketUsername, setTicketUsername] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');

  const handleSendRecoveryCode = (type: 'email' | 'sms') => {
    if (!targetContact.trim()) {
      onShowToast(`Please enter your registered ${type === 'email' ? 'email address' : 'phone number'}.`);
      return;
    }
    onShowToast(`Recovery code dispatched to ${targetContact}`);
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...recoveryOtp];
    updated[index] = clean;
    setRecoveryOtp(updated);

    if (clean && index < 5) {
      const next = document.getElementById(`rec-otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleCompleteReset = () => {
    if (recoveryOtp.join('').length < 6) {
      onShowToast('Please enter the 6-digit recovery code.');
      return;
    }
    if (newPassword.length < 8) {
      onShowToast('New password must be at least 8 characters long.');
      return;
    }
    setIsSuccess(true);
    onShowToast('Account recovery complete! Password updated successfully.');
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketUsername || !ticketEmail || !ticketDescription) {
      onShowToast('Please complete all required fields for identity verification.');
      return;
    }
    setIsSuccess(true);
    onShowToast('Account recovery request #REC-9821 submitted. Our trust team will respond within 24 hours.');
  };

  if (isSuccess) {
    return (
      <div className="neu-flat rounded-[28px] p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 neu-raised flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Recovery Step Complete</h3>
          <p className="text-xs text-slate-500 mt-1">
            Your security verification has succeeded. Account access credentials have been securely restored.
          </p>
        </div>
        <button
          onClick={() => {
            setIsSuccess(false);
            setMethod('options');
          }}
          className="w-full h-11 rounded-2xl neu-active-blue text-xs font-bold text-white shadow-xs"
        >
          Return to Recovery Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Informational Header */}
      <div className="neu-flat rounded-[24px] p-4 flex items-start gap-3 bg-gradient-to-r from-blue-50/40 via-white to-white border border-blue-100/60">
        <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] flex-shrink-0">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Secure Account Recovery</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            If you or someone you know has lost access to their account, select an authorized identity recovery method below.
          </p>
        </div>
      </div>

      {method === 'options' && (
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 block">
            Select Recovery Channel
          </span>

          {/* 1. Email Recovery */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTargetContact(currentUser.email || '');
              setMethod('email_flow');
            }}
            className="neu-flat rounded-[22px] p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-blue-600">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Recover via Registered Email</h4>
                <p className="text-[11px] text-slate-500">
                  Receive a secure one-time magic reset code via email
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </motion.div>

          {/* 2. SMS Recovery */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setTargetContact(currentUser.mobileNumber || '');
              setMethod('sms_flow');
            }}
            className="neu-flat rounded-[22px] p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-emerald-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Recover via Mobile SMS OTP</h4>
                <p className="text-[11px] text-slate-500">
                  Receive a 6-digit text message code to your verified mobile number
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </motion.div>

          {/* 3. Human Identity Review Ticket */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setMethod('support_ticket')}
            className="neu-flat rounded-[22px] p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Submit Identity Verification Ticket</h4>
                <p className="text-[11px] text-slate-500">
                  Lost access to both email and phone? Submit verification request to Funshann Trust Team
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </motion.div>
        </div>
      )}

      {(method === 'email_flow' || method === 'sms_flow') && (
        <div className="neu-flat rounded-[24px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              {method === 'email_flow' ? 'Email Recovery' : 'Mobile SMS Recovery'}
            </h4>
            <button
              onClick={() => setMethod('options')}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">
              {method === 'email_flow' ? 'Registered Email Address' : 'Registered Mobile Number'}
            </label>
            <div className="flex gap-2">
              <input
                type={method === 'email_flow' ? 'email' : 'tel'}
                value={targetContact}
                onChange={(e) => setTargetContact(e.target.value)}
                placeholder={method === 'email_flow' ? 'your.email@domain.com' : '+1 (555) 000-0000'}
                className="flex-1 h-11 px-3 rounded-2xl neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
              />
              <button
                onClick={() => handleSendRecoveryCode(method === 'email_flow' ? 'email' : 'sms')}
                className="px-4 h-11 rounded-2xl neu-active-blue text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                Send Code
              </button>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[11px] font-bold text-slate-600 block">
              Enter 6-Digit Recovery Code
            </label>
            <div className="flex justify-between gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  id={`rec-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={recoveryOtp[i]}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="w-10 h-12 rounded-2xl neu-inset bg-white text-center text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
                />
              ))}
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-600">Set New Secure Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters..."
              className="w-full h-11 px-3 rounded-2xl neu-inset bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <button
            onClick={handleCompleteReset}
            className="w-full h-11 rounded-2xl neu-active-blue text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            Reset Password & Restore Access
          </button>
        </div>
      )}

      {method === 'support_ticket' && (
        <form onSubmit={handleSubmitTicket} className="neu-flat rounded-[24px] p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Identity Review Ticket</h4>
            <button
              type="button"
              onClick={() => setMethod('options')}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Back
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Account Username to Recover</label>
            <input
              type="text"
              value={ticketUsername}
              onChange={(e) => setTicketUsername(e.target.value)}
              placeholder="e.g. alexrivera"
              className="w-full h-10 px-3 rounded-2xl neu-inset bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Alternative Email to Contact You</label>
            <input
              type="email"
              value={ticketEmail}
              onChange={(e) => setTicketEmail(e.target.value)}
              placeholder="e.g. backup@domain.com"
              className="w-full h-10 px-3 rounded-2xl neu-inset bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Explanation & Proof of Ownership</label>
            <textarea
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              placeholder="Describe when you created the account, past devices used, or upload verification info..."
              rows={3}
              className="w-full p-3 rounded-2xl neu-inset bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-2xl neu-active-blue text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            Submit Account Review Request
          </button>
        </form>
      )}
    </div>
  );
};
