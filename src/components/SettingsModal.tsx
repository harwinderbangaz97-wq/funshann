import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User as UserIcon,
  Shield,
  Bell,
  HardDrive,
  Sparkles,
  HelpCircle,
  ChevronRight,
  Check,
  Smartphone,
  Trash2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Palette,
  CheckCircle2,
  Users,
  ExternalLink,
  Info,
  Globe,
  Cake,
  Phone,
  Mail,
  Edit3,
  Calendar,
  UserX,
  MessageSquare,
  FileText,
  LifeBuoy,
  HeartHandshake,
  Bug,
  BookOpen,
  Scale,
  Search,
  Activity,
  Baby,
  Copyright,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  User,
  ThemeMode,
  SettingsSection,
  AppPermissionsState,
  ChatThread,
} from '../types';

export type { SettingsSection };
import { useNavigation } from '../context/NavigationContext';
import { useTranslation } from '../context/LanguageContext';
import { getStoredPermissions, saveStoredPermissions } from '../services/permissionService';
import { getSavedLanguage, LANGUAGES_LIST } from '../services/languageService';
import { clearSearchHistory, getSearchHistory } from '../services/searchHistoryService';
import { AndroidSystemSettingsModal } from './AndroidSystemSettingsModal';

// Subpage Components
import {
  UsernameSubPage,
  EmailSubPage,
  PasswordSubPage,
  TwoFactorSubPage,
} from './settings/AccountSettingsSubPages';
import { AccountSecurityHubSubPage } from './settings/AccountSecurityHubSubPage';
import { GrievanceSubPage } from './settings/GrievanceSubPage';
import { NotificationsSubPage } from './settings/NotificationsSubPage';
import { LanguageSubPage } from './settings/LanguageSubPage';
import { AppAppearanceSubPage } from './settings/AppAppearanceSubPage';
import { SavedLoginSubPage } from './settings/SavedLoginSubPage';
import { MyReportsSubPage } from './settings/MyReportsSubPage';
import { AccountStatusSubPage } from './settings/AccountStatusSubPage';
import { DeleteAccountSubPage } from './settings/DeleteAccountSubPage';
import { PublicProfileSubPage } from './settings/PublicProfileSubPage';
import { AppPermissionsSubPage } from './settings/AppPermissionsSubPage';
import { ContactSyncSubPage } from './settings/ContactSyncSubPage';
import { PrivacyControlsSubPage } from './settings/PrivacyControlsSubPage';
import { BlockedListSubPage } from './settings/BlockedListSubPage';
import { WhoCanContactSubPage } from './settings/WhoCanContactSubPage';
import { ClearConversationsSubPage } from './settings/ClearConversationsSubPage';
import { AccountRecoverySubPage } from './settings/AccountRecoverySubPage';
import { SafetyCenterSubPage } from './settings/SafetyCenterSubPage';
import { HelpCentreSubPage } from './settings/HelpCentreSubPage';
import { BugsAndSuggestionsSubPage } from './settings/BugsAndSuggestionsSubPage';
import { LegalDocumentsSubPage } from './settings/LegalDocumentsSubPage';

