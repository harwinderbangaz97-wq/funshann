import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UserMinus,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  ArrowLeft,
  Check,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  UserX,
  Flag,
  ShieldAlert,
  Palette,
  Image as ImageIcon,
  FolderLock,
  FolderHeart,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';
import {
  AutoDeleteDuration,
  MuteDuration,
  MediaVisibilitySetting,
  UserChatSettings,
  getIndividualChatSettings,
  saveIndividualChatSettings,
} from '../services/individualChatSettingsService';
import { UniversalReportModal } from './UniversalReportModal';
import { blockUserAccount, isUserBlocked } from '../services/safetyService';

interface IndividualUserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isFollowing?: boolean;
  onToggleFollow?: (userId: string) => void;
  onClearChat?: (userId: string) => void;
  isLocked?: boolean;
  onToggleLockChat?: (userId: string) => void;
  onShowToast?: (message: string) => void;
  onUserBlocked?: (userId: string) => void;
  onOpenWallpaper?: () => void;
}

type MenuScreen = 'main' | 'delete_chat' | 'notification' | 'media_visibility';

export const IndividualUserMenu: React.FC<IndividualUserMenuProps> = ({
  isOpen,
  onClose,
  user,
  isFollowing,
  onToggleFollow,
  onClearChat,
  isLocked,
  onToggleLockChat,
  onShowToast,
  onUserBlocked,
  onOpenWallpaper,
}) => {
  const [currentScreen, setCurrentScreen] = useState<MenuScreen>('main');
  const [chatSettings, setChatSettings] = useState<UserChatSettings>(() =>
    getIndividualChatSettings(user.id)
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isCurrentlyBlocked, setIsCurrentlyBlocked] = useState(false);

  // Sync settings when menu opens for user
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen('main');
      setShowClearConfirm(false);
      setShowBlockConfirm(false);
      setShowReportModal(false);
      setIsCurrentlyBlocked(isUserBlocked(user.id));
      setChatSettings(getIndividualChatSettings(user.id));
    }
  }, [isOpen, user.id]);

  if (!isOpen) return null;

  const handleBlockConfirm = () => {
    blockUserAccount({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
    });
    setIsCurrentlyBlocked(true);
    setShowBlockConfirm(false);
    if (onShowToast) {
      onShowToast(`Blocked @${user.username}. They cannot contact or view your profile.`);
    }
    if (onUserBlocked) {
      onUserBlocked(user.id);
    }
    onClose();
  };

  const handleUpdateMediaVisibility = (visibility: MediaVisibilitySetting) => {
    const updated = saveIndividualChatSettings(user.id, { mediaVisibility: visibility });
    setChatSettings(updated);
    if (onShowToast) {
      if (visibility === 'yes') {
        onShowToast(`Media from ${user.name} will be saved to your device gallery`);
      } else if (visibility === 'no') {
        onShowToast(`Media from ${user.name} hidden from device gallery (kept in chat)`);
      } else {
        onShowToast(`Media visibility reset to default for ${user.name}`);
      }
    }
  };

  const handleUpdateAutoDelete = (mode: AutoDeleteDuration) => {
    const updated = saveIndividualChatSettings(user.id, { autoDelete: mode });
    setChatSettings(updated);
    if (onShowToast) {
      if (mode === 'seen') {
        onShowToast(`Messages will delete after seen for ${user.name}`);
      } else if (mode === '48h') {
        onShowToast(`Messages will delete after 48 hours for ${user.name}`);
      } else if (mode === '1week') {
        onShowToast(`Messages will delete after 1 week for ${user.name}`);
      } else {
        onShowToast(`Automatic chat deletion disabled for ${user.name}`);
      }
    }
  };

  const handleUpdateMuteDuration = (duration: MuteDuration) => {
    const updated = saveIndividualChatSettings(user.id, { muteDuration: duration });
    setChatSettings(updated);
    if (onShowToast) {
      if (duration === 'off') {
        onShowToast(`Unmuted notifications from ${user.name}`);
      } else if (duration === '1h') {
        onShowToast(`Muted ${user.name} for 1 hour`);
      } else if (duration === '8h') {
        onShowToast(`Muted ${user.name} for 8 hours`);
      } else if (duration === '24h') {
        onShowToast(`Muted ${user.name} for 24 hours`);
      } else if (duration === 'permanent') {
        onShowToast(`Muted ${user.name} permanently`);
      }
    }
  };

  const handleToggleMute = () => {
    const newMuted = !chatSettings.isMuted;
    const duration: MuteDuration = newMuted ? 'permanent' : 'off';
    const updated = saveIndividualChatSettings(user.id, { isMuted: newMuted, muteDuration: duration });
    setChatSettings(updated);
    if (onShowToast) {
      onShowToast(newMuted ? `Muted notifications from ${user.name}` : `Unmuted notifications from ${user.name}`);
    }
  };

  const handleToggleSound = () => {
    const newSound = !chatSettings.soundEnabled;
    const updated = saveIndividualChatSettings(user.id, { soundEnabled: newSound });
    setChatSettings(updated);
    if (onShowToast) {
      onShowToast(newSound ? `Chat sounds enabled for ${user.name}` : `Chat sounds disabled for ${user.name}`);
    }
  };

  const handleClearConfirmAction = () => {
    if (onClearChat) {
      onClearChat(user.id);
    }
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="neu-flat rounded-t-[32px] sm:rounded-[28px] max-w-sm w-full p-4.5 bg-white/98 shadow-2xl border border-slate-200/80 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100/90 pb-3 mb-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentScreen !== 'main' ? (
                <button
                  type="button"
                  onClick={() => setCurrentScreen('main')}
                  className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-700 hover:text-[#5B9DFF] transition cursor-pointer select-none touch-manipulation active:scale-95"
                  title="Back"
                >
                  <ArrowLeft className="w-5 h-5 pointer-events-none" />
                </button>
              ) : (
                <div className="relative w-9.5 h-9.5 rounded-full neu-raised p-0.5 flex-shrink-0">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#5B9DFF] ring-1.5 ring-white" />
                  )}
                </div>
              )}

              <div className="min-w-0">
                <h3 className="text-[14.5px] font-bold text-slate-900 truncate">
                  {currentScreen === 'main'
                    ? user.name
                    : currentScreen === 'delete_chat'
                    ? 'Delete Chat'
                    : currentScreen === 'media_visibility'
                    ? 'Media Visibility'
                    : 'Notification'}
                </h3>
                <p className="text-[11.5px] text-slate-400 font-medium truncate">
                  {currentScreen === 'main'
                    ? `@${user.username}`
                    : `Settings for ${user.name}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer select-none touch-manipulation active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5 pointer-events-none" />
            </button>
          </div>

          {/* Screen Content */}
          <div className="py-1">
            {/* MAIN INDIVIDUAL MENU */}
            {currentScreen === 'main' && (
              <div className="space-y-1.5">
                {/* 1. Unfollow / Follow */}
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleFollow) onToggleFollow(user.id);
                  }}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-slate-600">
                      {isFollowing ? (
                        <UserMinus className="w-4.5 h-4.5 text-rose-500" />
                      ) : (
                        <UserPlus className="w-4.5 h-4.5 text-[#5B9DFF]" />
                      )}
                    </div>
                    <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                  </div>
                  {isFollowing && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Following
                    </span>
                  )}
                </button>

                {/* 2. Clear Chat */}
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-rose-50/70 hover:text-rose-600 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-rose-500">
                      <Trash2 className="w-4.5 h-4.5" />
                    </div>
                    <span>Clear Chat</span>
                  </div>
                </button>

                {/* 3. Lock Chat */}
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleLockChat) onToggleLockChat(user.id);
                  }}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center ${isLocked ? 'text-amber-500' : 'text-slate-600'}`}>
                      {isLocked ? <Unlock className="w-4.5 h-4.5 text-amber-500" /> : <Lock className="w-4.5 h-4.5" />}
                    </div>
                    <span>{isLocked ? 'Unlock Chat' : 'Lock Chat'}</span>
                  </div>
                  {isLocked && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </button>

                {/* 3.5 Chat Wallpaper */}
                {onOpenWallpaper && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWallpaper();
                    }}
                    className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                        <Palette className="w-4.5 h-4.5" />
                      </div>
                      <span>Chat Wallpaper</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="text-[11.5px] font-semibold text-[#5B9DFF] bg-blue-50 px-2.5 py-0.5 rounded-full">
                        Customize
                      </span>
                      <ChevronRight className="w-4.5 h-4.5 text-slate-400" />
                    </div>
                  </button>
                )}

                {/* 3.6 Media Visibility */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen('media_visibility')}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
                      <ImageIcon className="w-4.5 h-4.5" />
                    </div>
                    <span>Media Visibility</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[12px] font-medium text-slate-500">
                      {chatSettings.mediaVisibility === 'yes'
                        ? 'Yes'
                        : chatSettings.mediaVisibility === 'no'
                        ? 'No'
                        : 'Default (Yes)'}
                    </span>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                </button>

                {/* 4. Delete Chat > */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen('delete_chat')}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-slate-600">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <span>Delete Chat</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[12px] font-medium text-slate-500 capitalize">
                      {chatSettings.autoDelete === 'seen'
                        ? 'After Seen'
                        : chatSettings.autoDelete === '48h'
                        ? '48 Hours'
                        : chatSettings.autoDelete === '1week'
                        ? '1 Week'
                        : 'None'}
                    </span>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                </button>

                {/* 5. Notification > */}
                <button
                  type="button"
                  onClick={() => setCurrentScreen('notification')}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-slate-800 hover:bg-blue-50/70 hover:text-[#5B9DFF] flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center ${chatSettings.isMuted ? 'text-rose-500' : 'text-slate-600'}`}>
                      {chatSettings.isMuted ? <BellOff className="w-4.5 h-4.5 text-rose-500" /> : <Bell className="w-4.5 h-4.5" />}
                    </div>
                    <span>Mute / Notifications</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="text-[12px] font-medium text-slate-500">
                      {chatSettings.isMuted
                        ? chatSettings.muteDuration === '1h'
                          ? 'Muted (1h)'
                          : chatSettings.muteDuration === '8h'
                          ? 'Muted (8h)'
                          : chatSettings.muteDuration === '24h'
                          ? 'Muted (24h)'
                          : 'Muted'
                        : chatSettings.soundEnabled
                        ? 'Sound On'
                        : 'Sound Off'}
                    </span>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400" />
                  </div>
                </button>

                {/* 6. Block User */}
                <button
                  type="button"
                  onClick={() => setShowBlockConfirm(true)}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-rose-600 hover:bg-rose-50/80 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-rose-500">
                      <UserX className="w-4.5 h-4.5" />
                    </div>
                    <span>{isCurrentlyBlocked ? 'Unblock User' : 'Block User'}</span>
                  </div>
                  {isCurrentlyBlocked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      Blocked
                    </span>
                  )}
                </button>

                {/* 7. Report Profile */}
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="w-full h-12 px-3.5 rounded-[18px] text-left text-[14px] font-bold text-amber-700 hover:bg-amber-50/80 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8.5 h-8.5 rounded-full neu-raised flex items-center justify-center text-amber-600">
                      <Flag className="w-4.5 h-4.5" />
                    </div>
                    <span>Report Profile</span>
                  </div>
                </button>
              </div>
            )}

            {/* DELETE CHAT SUBMENU */}
            {currentScreen === 'delete_chat' && (
              <div className="space-y-2">
                <div className="px-1 py-1 mb-1">
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Choose an automatic deletion schedule for messages with <span className="font-bold text-slate-700">{user.name}</span>.
                  </p>
                </div>

                {/* Option 1: After Seen */}
                <button
                  type="button"
                  onClick={() => handleUpdateAutoDelete('seen')}
                  className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                    chatSettings.autoDelete === 'seen'
                      ? 'neu-inset border border-[#5B9DFF]/50 bg-blue-50/40'
                      : 'neu-raised hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${chatSettings.autoDelete === 'seen' ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-600'}`}>
                      <Eye className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800">After Seen</h4>
                      <p className="text-[11.5px] text-slate-500">
                        Automatically deletes after the message is opened & read
                      </p>
                    </div>
                  </div>
                  {chatSettings.autoDelete === 'seen' && (
                    <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Option 2: After 48 Hours */}
                <button
                  type="button"
                  onClick={() => handleUpdateAutoDelete('48h')}
                  className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                    chatSettings.autoDelete === '48h'
                      ? 'neu-inset border border-[#5B9DFF]/50 bg-blue-50/40'
                      : 'neu-raised hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${chatSettings.autoDelete === '48h' ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-600'}`}>
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800">After 48 Hours</h4>
                      <p className="text-[11.5px] text-slate-500">
                        Automatically deletes messages after 48 hours
                      </p>
                    </div>
                  </div>
                  {chatSettings.autoDelete === '48h' && (
                    <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Option 3: After One Week */}
                <button
                  type="button"
                  onClick={() => handleUpdateAutoDelete('1week')}
                  className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                    chatSettings.autoDelete === '1week'
                      ? 'neu-inset border border-[#5B9DFF]/50 bg-blue-50/40'
                      : 'neu-raised hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${chatSettings.autoDelete === '1week' ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-600'}`}>
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800">After One Week</h4>
                      <p className="text-[11.5px] text-slate-500">
                        Automatically deletes messages after 7 days
                      </p>
                    </div>
                  </div>
                  {chatSettings.autoDelete === '1week' && (
                    <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Option 4: None */}
                <button
                  type="button"
                  onClick={() => handleUpdateAutoDelete('none')}
                  className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                    chatSettings.autoDelete === 'none'
                      ? 'neu-inset border border-[#5B9DFF]/50 bg-blue-50/40'
                      : 'neu-raised hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${chatSettings.autoDelete === 'none' ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-600'}`}>
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800">None</h4>
                      <p className="text-[11.5px] text-slate-500">
                        Keep all messages permanently in this conversation
                      </p>
                    </div>
                  </div>
                  {chatSettings.autoDelete === 'none' && (
                    <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* NOTIFICATION SUBMENU */}
            {currentScreen === 'notification' && (
              <div className="space-y-2.5">
                <div className="px-1 py-1 mb-1">
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Custom alerts & sound rules specifically for <span className="font-bold text-slate-700">{user.name}</span>.
                  </p>
                </div>

                {/* Mute Duration Options */}
                <div className="space-y-2">
                  <p className="text-[12px] font-bold text-slate-700 px-1">Mute Notifications</p>
                  {[
                    { id: 'off', label: 'Off (Unmuted)', desc: 'Receive all notifications and alerts' },
                    { id: '1h', label: '1 Hour', desc: 'Mute alerts for the next hour' },
                    { id: '8h', label: '8 Hours', desc: 'Mute alerts for 8 hours' },
                    { id: '24h', label: '24 Hours', desc: 'Mute alerts for 24 hours' },
                    { id: 'permanent', label: 'Permanently', desc: 'Mute until you turn back on' },
                  ].map((opt) => {
                    const isSelected = chatSettings.muteDuration === opt.id || (!chatSettings.isMuted && opt.id === 'off');
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleUpdateMuteDuration(opt.id as MuteDuration)}
                        className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'neu-inset border border-[#5B9DFF]/60 bg-blue-50/40'
                            : 'neu-raised hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-600'}`}>
                            {opt.id === 'off' ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-slate-800">{opt.label}</h4>
                            <p className="text-[11.5px] text-slate-500">{opt.desc}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sound Setting */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                    chatSettings.soundEnabled
                      ? 'neu-inset border border-[#5B9DFF]/50 bg-blue-50/30'
                      : 'neu-raised hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${chatSettings.soundEnabled ? 'bg-[#5B9DFF] text-white' : 'neu-inset text-slate-400'}`}>
                      {chatSettings.soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800">Sound</h4>
                      <p className="text-[11.5px] text-slate-500">
                        {chatSettings.soundEnabled ? 'Play ringtone/chime when message arrives' : 'Silent message delivery'}
                      </p>
                    </div>
                  </div>

                  <div className={`w-11 h-6.5 rounded-full p-0.5 transition-colors ${chatSettings.soundEnabled ? 'bg-[#5B9DFF]' : 'bg-slate-200'}`}>
                    <div className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${chatSettings.soundEnabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            )}

            {/* MEDIA VISIBILITY SUBMENU */}
            {currentScreen === 'media_visibility' && (
              <div className="space-y-3">
                <div className="px-1 py-1">
                  <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
                    Show newly downloaded media from this chat in your device's gallery?
                  </p>
                </div>

                {/* Media Visibility Options */}
                <div className="space-y-2">
                  {[
                    {
                      id: 'default',
                      label: 'Default (Yes)',
                      desc: 'Follow global app preference (Media will be saved to your device gallery)',
                      icon: FolderHeart,
                    },
                    {
                      id: 'yes',
                      label: 'Yes',
                      desc: 'Always save photos and videos received in this chat to your camera roll/gallery',
                      icon: ShieldCheck,
                    },
                    {
                      id: 'no',
                      label: 'No',
                      desc: 'Hide received media from gallery. Photos stay private inside this chat vault',
                      icon: FolderLock,
                    },
                  ].map((opt) => {
                    const isSelected = (chatSettings.mediaVisibility || 'default') === opt.id;
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleUpdateMediaVisibility(opt.id as MediaVisibilitySetting)}
                        className={`w-full p-3.5 rounded-[20px] text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'neu-inset border border-[#5B9DFF]/60 bg-blue-50/40'
                            : 'neu-raised hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#5B9DFF] text-white shadow-xs'
                                : 'neu-inset text-slate-600'
                            }`}
                          >
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <div className="pr-1">
                            <h4 className="text-[14px] font-bold text-slate-800">{opt.label}</h4>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Visual Privacy Note Banner */}
                <div className="p-3 rounded-[18px] bg-slate-50 border border-slate-200/70 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[#5B9DFF] shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Setting media visibility to <span className="font-semibold text-slate-700">"No"</span> prevents newly received photos and videos from being indexed into the system photos gallery or shared albums on your phone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Clear Chat Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setShowClearConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm neu-flat rounded-[28px] p-5 bg-white shadow-2xl space-y-4 border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 neu-raised flex-shrink-0">
                    <AlertTriangle className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-800">Clear Chat?</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Clear all messages with <span className="font-semibold text-slate-700">{user.name}</span>
                    </p>
                  </div>
                </div>

                <p className="text-[12px] text-slate-600 bg-slate-50 p-3 rounded-[16px] border border-slate-100">
                  This will remove all text, photos, and voice messages from this conversation on your device. Unrelated conversations and your account will not be affected.
                </p>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 h-11 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearConfirmAction}
                    className="flex-1 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-md transition cursor-pointer"
                  >
                    Clear Chat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block User Confirmation Modal */}
        <AnimatePresence>
          {showBlockConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setShowBlockConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="w-full max-w-sm neu-flat rounded-[28px] p-5 bg-white shadow-2xl space-y-4 border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 neu-raised flex-shrink-0">
                    <UserX className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-800">
                      {isCurrentlyBlocked ? 'Unblock Account?' : 'Block Account?'}
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      @{user.username} ({user.name})
                    </p>
                  </div>
                </div>

                <p className="text-[12px] text-slate-600 bg-rose-50/50 p-3.5 rounded-[18px] border border-rose-100 leading-relaxed">
                  {isCurrentlyBlocked
                    ? 'Unblocking will allow this user to view your public profile and send messages according to your privacy settings.'
                    : 'They will not be able to find your profile, view your posts, or send you messages on Funshann. They will not be notified that you blocked them.'}
                </p>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowBlockConfirm(false)}
                    className="flex-1 h-11 rounded-full neu-raised text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBlockConfirm}
                    className="flex-1 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md transition cursor-pointer"
                  >
                    {isCurrentlyBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Universal Report Modal for Profile */}
        <UniversalReportModal
          isOpen={showReportModal}
          contentType="profile"
          contentId={user.id}
          targetUser={user}
          reporterUserId="current_user"
          snippet={`Profile @${user.username} (${user.name})`}
          onClose={() => setShowReportModal(false)}
          onShowToast={onShowToast}
        />
      </div>
    </AnimatePresence>
  );
};
