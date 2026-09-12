import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Link2,
  Mail,
  Send,
  MessageCircle,
  Facebook,
  Pin,
  Ghost,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User } from '../types';

interface ShareSheetModalProps {
  post: Post | null;
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onSendToContact?: (userName: string) => void;
}

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  post,
  users,
  isOpen,
  onClose,
  onSendToContact,
}) => {
  const [copied, setCopied] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  if (!isOpen || !post) return null;

  const postAuthor = post.user || {
    id: post.userId || 'author',
    name: 'Funshann Member',
    username: 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  };

  const postUrl = `https://funshann.app/p/${post.id}`;
  const shareText = `Check out this post by @${postAuthor.username} on Funshann: "${post.caption || ''}"`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToUser = (userId: string, userName: string) => {
    setSentMap((prev) => ({ ...prev, [userId]: true }));
    if (onSendToContact) onSendToContact(userName);
  };

  const handleExternalShare = (channel: string) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedMedia = encodeURIComponent(post.imageUrl);
    const encodedDesc = encodeURIComponent(post.caption || '');

    let targetUrl = '';

    switch (channel) {
      case 'whatsapp':
        targetUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'telegram':
        targetUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'snapchat':
        targetUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`;
        break;
      case 'email':
        targetUrl = `mailto:?subject=${encodeURIComponent(`Funshann post by ${postAuthor.name}`)}&body=${encodedText}%0A%0A${encodedUrl}`;
        break;
      case 'pinterest':
        targetUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedMedia}&description=${encodedDesc}`;
        break;
      case 'native':
        if (navigator.share) {
          navigator
            .share({
              title: `Funshann - ${postAuthor.name}`,
              text: post.caption || '',
              url: postUrl,
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
      badgeBg: 'bg-emerald-50 text-emerald-600',
      icon: MessageCircle,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      color: 'bg-[#1877F2] text-white',
      badgeBg: 'bg-blue-50 text-blue-600',
      icon: Facebook,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: 'bg-[#229ED9] text-white',
      badgeBg: 'bg-sky-50 text-sky-600',
      icon: Send,
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      color: 'bg-[#FFFC00] text-slate-900',
      badgeBg: 'bg-amber-50 text-amber-600',
      icon: Ghost,
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      color: 'bg-[#E60023] text-white',
      badgeBg: 'bg-rose-50 text-rose-600',
      icon: Pin,
    },
    {
      id: 'email',
      name: 'Email',
      color: 'bg-slate-800 text-white',
      badgeBg: 'bg-slate-100 text-slate-700',
      icon: Mail,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
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
                <h3 className="text-base font-bold text-slate-800 font-['Outfit']">Share Post</h3>
                <p className="text-xs text-slate-400">Share to external apps or friends on Funshann</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Social Apps Sharing Grid */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5 px-1">
              Share to Apps
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
                    className="neu-raised rounded-[20px] p-2.5 flex flex-col items-center justify-center text-center gap-1.5 hover:shadow-md transition-all group"
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

          {/* Direct Message Contacts on Funshann */}
          <div className="pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
              Send in Funshann DM
            </span>
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              {users.map((user) => {
                const isSent = sentMap[user.id];
                const userAvatar =
                  user.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                const userName = user.name || 'User';
                return (
                  <div key={user.id} className="flex flex-col items-center flex-shrink-0">
                    <div className="relative w-12 h-12 rounded-full neu-raised p-0.5 mb-1">
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 max-w-[56px] truncate text-center">
                      {userName.split(' ')[0]}
                    </span>
                    <button
                      onClick={() => handleSendToUser(user.id, userName)}
                      disabled={isSent}
                      className={`mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shadow-xs cursor-pointer ${
                        isSent
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-slate-700 neu-raised hover:text-[#5B9DFF]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-colors ${
                        isSent ? 'bg-white text-emerald-600 border-white' : 'border-slate-300 text-transparent bg-slate-50'
                      }`}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{isSent ? 'Sent' : 'Send'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Tools Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={handleCopyLink}
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition"
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
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition"
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
                const link = document.createElement('a');
                link.href = post.imageUrl;
                link.download = `funshann_${post.id}.jpg`;
                link.target = '_blank';
                link.click();
              }}
              className="neu-raised rounded-[20px] p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:text-[#5B9DFF] transition"
            >
              <div className="w-9 h-9 rounded-full bg-[#5B9DFF]/10 text-[#5B9DFF] flex items-center justify-center">
                <Download className="w-4.5 h-4.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                Save HD Image
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
