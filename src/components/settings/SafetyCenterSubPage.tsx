import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Flag,
  UserX,
  Lock,
  AlertTriangle,
  FileText,
  HeartHandshake,
  Baby,
  ChevronDown,
  ExternalLink,
  Shield,
  HelpCircle,
  Eye,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface SafetyCenterSubPageProps {
  onShowToast: (msg: string) => void;
  onOpenBlockedList?: () => void;
  onOpenPrivacyControls?: () => void;
  onOpenCommunityGuidelines?: () => void;
  onOpenChildSafetyPolicy?: () => void;
}

export const SafetyCenterSubPage: React.FC<SafetyCenterSubPageProps> = ({
  onShowToast,
  onOpenBlockedList,
  onOpenPrivacyControls,
  onOpenCommunityGuidelines,
  onOpenChildSafetyPolicy,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('stay_safe');

  const safetyModules = [
    {
      id: 'stay_safe',
      title: '1. Stay Safe on Funshann',
      icon: ShieldCheck,
      color: 'text-[#5B9DFF]',
      badge: 'Core Advice',
      content: (
        <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <p>
            Your safety and well-being are foundational to everything we build at Funshann. Follow these core principles to keep your experience secure and uplifting:
          </p>
          <div className="p-3 neu-inset rounded-2xl bg-blue-50/40 border border-blue-100/60 space-y-1.5">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B9DFF]" />
              Protect Personal Identifiers
            </p>
            <p className="text-[11px] text-slate-500">
              Never share your home address, exact real-time physical coordinates, government IDs, banking information, or passwords in public posts, comments, or group chats.
            </p>
          </div>
          <div className="p-3 neu-inset rounded-2xl bg-blue-50/40 border border-blue-100/60 space-y-1.5">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B9DFF]" />
              Trust Your Instincts
            </p>
            <p className="text-[11px] text-slate-500">
              If an interaction, conversation, or offer feels uncomfortable or suspicious, disengage immediately. You have full control to block, mute, or report any account at any time.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'reporting',
      title: '2. Reporting Harmful Content',
      icon: Flag,
      color: 'text-rose-500',
      badge: 'Confidential',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            You can report any post, comment, profile, or direct message on Funshann. All reports are strictly confidential — the reported party is <strong>never informed</strong> of who submitted the report.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-xl neu-inset bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">Post Reporting</p>
              <p className="text-slate-500 text-[10.5px] mt-0.5">
                Tap 3-dots top right on any post &rarr; Report Post
              </p>
            </div>
            <div className="p-2.5 rounded-xl neu-inset bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">Comment Reporting</p>
              <p className="text-slate-500 text-[10.5px] mt-0.5">
                Tap the comment or options &rarr; Report Comment
              </p>
            </div>
            <div className="p-2.5 rounded-xl neu-inset bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">Profile Reporting</p>
              <p className="text-slate-500 text-[10.5px] mt-0.5">
                On user profile &rarr; 3-dots menu &rarr; Report User
              </p>
            </div>
            <div className="p-2.5 rounded-xl neu-inset bg-slate-50 border border-slate-100">
              <p className="font-bold text-slate-800">Message Reporting</p>
              <p className="text-slate-500 text-[10.5px] mt-0.5">
                Press & hold message &rarr; Report Message
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'blocking',
      title: '3. Blocking & Preventing Contact',
      icon: UserX,
      color: 'text-red-600',
      badge: 'Instant Barrier',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Blocking an account cuts off all communications and interactions between you and that user:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] pl-1">
            <li>They cannot view your profile, posts, or stories.</li>
            <li>They cannot send direct messages or voice notes to you.</li>
            <li>They cannot tag or mention your username in comments.</li>
            <li>They receive no notification that they have been blocked.</li>
          </ul>
          {onOpenBlockedList && (
            <button
              onClick={onOpenBlockedList}
              className="mt-2 text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <span>Manage your Blocked Accounts list</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'privacy',
      title: '4. Privacy & Visibility Controls',
      icon: Lock,
      color: 'text-indigo-600',
      badge: 'Account Tools',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Customizing your privacy settings puts you in complete control over who can interact with you:
          </p>
          <div className="p-2.5 neu-inset rounded-xl bg-indigo-50/40 border border-indigo-100/60 text-[11px] space-y-1">
            <p className="font-bold text-indigo-950">Available Controls:</p>
            <p className="text-slate-600">• Set account to Private (approve followers)</p>
            <p className="text-slate-600">• Restrict mentions & tags to people you follow</p>
            <p className="text-slate-600">• Hide activity status & read receipts</p>
            <p className="text-slate-600">• Filter direct message spam requests automatically</p>
          </div>
          {onOpenPrivacyControls && (
            <button
              onClick={onOpenPrivacyControls}
              className="mt-1 text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>Open Privacy Controls Hub</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'scams',
      title: '5. Scams & Financial Fraud Prevention',
      icon: AlertTriangle,
      color: 'text-amber-500',
      badge: 'Fraud Shield',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Protect yourself from financial deception, phishing campaigns, and fraudulent investment schemes:
          </p>
          <div className="p-3 neu-inset rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1.5">
            <p className="font-bold text-amber-900 text-xs">⚠️ Golden Rules of Fraud Prevention:</p>
            <p className="text-[11px] text-amber-800">
              • <strong>Funshann staff will NEVER</strong> message you asking for your password, SMS one-time passcode (OTP), or credit card details.
            </p>
            <p className="text-[11px] text-amber-800">
              • Beware of accounts promising guaranteed crypto returns, fake giveaways, or urgent money transfers.
            </p>
            <p className="text-[11px] text-amber-800">
              • Never click suspicious third-party links received in DMs from unverified accounts.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'harassment',
      title: '6. Anti-Harassment & Bullying Rules',
      icon: Shield,
      color: 'text-[#5B9DFF]',
      badge: 'Zero Tolerance',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Funshann has a strict zero-tolerance policy against cyberbullying, targeted degradation, hate speech, and intimidation.
          </p>
          <p className="text-slate-500 text-[11px]">
            If you encounter harassment, do not retaliate. Document the behavior, block the offender, and submit a report so our safety moderators can enact account warnings, temporary suspensions, or permanent bans.
          </p>
          {onOpenCommunityGuidelines && (
            <button
              onClick={onOpenCommunityGuidelines}
              className="text-[11px] font-bold text-[#5B9DFF] hover:underline flex items-center gap-1"
            >
              <span>Read Funshann Community Guidelines</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'account_security',
      title: '7. Account Security & Verification',
      icon: KeyRound,
      color: 'text-emerald-600',
      badge: 'Best Practices',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Safeguard your Funshann identity with industry-standard account hardening:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] pl-1">
            <li>Enable Two-Factor Authentication (2FA) via Authenticator app or SMS.</li>
            <li>Use a unique, high-entropy password distinct from other services.</li>
            <li>Maintain an active, verified recovery email and mobile number.</li>
            <li>Review active sessions regularly in Account & Security settings.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'child_safety',
      title: '8. Child Safety & Age Policy',
      icon: Baby,
      color: 'text-pink-600',
      badge: 'Priority 0',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Funshann is strictly designated for users aged 13 and older (or 16+ depending on applicable jurisdiction). We enforce the highest level of vigilance regarding minor safety:
          </p>
          <div className="p-3 neu-inset rounded-2xl bg-pink-50/60 border border-pink-200/60 space-y-1.5">
            <p className="font-bold text-pink-900 text-xs">🛡️ Minor Safety Protections:</p>
            <p className="text-[11px] text-pink-800">
              • Zero tolerance for child sexual abuse material (CSAM), exploitation, or grooming.
            </p>
            <p className="text-[11px] text-pink-800">
              • CSAM reports are escalated immediately to NCMEC and global law enforcement authorities.
            </p>
            <p className="text-[11px] text-pink-800">
              • Underage accounts (under 13) are permanently closed upon discovery.
            </p>
          </div>
          {onOpenChildSafetyPolicy && (
            <button
              onClick={onOpenChildSafetyPolicy}
              className="text-[11px] font-bold text-pink-600 hover:underline flex items-center gap-1"
            >
              <span>View full Child Safety & Age Policy document</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Header Banner */}
      <div className="neu-flat rounded-[24px] p-4.5 flex items-start gap-3 bg-gradient-to-r from-blue-50/60 via-white to-white border border-blue-100/70 shadow-xs">
        <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] flex-shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Funshann Safety Center</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Comprehensive guidance, policies, and practical tools to ensure a secure, respectful community.
          </p>
        </div>
      </div>

      {/* Accordion List with 8 Complete Safety Sections */}
      <div className="space-y-2.5">
        {safetyModules.map((m) => {
          const Icon = m.icon;
          const isExpanded = expandedSection === m.id;
          return (
            <div key={m.id} className="neu-flat rounded-[22px] overflow-hidden transition-all border border-slate-100/80">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : m.id)}
                className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4.5 h-4.5 ${m.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{m.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{m.badge}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    isExpanded ? 'rotate-180 text-[#5B9DFF]' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 pt-1 border-t border-slate-100/90"
                  >
                    {m.content}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Quick Access Tools */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 block">
          Quick Safety Actions
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              if (onOpenBlockedList) onOpenBlockedList();
              else onShowToast('Opening Blocked Accounts...');
            }}
            className="neu-flat rounded-2xl p-3.5 text-left hover:bg-rose-50/30 cursor-pointer transition-all border border-slate-100"
          >
            <UserX className="w-5 h-5 text-red-500 mb-1" />
            <p className="text-xs font-bold text-slate-800">Blocked Accounts</p>
            <p className="text-[10px] text-slate-400">View and manage blocked users</p>
          </button>

          <button
            onClick={() => {
              if (onOpenPrivacyControls) onOpenPrivacyControls();
              else onShowToast('Opening Privacy Controls...');
            }}
            className="neu-flat rounded-2xl p-3.5 text-left hover:bg-blue-50/30 cursor-pointer transition-all border border-slate-100"
          >
            <Lock className="w-5 h-5 text-[#5B9DFF] mb-1" />
            <p className="text-xs font-bold text-slate-800">Privacy Hub</p>
            <p className="text-[10px] text-slate-400">Adjust account visibility</p>
          </button>
        </div>
      </div>
    </div>
  );
};
