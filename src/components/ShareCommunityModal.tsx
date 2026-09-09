import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Link2,
  Mail,
  Send,
  MessageCircle,
  Facebook,
  Ghost,
  Share2,
  Instagram,
  MessageSquare,
  Users,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface ShareCommunityModalProps {
  community: {
    id: string;
    name: string;
    members?: string | number;
    memberCount?: number;
    description?: string;
    gradient?: string;
    avatarUrl?: string;
    avatarEmoji?: string;
    isPrivate?: boolean;
    [key: string]: any;
  } | null;
  users?: User[];
  isOpen: boolean;
  onClose: () => void;
  onSendToContact?: (userName: string, communityName: string) => void;
  onShowToast?: (msg: string, type?: string) => void;
}

export const ShareCommunityModal: React.FC<ShareCommunityModalProps> = ({
  community,
  users = [],
  isOpen,
  onClose,
  onSendToContact,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen || !community) return null;

  const communitySlug = community.name
    ? community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : community.id;
  const communityUrl = `${window.location.origin}${window.location.pathname}#group-${community.id || communitySlug}`;
  const shareText = `Join "${community.name}" group on Funshann! Connect with members and chat in real-time.`;

  const memberCountDisplay = community.members || community.memberCount || '100+';

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(communityUrl);
      }
    } catch {
      // fallback
    }
    setCopied(true);
    if (onShowToast) {
      onShowToast(`Group invite link copied! 📋`, 'success');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToUser = (userId: string, userName: string) => {
    setSentMap((prev) => ({ ...prev, [userId]: true }));
    if (onSendToContact) {
      onSendToContact(userName, community.name);
    } else if (onShowToast) {
      onShowToast(`Sent group invite to ${userName}! 🚀`, 'success');
    }
  };

  const handleExternalShare = (channel: string) => {
    const encodedUrl = encodeURIComponent(communityUrl);
    const encodedText = encodeURIComponent(shareText);

    let targetUrl = '';

    switch (channel) {
      case 'whatsapp':
        targetUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'instagram':
        handleCopyLink();
        if (onShowToast) {
          onShowToast('Link copied! Paste into Instagram Story or Direct Message 📸', 'info');
        }
        targetUrl = 'https://instagram.com';
        break;
      case 'snapchat':
        targetUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`;
        break;
      case 'messages':
        targetUrl = `sms:?&body=${encodedText}%20${encodedUrl}`;
        break;
      case 'telegram':
        targetUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'email':
        targetUrl = `mailto:?subject=${encodeURIComponent(`Join ${community.name} on Funshann`)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator
            .share({
              title: `Join ${community.name} on Funshann`,
              text: shareText,
              url: communityUrl,
            })
            .catch(() => {});
          return;
        }
        handleCopyLink();
        return;
      default:
        break;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const shareChannels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      color: 'bg-[#25D366] text-white',
      icon: MessageCircle,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      color: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white',
      icon: Instagram,
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      color: 'bg-[#FFFC00] text-slate-900',
      icon: Ghost,
    },
    {
      id: 'messages',
      name: 'Messages',
      color: 'bg-[#34C759] text-white',
      icon: MessageSquare,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: 'bg-[#229ED9] text-white',
      icon: Send,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      color: 'bg-[#1877F2] text-white',
      icon: Facebook,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full max-w-lg neu-flat rounded-t-[32px] sm:rounded-[32px] p-5 bg-white space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full neu-inset flex items-center justify-center text-[#5B9DFF]">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-['Outfit']">Share Group</h3>
                <p className="text-xs text-slate-400">Invite friends to #{community.name}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Community Preview Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700/50 flex items-center gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${community.gradient || 'from-blue-500 to-indigo-600'} text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-md overflow-hidden relative`}>
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <span>{community.avatarEmoji || '⚡'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold truncate text-white">{community.name}</h4>
                {community.isPrivate && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/80 text-amber-300 font-semibold">Private</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {community.description || 'Join our vibrant community chat and discussions!'}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1"><Users className="w-3 h-3 text-[#5B9DFF]" /> {memberCountDisplay} members</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> Official Invite</span>
              </div>
            </div>
          </div>

          {/* External Social Apps Grid */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5 px-1">
              Share Invite to Apps
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {shareChannels.map((ch) => {
                const IconComponent = ch.icon;
                return (
                  <motion.button
                    key={ch.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleExternalShare(ch.id)}
                    className="neu-raised rounded-[20px] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${ch.color}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 tracking-tight">
                      {ch.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Send to Funshann Contacts in DM */}
          {users.length > 0 && (
            <div className="pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                Send Invite in Funshann DM
              </span>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                {users.map((user) => {
                  const isSent = sentMap[user.id];
                  return (
                    <div key={user.id} className="flex flex-col items-center flex-shrink-0">
                      <div className="relative w-12 h-12 rounded-full neu-raised p-0.5 mb-1">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 max-w-[56px] truncate text-center">
                        {user.name.split(' ')[0]}
                      </span>
                      <button
                        onClick={() => handleSendToUser(user.id, user.name)}
                        disabled={isSent}
                        className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                          isSent
                            ? 'bg-emerald-100 text-emerald-700 font-semibold'
                            : 'bg-[#5B9DFF]/15 text-[#5B9DFF] hover:bg-[#5B9DFF] hover:text-white'
                        }`}
                      >
                        {isSent ? 'Sent' : 'Send'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Tools Row */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={handleCopyLink}
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#5B9DFF]/10 text-[#5B9DFF] flex items-center justify-center">
                {copied ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5" />}
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>

            <button
              onClick={() => handleExternalShare('native')}
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#5B9DFF]/10 text-[#5B9DFF] flex items-center justify-center">
                <Link2 className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                System Share
              </span>
            </button>

            <button
              onClick={() => {
                setShowQrCode(!showQrCode);
              }}
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#5B9DFF]/10 text-[#5B9DFF] flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                {showQrCode ? 'Hide QR' : 'QR Code'}
              </span>
            </button>
          </div>

          {/* QR Code Drawer */}
          {showQrCode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-2"
            >
              <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    communityUrl
                  )}`}
                  alt="Community QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs font-bold text-slate-800">Scan to Join #{community.name}</span>
              <p className="text-[10px] text-slate-400 max-w-xs">
                Scan with any mobile camera to join this community channel instantly.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
