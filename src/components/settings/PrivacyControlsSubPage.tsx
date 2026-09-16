import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  AtSign,
  Tag,
  Share2,
  Activity,
  CheckCheck,
  Eye,
  Shield,
  Download,
  FileText,
  Sliders,
  MapPin,
  Trash2,
  Mail,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { User, SettingsSection, PrivacyControlsSettings } from '../../types';
import {
  getPrivacyControls,
  savePrivacyControls,
} from '../../services/privacySettingsService';
import {
  getPrivacyConsents,
  savePrivacyConsents,
  generateUserDataArchive,
  PrivacyConsents,
} from '../../services/dataRightsService';
import { LEGAL_CONFIG } from '../../data/legalConstants';

interface PrivacyControlsSubPageProps {
  currentUser?: User;
  onNavigateSection?: (section: SettingsSection) => void;
  onShowToast: (msg: string) => void;
}

export const PrivacyControlsSubPage: React.FC<PrivacyControlsSubPageProps> = ({
  currentUser,
  onNavigateSection,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'data_rights' | 'location_transparency'>('controls');

  // Controls state
  const [controls, setControls] = useState<PrivacyControlsSettings>(() => {
    return getPrivacyControls();
  });

  // Consents state
  const [consents, setConsents] = useState<PrivacyConsents>(() => {
    return getPrivacyConsents();
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportId, setExportId] = useState('');

  const handleToggleBoolean = (key: keyof PrivacyControlsSettings) => {
    const updated = { ...controls, [key]: !controls[key] };
    setControls(updated);
    savePrivacyControls(updated);
    onShowToast('Privacy preference updated');
  };

  const handleSelectEnum = (
    key: 'whoCanMention' | 'whoCanTag' | 'allowStoryReplies',
    value: 'everyone' | 'following' | 'nobody'
  ) => {
    const updated = { ...controls, [key]: value };
    setControls(updated);
    savePrivacyControls(updated);
    onShowToast('Privacy preference saved');
  };

  const handleToggleConsent = (key: keyof PrivacyConsents) => {
    const nextVal = !consents[key];
    const updated = savePrivacyConsents({ [key]: nextVal });
    setConsents(updated);
    onShowToast(`Consent ${nextVal ? 'granted' : 'withdrawn'} for ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  };

  const handleDownloadDataArchive = () => {
    if (!currentUser) {
      onShowToast('User profile not loaded');
      return;
    }
    setIsExporting(true);
    setTimeout(() => {
      const archive = generateUserDataArchive(currentUser);
      setIsExporting(false);
      setExportComplete(true);
      setExportId(archive.exportId);
      onShowToast('Personal Data Archive generated & downloaded! 📦');
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Navigation Pill Tabs */}
      <div className="flex items-center gap-1.5 p-1 neu-inset rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('controls')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'controls'
              ? 'neu-active-blue text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Privacy Controls
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('data_rights')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'data_rights'
              ? 'neu-active-blue text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Your Data Rights
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('location_transparency')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'location_transparency'
              ? 'neu-active-blue text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Location Transparency
        </button>
      </div>

      {/* TAB 1: PRIVACY CONTROLS */}
      {activeTab === 'controls' && (
        <div className="space-y-4">
          {/* 1. Account Privacy (Public vs Private) */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Private Account</h4>
                  <p className="text-[11px] font-medium text-slate-500">
                    Only approved followers can see your posts & stories
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleBoolean('isPrivateAccount')}
                className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                  controls.isPrivateAccount ? 'bg-[#5B9DFF]' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
                    controls.isPrivateAccount ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Activity Indicator */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-emerald-500">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-800">Activity Indicator</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                      Online Status
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Show when you are currently active on Funshann
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleBoolean('showActivityIndicator')}
                className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                  controls.showActivityIndicator ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
                    controls.showActivityIndicator ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 pl-1">
              When turned off, other users won't see your green online dot, and you won't see theirs.
            </p>
          </div>

          {/* 3. Read Receipts */}
          <div className="neu-flat rounded-[24px] p-4.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-blue-500">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Read Receipts (Blue Ticks)</h4>
                <p className="text-[11px] font-medium text-slate-500">
                  Let chat partners know when you have read their messages
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleBoolean('readReceiptsEnabled')}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                controls.readReceiptsEnabled ? 'bg-[#5B9DFF]' : 'bg-slate-300'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
                  controls.readReceiptsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 4. Mentions & Tags Controls */}
          <div className="neu-flat rounded-[24px] p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mentions & Tagging
            </span>

            {/* Who can mention */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <AtSign className="w-3.5 h-3.5 text-[#5B9DFF]" />
                <span>Who can @mention you in comments and stories</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 neu-inset rounded-2xl">
                {(['everyone', 'following', 'nobody'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectEnum('whoCanMention', opt)}
                    className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      controls.whoCanMention === opt
                        ? 'neu-active-blue text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt === 'following' ? 'Friends only' : opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Who can tag */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Tag className="w-3.5 h-3.5 text-[#5B9DFF]" />
                <span>Who can tag you in photos and media</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 neu-inset rounded-2xl">
                {(['everyone', 'following', 'nobody'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectEnum('whoCanTag', opt)}
                    className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      controls.whoCanTag === opt
                        ? 'neu-active-blue text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt === 'following' ? 'Friends only' : opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Story Resharing & Replies */}
          <div className="neu-flat rounded-[24px] p-4 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Story Privacy
            </span>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-slate-600 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Allow Story Resharing</h4>
                  <p className="text-[10px] text-slate-500">Allow other users to share your public stories to messages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleBoolean('allowStoryReshare')}
                className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                  controls.allowStoryReshare ? 'bg-[#5B9DFF]' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform ${
                    controls.allowStoryReshare ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA RIGHTS & STATUTORY PRIVACY */}
      {activeTab === 'data_rights' && (
        <div className="space-y-4">
          {/* Statutory Rights Overview */}
          <div className="neu-flat rounded-[24px] p-4.5 bg-blue-50/40 border border-blue-100/60 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 neu-raised flex items-center justify-center text-[#5B9DFF] flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Your Privacy & Data Rights</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Under applicable global privacy regulations (including GDPR, CCPA/CPRA, and DPDPA), you maintain direct control over your personal data.
              </p>
            </div>
          </div>

          {/* 1. Right to Access & Portability (Download Data) */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[#5B9DFF]" />
              <h4 className="text-xs font-bold text-slate-800">1. Right to Access & Portability</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Obtain a machine-readable JSON copy of your personal data, including your profile information, post records, comment logs, privacy consents, and security metadata.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadDataArchive}
                disabled={isExporting}
                className="w-full h-11 rounded-2xl neu-raised hover:text-[#5B9DFF] text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Packaging Data Archive...' : 'Download My Personal Data Archive'}</span>
              </button>
            </div>

            {exportComplete && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Export Delivered ({exportId})</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    Your data package has been saved to your device's downloads folder.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Right to Rectification (Correct Inaccurate Info) */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">2. Right to Rectification & Correction</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You can review, correct, or update inaccurate personal details (such as your display name, bio, mobile number, email, or birthday) at any time.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateSection && onNavigateSection('public_profile')}
                className="p-3 rounded-xl neu-raised text-left text-xs font-bold text-slate-700 hover:text-[#5B9DFF] cursor-pointer"
              >
                <p>Edit Public Profile</p>
                <p className="text-[10px] font-normal text-slate-400">Name, bio & avatar</p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateSection && onNavigateSection('account_security')}
                className="p-3 rounded-xl neu-raised text-left text-xs font-bold text-slate-700 hover:text-[#5B9DFF] cursor-pointer"
              >
                <p>Account Credentials</p>
                <p className="text-[10px] font-normal text-slate-400">Email, mobile, password</p>
              </button>
            </div>
          </div>

          {/* 3. Consent Withdrawal */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-800">3. Consent Management & Withdrawal</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Withdraw consent for optional data processing operations at any moment without affecting your core service access:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Algorithmic Profiling */}
              <div className="flex items-center justify-between p-3 neu-inset rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">Personalized Feed Recommendations</p>
                  <p className="text-[10px] text-slate-500">Use interaction history to tailor feed posts</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('personalizedRecommendations')}
                  className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                    consents.personalizedRecommendations ? 'bg-[#5B9DFF]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform ${
                      consents.personalizedRecommendations ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-3 neu-inset rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-800">Analytics & Diagnostics Telemetry</p>
                  <p className="text-[10px] text-slate-500">Anonymous performance & crash analytics</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleConsent('analyticsTelemetry')}
                  className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                    consents.analyticsTelemetry ? 'bg-[#5B9DFF]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform ${
                      consents.analyticsTelemetry ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Right to Erasure / Data Deletion */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3 border border-rose-100 bg-rose-50/20">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold text-slate-800">4. Right to Erasure ("To Be Forgotten")</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You may request permanent deletion of your account and all associated personal data. Account deletion is managed in Account & Security.
            </p>

            <button
              type="button"
              onClick={() => onNavigateSection && onNavigateSection('delete_account')}
              className="w-full h-11 rounded-2xl neu-raised text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Go to Account Deletion Screen</span>
            </button>
          </div>

          {/* 5. Contact Data Protection Officer */}
          <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#5B9DFF]" />
              <h4 className="text-xs font-bold text-slate-800">5. Data Protection Officer (DPO) Contact</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              For privacy inquiries, data subject access requests (DSAR), or privacy complaints:
            </p>
            <div className="p-3 neu-inset rounded-2xl bg-slate-50 text-xs text-slate-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">Privacy Compliance Desk</p>
                <p className="font-mono text-[#5B9DFF] text-[11px]">{LEGAL_CONFIG.PRIVACY_EMAIL}</p>
              </div>
              <a
                href={`mailto:${LEGAL_CONFIG.PRIVACY_EMAIL}`}
                className="px-3 py-1.5 rounded-full neu-raised text-xs font-bold text-[#5B9DFF] hover:underline"
              >
                Email DPO
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOCATION TRANSPARENCY & CONTROLS */}
      {activeTab === 'location_transparency' && (
        <div className="space-y-4">
          <div className="neu-flat rounded-[24px] p-4.5 bg-amber-50/40 border border-amber-100/60 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 neu-raised flex items-center justify-center text-amber-600 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Location Transparency & Control</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Funshann is committed to transparent, minimal, and user-controlled location processing.
              </p>
            </div>
          </div>

          <div className="neu-flat rounded-[24px] p-4.5 space-y-3.5 text-xs text-slate-600">
            {/* Why location is used */}
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">Why Location is Used</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Location access is used solely when you explicitly choose to attach a regional or city tag (e.g. "Tokyo, Japan" or "London, UK") to a post or story, or to discover trending regional creators.
              </p>
            </div>

            {/* Approximate vs Precise */}
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">Approximate vs. Precise Location</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Funshann uses city-level or regional approximations. We do <strong>NOT</strong> track or broadcast continuous, high-precision GPS coordinates.
              </p>
            </div>

            {/* Storage & Visibility */}
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">Storage & Public Visibility</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Location is stored on our servers only as a text tag attached to the specific post you published. Raw GPS coordinates are never stored in your user profile and are never exposed publicly to other users.
              </p>
            </div>

            {/* How to disable */}
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">How to Disable or Revoke</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You can revoke location permission at any time in App Permissions or within your device operating system settings.
              </p>
            </div>

            {/* Retention and deletion */}
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">Retention & Deletion</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When you delete a post or request account deletion, all associated location text tags are permanently purged immediately.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigateSection && onNavigateSection('permissions')}
                className="w-full h-10 rounded-2xl neu-raised text-xs font-bold text-slate-700 hover:text-[#5B9DFF] flex items-center justify-center gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Manage Location Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