interface SettingsModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (updated: Partial<User>) => void;
  onShowToast: (message: string) => void;
  onResetData?: () => void;
  users?: User[];
  chatThreads?: ChatThread[];
  onDeleteChatThreads?: (threadIds: string[]) => void;
  lockedChatUserIds?: string[];
  chatLockPasscode?: string;
  isChatLockEnabled?: boolean;
  onUpdateLockedChatUserIds?: (ids: string[]) => void;
  onUpdateChatLockPasscode?: (pin: string) => void;
  onUpdateChatLockEnabled?: (enabled: boolean) => void;
  theme?: ThemeMode;
  onUpdateTheme?: (theme: ThemeMode) => void;
  initialSection?: SettingsSection;
  onLogout?: () => void;
  permissionsState?: AppPermissionsState;
  onUpdatePermissions?: (perms: AppPermissionsState) => void;
  onRerunPermissionOnboarding?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUpdateUser,
  onShowToast,
  onResetData,
  users = [],
  chatThreads = [],
  onDeleteChatThreads,
  lockedChatUserIds = [],
  chatLockPasscode = '123456',
  isChatLockEnabled = true,
  onUpdateLockedChatUserIds,
  onUpdateChatLockPasscode,
  onUpdateChatLockEnabled,
  theme = 'light',
  onUpdateTheme,
  initialSection = 'main',
  onLogout,
  permissionsState: externalPermissionsState,
  onUpdatePermissions,
  onRerunPermissionOnboarding,
}) => {
  const { navState, setSettingsSection, goBack, closeSettings, setIsEditProfileOpen, navigateToTab } = useNavigation();
  const { t, languageObj } = useTranslation();
  const currentSection: SettingsSection = (navState.settingsSection || initialSection || 'main') as SettingsSection;
  const setCurrentSection = (sec: SettingsSection) => setSettingsSection(sec);

  const [cacheSize, setCacheSize] = useState('28.4 MB');

  // In-place editable state for Name
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentUser.name);

  // In-place editable state for Birthday
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [tempBirthday, setTempBirthday] = useState(currentUser.birthday || '1998-05-14');

  const [localPermissions, setLocalPermissions] = useState<AppPermissionsState>(() => {
    return externalPermissionsState || getStoredPermissions();
  });
  const [showAndroidSystemSettingsModal, setShowAndroidSystemSettingsModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  // Keep local copies in sync if currentUser updates
  useEffect(() => {
    setTempName(currentUser.name);
    if (currentUser.birthday) {
      setTempBirthday(currentUser.birthday);
    }
  }, [currentUser.name, currentUser.birthday]);

  useEffect(() => {
    if (externalPermissionsState) {
      setLocalPermissions(externalPermissionsState);
    }
  }, [externalPermissionsState]);

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (!tempName.trim()) {
      onShowToast('Name cannot be empty');
      return;
    }
    onUpdateUser({ name: tempName.trim() });
    setIsEditingName(false);
    onShowToast('Name updated successfully! ✨');
  };

  const handleSaveBirthday = () => {
    if (!tempBirthday) {
      onShowToast('Please select a valid date');
      return;
    }
    onUpdateUser({ birthday: tempBirthday });
    setIsEditingBirthday(false);
    onShowToast('Birthday updated successfully! 🎂');
  };

  const handleClearCache = () => {
    setCacheSize('0.0 MB');
    onShowToast('Cache cleared successfully! 28.4 MB freed.');
  };

  const handleClearSearchHistoryAction = () => {
    clearSearchHistory();
    setShowClearHistoryConfirm(false);
    onShowToast('Search history cleared permanently 🔍');
  };

  const handleResetDefaults = () => {
    setCacheSize('28.4 MB');
    if (onResetData) onResetData();
    onShowToast('Settings restored to default values');
  };

  const handleDeleteAccountConfirm = (reason: string, feedback: string) => {
    onShowToast('Account deletion initiated. 30-day deactivation active.');
    onClose();
    if (onLogout) onLogout();
  };

  const maskMobile = (phone?: string) => {
    if (!phone) return '+1 (555) 234-5678';
    if (phone.length <= 6) return phone;
    const end = phone.slice(-4);
    return `+1 (555) •••-${end}`;
  };

  const maskEmail = (email?: string) => {
    if (!email) return 'alex.rivera@example.com';
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const maskedName = name.length > 2 ? `${name[0]}•••${name[name.length - 1]}` : `${name[0]}•••`;
    return `${maskedName}@${parts[1]}`;
  };

  const formatBirthday = (dateStr?: string) => {
    if (!dateStr) return 'May 14, 1998';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getSectionTitle = (sec: SettingsSection): { title: string; subtitle: string } => {
    switch (sec) {
      case 'main':
        return { title: 'Settings', subtitle: `@${currentUser.username}` };
      case 'account_security':
        return { title: 'Account & Security', subtitle: 'Credentials & Protection' };
      case 'username':
        return { title: 'Change Username', subtitle: '90-Day Policy' };
      case 'mobile':
        return { title: 'Mobile Number', subtitle: 'OTP Verified' };
      case 'email':
        return { title: 'Email Address', subtitle: 'Security Confirmation' };
      case 'password':
        return { title: 'Password', subtitle: 'Update Credentials' };
      case 'two_factor':
        return { title: 'Two-Factor Authentication', subtitle: 'Account Protection' };
      case 'saved_login':
        return { title: 'Saved Login', subtitle: 'Session Controls' };
      case 'my_reports':
        return { title: 'My Reports', subtitle: 'Submitted Infractions' };
      case 'account_status':
        return { title: 'Account Status', subtitle: 'Account Health & Standing' };
      case 'delete_account':
        return { title: 'Delete Account', subtitle: 'Permanent Account Purge' };
      case 'account_recovery':
        return { title: "I've Lost My Account", subtitle: 'Identity & Access Recovery' };
      case 'theme':
      case 'appearance':
        return { title: 'App Appearance', subtitle: 'Theme & Accent Controls' };
      case 'permissions':
        return { title: 'App Permissions', subtitle: 'Android System Access' };
      case 'contact_sync':
        return { title: 'Contact Syncing', subtitle: 'Find Friends & Privacy' };
      case 'notifications':
        return { title: 'Notifications', subtitle: 'Alerts & Quiet Hours' };
      case 'language':
        return { title: 'Language', subtitle: '42 Languages Available' };
      case 'media':
        return { title: 'Media & Cache', subtitle: 'Storage Management' };
      case 'public_profile':
        return { title: 'Public Profile Settings', subtitle: 'Visitor Visibility' };
      case 'privacy':
      case 'privacy_controls':
        return { title: 'Privacy Controls', subtitle: 'Mentions, Tags & Activity' };
      case 'blocked_list':
        return { title: 'Blocked List', subtitle: 'Restricted Accounts' };
      case 'who_can_contact':
        return { title: 'Who Can Contact Me', subtitle: 'Direct Message Privacy' };
      case 'clear_conversation':
        return { title: 'Clear Conversations', subtitle: 'Manage Inbox Histories' };
      case 'safety_centre':
        return { title: 'Safety Centre', subtitle: 'Helplines & Resources' };
      case 'help_centre':
        return { title: 'Help Centre', subtitle: 'Guides & Support Ticket' };
      case 'bugs_suggestions':
        return { title: 'Report a Problem', subtitle: 'Feedback & Issue Reports' };
      case 'grievance':
        return { title: 'Grievance / Complaints', subtitle: 'Statutory Redressal Officer' };
      case 'more_info':
      case 'about':
        return { title: 'About Funshann', subtitle: 'App Specifications & Build' };
      case 'privacy_policy':
        return { title: 'Privacy Policy', subtitle: 'Data Protections' };
      case 'terms_of_service':
        return { title: 'Terms & Conditions', subtitle: 'User Agreement & Guidelines' };
      case 'community_guidelines':
        return { title: 'Community Guidelines', subtitle: 'Safety & Respect Standards' };
      case 'copyright_ip':
        return { title: 'Copyright & Intellectual Property', subtitle: 'DMCA & Content Rights' };
      case 'child_safety':
        return { title: 'Child Safety & Age Policy', subtitle: 'Protection of Minors' };
      case 'disclaimer':
      case 'app_disclaimer':
        return { title: 'App Disclaimer', subtitle: 'Service Limitations & Terms' };
      case 'other_legal':
        return { title: 'Other Legal Notices', subtitle: 'Open Source Licenses' };
      default:
        return { title: 'Settings', subtitle: 'Funshann Android' };
    }
  };

  const headerInfo = getSectionTitle(currentSection);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="neu-flat rounded-t-[32px] sm:rounded-[32px] max-w-md w-full h-[88vh] sm:h-[650px] flex flex-col overflow-hidden relative shadow-2xl"
      >
        {/* Header Bar with Android Back & Title */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100/80 bg-white/70 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {currentSection !== 'main' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={goBack}
                className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-700 hover:text-[#5B9DFF] cursor-pointer"
                title="Back to Settings"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </motion.button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight font-['Outfit']">
                {headerInfo.title}
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={closeSettings}
            className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* ========================================================================= */}
          {/* 1. MAIN SETTINGS SCREEN (Grouped into standard clear categories) */}
          {/* ========================================================================= */}
          {currentSection === 'main' && (
            <div className="space-y-5">
              {/* Profile Summary Card */}
              <div className="neu-flat rounded-[24px] p-4 bg-gradient-to-r from-blue-50/50 via-white to-white border border-blue-100/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-full neu-raised p-0.5 relative">
                    <img
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-100 text-[#5B9DFF]">
                        Active
                      </span>
                    </h3>
                    <p className="text-xs font-semibold text-[#5B9DFF]">@{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400">Personal Account • Verified Creator</p>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 1: ACCOUNT */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Account
                </span>

                <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
                  {/* App Appearance */}
                  <button
                    onClick={() => setCurrentSection('appearance')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-amber-500">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">App Appearance</p>
                        <p className="text-[11px] text-slate-500">Theme & Accent Controls</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Account & Security */}
                  <button
                    onClick={() => setCurrentSection('account_security')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Account &amp; Security</p>
                        <p className="text-[11px] text-slate-500">Username, password, 2FA &amp; recovery</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Edit Profile */}
                  <button
                    onClick={() => {
                      closeSettings();
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-blue-500">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Edit Profile</p>
                        <p className="text-[11px] text-slate-500">Bio, profile photo &amp; personal details</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 2: PRIVACY & SAFETY */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Privacy &amp; Safety
                </span>

                <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
                  {/* Privacy */}
                  <button
                    onClick={() => setCurrentSection('privacy_controls')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-indigo-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Privacy</p>
                        <p className="text-[11px] text-slate-500">Who can view, tag &amp; contact you</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Blocked Users */}
                  <button
                    onClick={() => setCurrentSection('blocked_list')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-rose-500">
                        <UserX className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Blocked Users</p>
                        <p className="text-[11px] text-slate-500">Manage blocked &amp; restricted accounts</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Safety Center */}
                  <button
                    onClick={() => setCurrentSection('safety_centre')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-emerald-500">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Safety Center</p>
                        <p className="text-[11px] text-slate-500">Emergency contacts, helplines &amp; advice</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 3: SUPPORT */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Support
                </span>

                <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
                  {/* Help & Support */}
                  <button
                    onClick={() => setCurrentSection('help_centre')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Help &amp; Support</p>
                        <p className="text-[11px] text-slate-500">Guides, FAQs &amp; contact support</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Report a Problem */}
                  <button
                    onClick={() => setCurrentSection('bugs_suggestions')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-amber-500">
                        <Bug className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Report a Problem</p>
                        <p className="text-[11px] text-slate-500">Submit bug reports &amp; suggestions</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Grievance / Complaints */}
                  <button
                    onClick={() => setCurrentSection('grievance')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-purple-600">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Grievance / Complaints</p>
                        <p className="text-[11px] text-slate-500">Formal complaints &amp; Redressal Officer</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 4: LEGAL */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Legal
                </span>

                <div className="neu-flat rounded-[22px] overflow-hidden divide-y divide-slate-100/80">
                  {/* Privacy Policy */}
                  <button
                    onClick={() => setCurrentSection('privacy_policy')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Privacy Policy</p>
                        <p className="text-[11px] text-slate-500">Data protection &amp; user rights</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Terms & Conditions */}
                  <button
                    onClick={() => setCurrentSection('terms_of_service')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-blue-500">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Terms &amp; Conditions</p>
                        <p className="text-[11px] text-slate-500">User agreement &amp; service terms</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Community Guidelines */}
                  <button
                    onClick={() => setCurrentSection('community_guidelines')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-emerald-500">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Community Guidelines</p>
                        <p className="text-[11px] text-slate-500">Safety, respect &amp; content rules</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Copyright & Intellectual Property */}
                  <button
                    onClick={() => setCurrentSection('copyright_ip')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-amber-500">
                        <Copyright className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Copyright &amp; Intellectual Property</p>
                        <p className="text-[11px] text-slate-500">DMCA takedown &amp; IP protection</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Child Safety & Age Policy */}
                  <button
                    onClick={() => setCurrentSection('child_safety')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-rose-500">
                        <Baby className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Child Safety &amp; Age Policy</p>
                        <p className="text-[11px] text-slate-500">Protection of minors &amp; zero tolerance</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* About Funshann */}
                  <button
                    onClick={() => setCurrentSection('about')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-600">
                        <Info className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">About Funshann</p>
                        <p className="text-[11px] text-slate-500">v2.4.0 • Neumorphic Social Platform</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* CATEGORY 7: ACTIONS */}
              {/* ------------------------------------------------------------- */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Actions
                </span>

                <div className="space-y-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleResetDefaults}
                    className="w-full h-11 rounded-[20px] neu-raised px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-[#5B9DFF] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset Settings to Default</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full h-11 rounded-[20px] neu-raised px-4 flex items-center justify-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out from @{currentUser.username}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. SUB-PAGES (Dedicated modular clean views with Android back support) */}
          {/* ========================================================================= */}

          {/* ACCOUNT & SECURITY HUB */}
          {currentSection === 'account_security' && (
            <AccountSecurityHubSubPage
              currentUser={currentUser}
              onNavigateSection={setCurrentSection}
              onShowToast={onShowToast}
            />
          )}

          {/* ACCOUNT SETTINGS SUBPAGES */}
          {currentSection === 'username' && (
            <UsernameSubPage
              currentUser={currentUser}
              onUpdateUser={onUpdateUser}
              onShowToast={onShowToast}
            />
          )}



          {currentSection === 'email' && (
            <EmailSubPage
              currentUser={currentUser}
              onUpdateUser={onUpdateUser}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'password' && (
            <PasswordSubPage currentUser={currentUser} onShowToast={onShowToast} />
          )}

          {currentSection === 'two_factor' && (
            <TwoFactorSubPage
              currentUser={currentUser}
              onUpdateUser={onUpdateUser}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'saved_login' && (
            <SavedLoginSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'my_reports' && (
            <MyReportsSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'account_status' && (
            <AccountStatusSubPage currentUser={currentUser} onShowToast={onShowToast} />
          )}

          {currentSection === 'delete_account' && (
            <DeleteAccountSubPage
              currentUser={currentUser}
              onCancel={goBack}
              onConfirmDelete={handleDeleteAccountConfirm}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'account_recovery' && (
            <AccountRecoverySubPage currentUser={currentUser} onShowToast={onShowToast} />
          )}

          {/* APP SETTINGS & APPEARANCE */}
          {(currentSection === 'appearance' || currentSection === 'theme') && (
            <AppAppearanceSubPage
              theme={theme}
              onUpdateTheme={(t) => {
                if (onUpdateTheme) onUpdateTheme(t);
              }}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'permissions' && (
            <AppPermissionsSubPage
              permissionsState={localPermissions}
              onUpdatePermissions={(updated) => {
                setLocalPermissions(updated);
                saveStoredPermissions(updated);
                if (onUpdatePermissions) onUpdatePermissions(updated);
              }}
              onOpenSystemSettings={() => setShowAndroidSystemSettingsModal(true)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'contact_sync' && (
            <ContactSyncSubPage onShowToast={onShowToast} />
          )}

          {/* PREFERENCES */}
          {currentSection === 'notifications' && (
            <NotificationsSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'language' && (
            <LanguageSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'media' && (
            <div className="space-y-4 pb-4">
              <div className="neu-flat rounded-[24px] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">High-Res Uploads (4:5 HD)</h4>
                    <p className="text-[11px] text-slate-500">Preserve highest detail for your photo cards</p>
                  </div>
                  <button
                    onClick={() => onShowToast('High-Res Uploads enabled')}
                    className="w-12 h-6.5 rounded-full p-1 bg-[#5B9DFF] flex items-center justify-end cursor-pointer"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Neumorphic Haptics</h4>
                    <p className="text-[11px] text-slate-500">Gentle vibration on button taps & likes</p>
                  </div>
                  <button
                    onClick={() => onShowToast('Haptic feedback enabled')}
                    className="w-12 h-6.5 rounded-full p-1 bg-[#5B9DFF] flex items-center justify-end cursor-pointer"
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              {/* Cache Management Card */}
              <div className="neu-flat rounded-[24px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Temporary Media Cache</h4>
                    <p className="text-[11px] text-slate-500">Cached stories and feed media</p>
                  </div>
                  <span className="text-xs font-bold text-[#5B9DFF] neu-inset px-2.5 py-1 rounded-full">
                    {cacheSize}
                  </span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearCache}
                  className="w-full h-10 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-rose-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Media Cache</span>
                </motion.button>
              </div>
            </div>
          )}

          {/* PRIVACY & SECURITY SUBPAGES */}
          {currentSection === 'public_profile' && (
            <PublicProfileSubPage currentUser={currentUser} onShowToast={onShowToast} />
          )}

          {(currentSection === 'privacy_controls' || currentSection === 'privacy') && (
            <PrivacyControlsSubPage
              currentUser={currentUser}
              onNavigateSection={(sec) => setCurrentSection(sec)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'blocked_list' && (
            <BlockedListSubPage users={users} onShowToast={onShowToast} />
          )}

          {currentSection === 'who_can_contact' && (
            <WhoCanContactSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'clear_conversation' && (
            <ClearConversationsSubPage
              chatThreads={chatThreads}
              onDeleteThreads={(ids) => {
                if (onDeleteChatThreads) {
                  onDeleteChatThreads(ids);
                }
              }}
              onShowToast={onShowToast}
            />
          )}

          {/* HELP & SUPPORT SUBPAGES */}
          {currentSection === 'safety_centre' && (
            <SafetyCenterSubPage
              onShowToast={onShowToast}
              onOpenBlockedList={() => setCurrentSection('blocked_list')}
              onOpenPrivacyControls={() => setCurrentSection('privacy_controls')}
              onOpenCommunityGuidelines={() => setCurrentSection('community_guidelines')}
              onOpenChildSafetyPolicy={() => setCurrentSection('child_safety')}
            />
          )}

          {currentSection === 'help_centre' && (
            <HelpCentreSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'bugs_suggestions' && (
            <BugsAndSuggestionsSubPage onShowToast={onShowToast} />
          )}

          {currentSection === 'grievance' && (
            <GrievanceSubPage currentUser={currentUser} onShowToast={onShowToast} />
          )}

          {/* LEGAL & INFORMATION SUBPAGES */}
          {(currentSection === 'more_info' || currentSection === 'about') && (
            <LegalDocumentsSubPage
              documentType="about"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'privacy_policy' && (
            <LegalDocumentsSubPage
              documentType="privacy_policy"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'terms_of_service' && (
            <LegalDocumentsSubPage
              documentType="terms_of_service"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'community_guidelines' && (
            <LegalDocumentsSubPage
              documentType="community_guidelines"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'copyright_ip' && (
            <LegalDocumentsSubPage
              documentType="copyright_ip"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'child_safety' && (
            <LegalDocumentsSubPage
              documentType="child_safety"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {(currentSection === 'disclaimer' || currentSection === 'app_disclaimer') && (
            <LegalDocumentsSubPage
              documentType="disclaimer"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}

          {currentSection === 'other_legal' && (
            <LegalDocumentsSubPage
              documentType="other_legal"
              onNavigateDocument={(doc) => setCurrentSection(doc as SettingsSection)}
              onShowToast={onShowToast}
            />
          )}
        </div>

        {/* Android System Settings Simulation Modal */}
        <AndroidSystemSettingsModal
          isOpen={showAndroidSystemSettingsModal}
          onClose={() => setShowAndroidSystemSettingsModal(false)}
          permissionsState={localPermissions}
          onUpdatePermissions={(updated) => {
            setLocalPermissions(updated);
            saveStoredPermissions(updated);
            if (onUpdatePermissions) onUpdatePermissions(updated);
          }}
          onShowToast={onShowToast}
        />

        {/* Clear Search History Confirmation Dialog */}
        <AnimatePresence>
          {showClearHistoryConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="neu-flat rounded-[26px] p-5 w-full max-w-xs text-center space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-full neu-raised flex items-center justify-center text-slate-700">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Clear Search History?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will remove all recent user and hashtag searches saved on this device.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setShowClearHistoryConfirm(false)}
                    className="h-10 rounded-full neu-raised text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearSearchHistoryAction}
                    className="h-10 rounded-full bg-slate-800 text-xs font-bold text-white shadow-md cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout Confirmation Dialog */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="neu-flat rounded-[26px] p-5 w-full max-w-xs text-center space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-full neu-raised flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Log Out of Funshann?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You can always log back in as @{currentUser.username} anytime.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="h-10 rounded-full neu-raised text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      onClose();
                      if (onLogout) {
                        onLogout();
                      } else {
                        onShowToast('Logged out. Returning to home feed.');
                      }
                    }}
                    className="h-10 rounded-full neu-active-blue text-xs font-bold text-white shadow-md cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
