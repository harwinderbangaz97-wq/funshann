import React from 'react';
import { motion } from 'motion/react';
import {
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Trash2,
  ChevronRight,
  LifeBuoy,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { User, SettingsSection } from '../../types';

interface AccountSecurityHubSubPageProps {
  currentUser: User;
  onNavigateSection: (section: SettingsSection) => void;
  onShowToast: (msg: string) => void;
}

export const AccountSecurityHubSubPage: React.FC<AccountSecurityHubSubPageProps> = ({
  currentUser,
  onNavigateSection,
  onShowToast,
}) => {
  return (
    <div className="space-y-4 pb-4">
      {/* Account Overview Header */}
      <div className="neu-flat rounded-[24px] p-4 flex items-center gap-3 bg-gradient-to-r from-blue-50/50 via-white to-white border border-blue-100/60">
        <div className="w-12 h-12 rounded-full neu-raised overflow-hidden flex-shrink-0">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</h4>
          <p className="text-[11px] text-[#5B9DFF] font-medium">@{currentUser.username}</p>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-200">
            Account Active &amp; Verified
          </span>
        </div>
      </div>

      {/* Primary Credentials */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Login &amp; Contact Credentials
        </span>

        <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
          {/* Username */}
          <button
            type="button"
            onClick={() => onNavigateSection('username')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-700">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Username</p>
                <p className="text-[11px] text-[#5B9DFF]">@{currentUser.username}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>



          {/* Email Address */}
          <button
            type="button"
            onClick={() => onNavigateSection('email')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-blue-500">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Email Address</p>
                <p className="text-[11px] text-slate-500">
                  {currentUser.email || 'user@funshann.com'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Password */}
          <button
            type="button"
            onClick={() => onNavigateSection('password')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-amber-500">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Password</p>
                <p className="text-[11px] text-slate-500">Last changed 42 days ago</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Security & Authentication */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Security &amp; Protection
        </span>

        <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
          {/* Two-Factor Auth */}
          <button
            type="button"
            onClick={() => onNavigateSection('two_factor')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-emerald-600">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Two-Factor Authentication</p>
                <p className="text-[11px] text-emerald-600 font-medium">
                  {currentUser.twoFactorEnabled ? 'Enabled (Authenticator App)' : 'Recommended for security'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Saved Login / Trusted Devices */}
          <button
            type="button"
            onClick={() => onNavigateSection('saved_login')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Saved Login &amp; Devices</p>
                <p className="text-[11px] text-slate-500">Manage active sessions &amp; passkeys</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Account Recovery */}
          <button
            type="button"
            onClick={() => onNavigateSection('account_recovery')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-indigo-500">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Account Recovery</p>
                <p className="text-[11px] text-slate-500">Backup codes &amp; trusted contacts</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Account Status */}
          <button
            type="button"
            onClick={() => onNavigateSection('account_status')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Account Status</p>
                <p className="text-[11px] text-slate-500">Good standing • Zero strikes</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Data Management & Deletion */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Account Management
        </span>

        <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
          {/* Delete Account */}
          <button
            type="button"
            onClick={() => onNavigateSection('delete_account')}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-rose-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-600">Delete Account</p>
                <p className="text-[11px] text-slate-500">Permanently erase your account &amp; data</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
