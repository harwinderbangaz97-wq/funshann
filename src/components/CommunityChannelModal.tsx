import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShareCommunityModal } from './ShareCommunityModal';
import {
  ArrowLeft,
  MoreVertical,
  Bell,
  BellOff,
  Image as ImageIcon,
  Camera,
  Mic,
  Send,
  Smile,
  Play,
  Pause,
  CheckCheck,
  Heart,
  ThumbsUp,
  Flame,
  Laugh,
  Share2,
  LogOut,
  Settings,
  Lock,
  Globe,
  Crown,
  Shield,
  Users,
  MessageSquare,
  Info,
  CheckCircle2,
  VolumeX,
  Volume2,
  Search,
  Sparkles,
  Paperclip,
  Trash2,
  UserMinus,
  Ban,
  FileText,
  Film,
  X,
  Square,
  UserPlus,
  Plus,
  UserCheck,
  Zap,
  Forward,
} from 'lucide-react';
import { User, VoiceNoteData } from '../types';
import { syncCommunityToFirestore } from '../services/firebase';
import { format12HourTime } from '../services/timeUtils';
import { VoiceWaveformIcon, GalleryCardsIcon } from './ChatView';

export interface CommunityMessage {
  id: string;
  senderName: string;
  senderRole?: 'Owner' | 'Admin' | 'Moderator' | 'Member';
  senderAvatar?: string;
  text?: string;
  timestamp: string;
  isMe?: boolean;
  audioDuration?: string;
  imageUrl?: string;
  videoUrl?: string;
  fileAttachment?: {
    name: string;
    size: string;
    type: string;
    url: string;
  };
  reactions?: { emoji: string; count: number; reacted?: boolean }[];
}

export interface RosterMember {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Moderator' | 'Member';
  badge: string;
  isMuted?: boolean;
  isBlocked?: boolean;
}

interface CommunityChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: {
    id: string;
    name: string;
    description: string;
    category: string;
    isPrivate: boolean;
    ownerId?: string;
    gradient: string;
    avatarUrl?: string;
    avatarEmoji?: string;
    members: string;
    lastMessage?: string;
  };
  isJoined: boolean;
  isMuted?: boolean;
  onJoinToggle: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  onForwardMessage?: (receiverId: string, text?: string, imageUrl?: string, voiceNote?: VoiceNoteData) => void;
  users: User[];
}

export const CommunityChannelModal: React.FC<CommunityChannelModalProps> = ({
  isOpen,
  onClose,
  community,
  isJoined,
  isMuted = false,
  onJoinToggle,
  onShowToast,
  onForwardMessage,
  users,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'info' | 'members'>('chat');
  const [inputText, setInputText] = useState('');
  const [isNotifMuted, setIsNotifMuted] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<CommunityMessage | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  
  // Media & File Attachments State
  const [attachedMedia, setAttachedMedia] = useState<{
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
    size?: string;
  } | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Hidden File Inputs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([30, 60, 45, 80, 50, 90, 40, 70, 55, 85, 65, 40]);
  const recordingTimerRef = useRef<any>(null);

  // Community Roster State
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([
    { id: 'mem1', name: 'Community Owner', role: 'Owner', badge: '👑 Owner' },
    { id: 'mem2', name: 'Alex Rivera', role: 'Admin', badge: '🛡️ Admin' },
    { id: 'mem3', name: 'Jordan Smith', role: 'Moderator', badge: '⚡ Mod' },
    { id: 'mem4', name: 'Sam Wilson', role: 'Member', badge: 'Member' },
    { id: 'mem5', name: 'Taylor Swift', role: 'Member', badge: 'Member' },
  ]);

  // Add Member State
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommunityEmojiPicker, setShowCommunityEmojiPicker] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Member' | 'Admin' | 'Moderator'>('Member');
  const [contactsSearchQuery, setContactsSearchQuery] = useState('');



  const handleAddMember = (nameToAdd: string, roleToAdd: 'Member' | 'Admin' | 'Moderator' = 'Member') => {
    const cleanName = nameToAdd.trim();
    if (!cleanName) return;

    const existing = rosterMembers.find((m) => m.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (onShowToast) onShowToast(`${cleanName} is already a member of this community.`, 'info');
      return;
    }

    const badgeStr = roleToAdd === 'Admin' ? '🛡️ Admin' : roleToAdd === 'Moderator' ? '⚡ Mod' : 'Member';
    const newMemberObj: RosterMember = {
      id: `mem_${Date.now()}`,
      name: cleanName,
      role: roleToAdd,
      badge: badgeStr,
    };

    setRosterMembers((prev) => [...prev, newMemberObj]);
    setNewMemberName('');
    setShowAddMemberModal(false);

    // Announce member join in chat feed
    const systemMsg: CommunityMessage = {
      id: Date.now().toString(),
      senderName: 'System Announcement',
      text: `🎉 ${cleanName} was added to ${community.name} as ${roleToAdd}! Welcome to the community!`,
      timestamp: format12HourTime(Date.now()),
      reactions: [{ emoji: '👋', count: 3, reacted: false }],
    };
    setMessages((prev) => [...prev, systemMsg]);

    if (onShowToast) {
      onShowToast(`Added ${cleanName} to ${community.name}! 🎉`, 'success');
    }
  };

  // Messages State
  const [messages, setMessages] = useState<CommunityMessage[]>([
    {
      id: 'm1',
      senderName: 'Community Owner',
      senderRole: 'Owner',
      text: `Welcome everyone to ${community.name}! 🎉 Feel free to share ideas and ask questions here in our general channel.`,
      timestamp: '10:00 AM',
      isMe: false,
      reactions: [
        { emoji: '❤️', count: 8, reacted: true },
        { emoji: '🔥', count: 5, reacted: false },
        { emoji: '🙌', count: 3, reacted: false },
      ],
    },
    {
      id: 'm2',
      senderName: 'Alex Rivera',
      senderRole: 'Admin',
      text: 'Glad to be here! Check out the latest design mockups we uploaded.',
      timestamp: '10:15 AM',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      reactions: [{ emoji: '👍', count: 4, reacted: false }],
    },
    {
      id: 'm3',
      senderName: 'Jordan Smith',
      senderRole: 'Moderator',
      timestamp: '11:05 AM',
      audioDuration: '0:18',
      reactions: [{ emoji: '🎧', count: 2, reacted: false }],
    },
    {
      id: 'm4',
      senderName: 'You',
      senderRole: 'Member',
      text: community.lastMessage || 'Hey team! Anyone working on new updates this afternoon?',
      timestamp: '11:30 AM',
      isMe: true,
      reactions: [{ emoji: '❤️', count: 1, reacted: true }],
    },
  ]);

  // Voice recording timer effect & live waveform
  useEffect(() => {
    let waveformInterval: any;
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      waveformInterval = setInterval(() => {
        setLiveWaveform(
          Array.from({ length: 14 }, () => Math.floor(Math.random() * 75) + 25)
        );
      }, 120);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (waveformInterval) clearInterval(waveformInterval);
    };
  }, [isRecordingVoice]);

  if (!isOpen) return null;

  // Notification Toggle
  const handleToggleNotif = () => {
    setIsNotifMuted(!isNotifMuted);
    if (onShowToast) {
      onShowToast(
        !isNotifMuted
          ? `Muted notifications for ${community.name} 🔕`
          : `Enabled notifications for ${community.name} 🔔`,
        'info'
      );
    }
  };

  // Media Pickers Event Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');

    setAttachedMedia({
      type: isVideo ? 'video' : 'image',
      url: fileUrl,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    });

    if (onShowToast) {
      onShowToast(`${isVideo ? 'Video' : 'Photo'} attached! Tap send to post. 📷`, 'info');
    }
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setAttachedMedia({
      type: 'file',
      url: fileUrl,
      name: file.name,
      size: `${(file.size / 1024).toFixed(0)} KB`,
    });

    if (onShowToast) {
      onShowToast(`File "${file.name}" attached! 📄`, 'info');
    }
  };

  // Voice Note Recording Handlers
  const handleStartVoiceRecord = () => {
    if (isMuted) {
      if (onShowToast) onShowToast('You are muted and cannot record voice notes.', 'warning');
      return;
    }
    setIsRecordingVoice(true);
  };

  const handleCancelVoiceRecord = () => {
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoiceRecord = () => {
    setIsRecordingVoice(false);
    const durationStr = `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds || 5}`;

    const voiceMsg: CommunityMessage = {
      id: Date.now().toString(),
      senderName: 'You',
      senderRole: 'Member',
      audioDuration: durationStr,
      timestamp: format12HourTime(Date.now()),
      isMe: true,
      reactions: [],
    };

    setMessages((prev) => [...prev, voiceMsg]);
    setRecordingSeconds(0);
    if (onShowToast) onShowToast('Voice note recorded & sent 🎙️', 'success');
  };

  // Play audio sound synthesizer using Web Audio API
  const handlePlayAudioSynthesizer = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
      return;
    }

    setPlayingAudioId(msgId);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);

        setTimeout(() => {
          setPlayingAudioId(null);
        }, 1500);
      }
    } catch (err) {
      setTimeout(() => setPlayingAudioId(null), 1500);
    }
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedMedia) return;

    if (isMuted) {
      if (onShowToast) onShowToast('You are muted and cannot post.', 'warning');
      return;
    }

    if (!isJoined) {
      if (onShowToast) onShowToast('Please join this community first to send messages.', 'info');
      return;
    }

    const newMsg: CommunityMessage = {
      id: Date.now().toString(),
      senderName: 'You',
      senderRole: 'Member',
      text: inputText.trim() || undefined,
      imageUrl: attachedMedia?.type === 'image' ? attachedMedia.url : undefined,
      videoUrl: attachedMedia?.type === 'video' ? attachedMedia.url : undefined,
      fileAttachment:
        attachedMedia?.type === 'file'
          ? {
              name: attachedMedia.name || 'document.pdf',
              size: attachedMedia.size || '120 KB',
              type: 'document',
              url: attachedMedia.url,
            }
          : undefined,
      timestamp: format12HourTime(Date.now()),
      isMe: true,
      reactions: [],
    };

    setMessages((prev) => {
      const updated = [...prev, newMsg];
      syncCommunityToFirestore({
        ...community,
        messages: updated,
      }).catch(console.warn);
      return updated;
    });
    setInputText('');
    setAttachedMedia(null);
  };

  // Admin Controls: Delete Any Message
  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    if (onShowToast) onShowToast('Message deleted 🗑️', 'info');
  };

  // Admin Controls: Member Roster Moderation (Mute / Unmute / Remove / Block)
  const handleToggleMuteMember = (memberId: string) => {
    setRosterMembers((prev) =>
      prev.map((mem) => {
        if (mem.id === memberId) {
          const nextState = !mem.isMuted;
          if (onShowToast) {
            onShowToast(
              nextState ? `${mem.name} has been muted 🔇` : `${mem.name} has been unmuted 🔊`,
              nextState ? 'warning' : 'success'
            );
          }
          return { ...mem, isMuted: nextState };
        }
        return mem;
      })
    );
  };

  const handleRemoveMember = (memberId: string) => {
    const target = rosterMembers.find((m) => m.id === memberId);
    setRosterMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (onShowToast && target) {
      onShowToast(`${target.name} removed from community.`, 'info');
    }
  };

  const handleBlockMember = (memberId: string) => {
    const target = rosterMembers.find((m) => m.id === memberId);
    setRosterMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (onShowToast && target) {
      onShowToast(`${target.name} blocked from community 🚫`, 'warning');
    }
  };

  // Emoji Reaction Toggle
  const handleToggleReaction = (msgId: string, targetEmoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        const currentReactions = msg.reactions || [];
        const existing = currentReactions.find((r) => r.emoji === targetEmoji);

        let updatedReactions;
        if (existing) {
          if (existing.reacted) {
            updatedReactions = currentReactions
              .map((r) => (r.emoji === targetEmoji ? { ...r, count: r.count - 1, reacted: false } : r))
              .filter((r) => r.count > 0);
          } else {
            updatedReactions = currentReactions.map((r) =>
              r.emoji === targetEmoji ? { ...r, count: r.count + 1, reacted: true } : r
            );
          }
        } else {
          updatedReactions = [...currentReactions, { emoji: targetEmoji, count: 1, reacted: true }];
        }
        return { ...msg, reactions: updatedReactions };
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col w-full h-full overflow-hidden font-sans"
    >
      {/* Hidden native input pickers for camera roll & file attachments */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoSelect}
        accept="image/*,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handlePhotoSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDocumentSelect}
        accept=".pdf,.doc,.docx,.txt,.zip"
        className="hidden"
      />

      {/* 1. Header Bar: Clean White Top App Bar */}
      <header className="bg-white border-b border-slate-200/80 px-3 sm:px-4 py-2.5 flex items-center justify-between flex-shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer flex-shrink-0"
            title="Back to Communities"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Community Avatar / Profile */}
          <div
            onClick={() => setActiveTab('info')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0 group"
          >
            <div className="relative flex-shrink-0">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${community.gradient} text-white flex items-center justify-center font-bold shadow-xs overflow-hidden`}>
                {community.avatarUrl ? (
                  <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{community.avatarEmoji || '⚡'}</span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" title="Active now" />
            </div>

            {/* Title & Online Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="text-sm font-extrabold text-slate-900 truncate group-hover:text-[#5B9DFF] transition-colors">
                  {community.name}
                </h2>
                {community.isPrivate ? (
                  <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                ) : (
                  <Globe className="w-3 h-3 text-blue-600 flex-shrink-0" />
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-400 block truncate">
                {rosterMembers.length} members • 18 online
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1 flex-shrink-0 relative">
          {/* Share Group Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="w-9 h-9 rounded-full bg-blue-50/80 hover:bg-blue-100 flex items-center justify-center text-[#5B9DFF] transition cursor-pointer"
            title="Share Group"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={handleToggleNotif}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
              isNotifMuted
                ? 'text-slate-400 hover:bg-slate-100'
                : 'text-amber-500 bg-amber-50 hover:bg-amber-100'
            }`}
            title={isNotifMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          >
            {isNotifMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Vertical Three-Dots Menu Toggle */}
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
            title="Group Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Options Dropdown Menu */}
          <AnimatePresence>
            {showOptionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowOptionsMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className="absolute right-0 top-11 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 space-y-1 text-xs font-semibold text-slate-700"
                >
                  <button
                    onClick={() => {
                      setActiveTab('info');
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-indigo-500" />
                    <span>Group Info & Rules</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('members');
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>View Members Roster</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowAddMemberModal(true);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer text-[#5B9DFF] font-bold"
                  >
                    <UserPlus className="w-4 h-4 text-[#5B9DFF]" />
                    <span>Add Member</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowShareModal(true);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer text-slate-800 font-bold"
                  >
                    <Share2 className="w-4 h-4 text-[#5B9DFF]" />
                    <span>Share Group 🔗</span>
                  </button>

                  <button
                    onClick={() => {
                      handleToggleNotif();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    {isNotifMuted ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                    <span>{isNotifMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      if (onShowToast) onShowToast('Group invite link copied to clipboard! 📋', 'success');
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-blue-500" />
                    <span>Copy Group Link</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      onJoinToggle();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{isJoined ? 'Leave Group' : 'Join Group'}</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 2. Segmented Channel Navigation Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl w-full max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#5B9DFF]" />
            <span># general-chat</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Guidelines</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Members ({rosterMembers.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Main Body View */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col justify-between">
        {/* TAB 1: FULL SCREEN DIRECT-MESSAGE CHAT CANVAS */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 h-full justify-between">
            {/* Scrollable Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
              {/* Top Welcome Banner */}
              <div className="max-w-md mx-auto p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-1.5 my-2">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${community.gradient} text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-sm`}>
                  {community.avatarEmoji || '⚡'}
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Welcome to #{community.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This is the official channel start for {community.name}. Stay respectful, follow guidelines, and enjoy chatting!
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Category: {community.category}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {rosterMembers.length} Members
                  </span>
                </div>
              </div>

              {/* Chat Messages List */}
              {messages.map((m) => {
                const isMe = m.isMe;

                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2.5 max-w-xl group ${
                      isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {/* Incoming Sender Avatar */}
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs mb-1">
                        {m.senderName.charAt(0)}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                      {/* Sender Name & Role Badges */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[11px] font-bold text-slate-700">{m.senderName}</span>
                          {m.senderRole === 'Owner' && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full border border-amber-300 flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-500" /> Owner
                            </span>
                          )}
                          {m.senderRole === 'Admin' && (
                            <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded-full border border-indigo-200">
                              Admin 🛡️
                            </span>
                          )}
                          {m.senderRole === 'Moderator' && (
                            <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 text-[9px] font-extrabold rounded-full border border-amber-200">
                              Mod ⚡
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-2xs relative group/bubble ${
                          isMe
                            ? 'bg-gradient-to-r from-[#5B9DFF] to-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200/80'
                        }`}
                      >
                        {/* Action Buttons on Bubble Hover */}
                        <div className={`absolute -top-2.5 ${isMe ? '-left-2' : '-right-2'} opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10`}>
                          <button
                            type="button"
                            onClick={() => {
                              setForwardTargetMessage(m);
                              setForwardSearchQuery('');
                            }}
                            className="p-1 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm cursor-pointer"
                            title="Forward Message"
                          >
                            <Forward className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Text Content */}
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}

                        {/* Image Attachment Preview */}
                        {m.imageUrl && (
                          <div
                            onClick={() => setPreviewImage(m.imageUrl || null)}
                            className="mt-2 rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition border border-black/10 max-w-xs"
                          >
                            <img src={m.imageUrl} alt="Attached media" className="w-full h-44 object-cover" />
                          </div>
                        )}

                        {/* Video Attachment Preview */}
                        {m.videoUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/10 max-w-xs bg-black">
                            <video src={m.videoUrl} controls className="w-full max-h-48 object-cover rounded-xl" />
                          </div>
                        )}

                        {/* Generic File Attachment */}
                        {m.fileAttachment && (
                          <div className={`mt-2 p-2.5 rounded-xl flex items-center gap-3 border ${
                            isMe ? 'bg-white/15 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isMe ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                            }`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-bold truncate">{m.fileAttachment.name}</p>
                              <span className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                {m.fileAttachment.size}
                              </span>
                            </div>
                            <a
                              href={m.fileAttachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg ${
                                isMe ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                              }`}
                            >
                              Open
                            </a>
                          </div>
                        )}

                        {/* Voice Note Audio Widget */}
                        {m.audioDuration && (
                          <div className={`flex items-center gap-3 p-2 rounded-xl ${isMe ? 'bg-white/15' : 'bg-slate-100'}`}>
                            <button
                              onClick={() => handlePlayAudioSynthesizer(m.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                                isMe ? 'bg-white text-[#5B9DFF]' : 'bg-[#5B9DFF] text-white'
                              }`}
                            >
                              {playingAudioId === m.id ? <Pause className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                            <div className="flex-1 space-y-1">
                              <div className="h-4 flex items-center gap-0.5">
                                {[40, 70, 30, 90, 60, 100, 40, 80, 50, 90, 30, 70, 40, 80, 60, 30].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-1 rounded-full ${
                                      isMe ? 'bg-white/80' : 'bg-blue-400'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className={`text-[10px] font-bold ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                Voice Note • {m.audioDuration}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Timestamp & Status */}
                        <div
                          className={`text-[10px] font-semibold mt-1.5 flex items-center justify-end gap-1 ${
                            isMe ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span>{format12HourTime(m.timestamp)}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>

                      {/* Emoji Reactions Bar Below Bubbles */}
                      <div className={`flex items-center gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {m.reactions?.map((r, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleToggleReaction(m.id, r.emoji)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                              r.reacted
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[10px]">{r.count}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => handleToggleReaction(m.id, '❤️')}
                          className="px-1.5 py-0.5 rounded-full text-[10px] text-slate-400 hover:text-slate-600 bg-white border border-slate-200/60 hover:bg-slate-50 transition cursor-pointer"
                          title="Add reaction"
                        >
                          +❤️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Chat Input Bar with Neumorphic Styling (Identical to Personal Chat) */}
            <div className="p-3 bg-white/80 backdrop-blur-md border-t border-slate-200/80">
              {/* Attached Media / File Preview Staging */}
              <AnimatePresence>
                {attachedMedia && !isRecordingVoice && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 6 }}
                    className="mb-2 neu-flat rounded-[18px] p-2 flex items-center justify-between gap-3 bg-white border border-blue-200/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-12 h-12 rounded-[12px] overflow-hidden neu-inset flex-shrink-0 flex items-center justify-center bg-slate-100">
                        {attachedMedia.type === 'image' && (
                          <img
                            src={attachedMedia.url}
                            alt="Attached preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                        {attachedMedia.type === 'video' && (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                        {attachedMedia.type === 'file' && (
                          <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {attachedMedia.name || (attachedMedia.type === 'image' ? 'Photo attached' : 'File attached')}
                        </span>
                        <span className="text-[10px] text-[#5B9DFF] font-semibold">
                          {attachedMedia.size || 'Ready to send'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAttachedMedia(null)}
                      className="w-7 h-7 rounded-full neu-raised flex items-center justify-center text-slate-500 hover:text-rose-500 transition cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Muted Warning Banner */}
              {isMuted && (
                <div className="mb-2 p-2.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-bold shadow-xs">
                  <VolumeX className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>You are muted by the community owner and cannot send messages.</span>
                </div>
              )}

              {isRecordingVoice ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="neu-flat rounded-full p-2 flex items-center justify-between gap-3 border border-blue-200/80 shadow-md bg-white"
                >
                  {/* Cancel Button */}
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={handleCancelVoiceRecord}
                    className="w-9 h-9 rounded-full neu-raised flex items-center justify-center text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                    title="Cancel recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>

                  {/* Live Recording Indicator */}
                  <div className="flex-1 flex items-center gap-2.5 px-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        0:{recordingSeconds < 10 ? '0' : ''}
                        {recordingSeconds}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center gap-1 h-6 overflow-hidden">
                      {liveWaveform.map((val, idx) => (
                        <motion.div
                          key={idx}
                          animate={{ height: `${val}%` }}
                          transition={{ duration: 0.1 }}
                          className="flex-1 bg-[#5B9DFF] rounded-full min-w-[3px] max-w-[5px]"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Send Voice Note Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSendVoiceRecord}
                    className="w-10 h-10 rounded-full neu-active-blue text-white shadow-md flex items-center justify-center flex-shrink-0 cursor-pointer"
                    title="Send Voice Message"
                  >
                    <Send className="w-4 h-4 -translate-x-0.5 translate-y-0.5" />
                  </motion.button>
                </motion.div>
              ) : (
                <div className="relative">
                  {/* Quick Emoji Popover */}
                  <AnimatePresence>
                    {showCommunityEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-0 z-30 bg-white neu-flat rounded-2xl p-2 border border-slate-200/80 shadow-lg flex items-center gap-1.5 flex-wrap max-w-xs"
                      >
                        {['😊', '❤️', '🔥', '😂', '👍', '🎉', '✨', '🙌', '💯', '🚀', '😍', '👀', '💡', '👏', '🥳'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setInputText((prev) => prev + em);
                              setShowCommunityEmojiPicker(false);
                            }}
                            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-base transition cursor-pointer"
                          >
                            {em}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 sm:gap-2.5"
                  >
                    {/* 1. Black Circle Camera Button */}
                    <button
                      type="button"
                      disabled={isMuted}
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="Take Photo"
                    >
                      <Camera className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                    </button>

                    {/* 2. Main "Send chat" Input Pill */}
                    <div className="flex-1 relative flex items-center min-w-0">
                      <div className="w-full flex items-center bg-white rounded-full border border-slate-700/90 sm:border-[1.8px] sm:border-slate-800 px-3.5 sm:px-4 py-1.5 sm:py-2 transition-all shadow-2xs focus-within:border-slate-950 focus-within:shadow-xs">
                        <input
                          type="text"
                          disabled={isMuted}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder={
                            isMuted
                              ? 'Muted by community head...'
                              : 'Send chat'
                          }
                          className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0 font-normal sm:font-medium caret-[#FF2A6D] pr-2 disabled:opacity-50"
                        />

                        {/* Inside Pill: Voice Waveform / Send Action */}
                        {inputText.trim() || attachedMedia ? (
                          <button
                            type="submit"
                            disabled={isMuted}
                            className="shrink-0 p-1.5 rounded-full bg-[#5B9DFF] hover:bg-blue-600 text-white transition-all shadow-xs active:scale-90 cursor-pointer disabled:opacity-50"
                            title="Send Chat"
                          >
                            <Send className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isMuted}
                            onClick={handleStartVoiceRecord}
                            className="shrink-0 p-1 text-slate-800 hover:text-black active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
                            title="Record Voice Note"
                          >
                            <VoiceWaveformIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-900" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. Emoji Smile Icon */}
                    <button
                      type="button"
                      disabled={isMuted}
                      onClick={() => setShowCommunityEmojiPicker(!showCommunityEmojiPicker)}
                      className="p-1 sm:p-1.5 text-slate-900 hover:text-black shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="Emojis"
                    >
                      <Smile className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
                    </button>

                    {/* 4. Gallery Photo Cards Icon */}
                    <button
                      type="button"
                      disabled={isMuted}
                      onClick={() => photoInputRef.current?.click()}
                      className="p-1 sm:p-1.5 text-slate-900 hover:text-black shrink-0 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="Gallery Photos"
                    >
                      <GalleryCardsIcon className="w-6 h-6 sm:w-7 sm:h-7 text-slate-900" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ABOUT & GUIDELINES TAB */}
        {activeTab === 'info' && (
          <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4 text-xs sm:text-sm text-slate-700 w-full">
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 space-y-3 shadow-2xs">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5B9DFF]" /> About {community.name}
              </h4>
              <p className="leading-relaxed font-medium text-slate-600">
                {community.description ||
                  'Welcome to our official group channel! Connect with fellow members, collaborate on projects, and share insights.'}
              </p>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 space-y-3 shadow-2xs">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Guidelines & Expectations
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 font-medium list-disc list-inside">
                <li>Be respectful and constructive with all group members.</li>
                <li>No spamming, self-promotion, or off-topic advertising.</li>
                <li>Group owner and moderators retain moderation rights to enforce rules.</li>
              </ul>
            </div>

            <div className="p-5 bg-[#5B9DFF]/10 rounded-3xl border border-[#5B9DFF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Share2 className="w-4 h-4 text-[#5B9DFF]" /> Share {community.name}
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Invite friends and colleagues to join this group via direct link or QR code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#5B9DFF] text-white text-xs font-bold hover:bg-blue-600 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer flex-shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Invite</span>
              </button>
            </div>

            <div className="p-5 bg-amber-50/70 rounded-3xl border border-amber-200/80 space-y-2">
              <h4 className="font-extrabold text-amber-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" /> Group Leadership
              </h4>
              <p className="text-xs text-amber-800 font-semibold">
                This group is managed by the group owner and designated moderators.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: MEMBERS ROSTER TAB (WITH FULL ADMIN CONTROLS) */}
        {activeTab === 'members' && (
          <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-3 w-full">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/80 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Group Members Roster
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{rosterMembers.length} Members</span>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-[#5B9DFF] text-white text-xs font-bold hover:bg-blue-600 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {rosterMembers.map((m) => {
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 truncate">{m.name}</span>
                            {m.isMuted && (
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded-md border border-rose-200">
                                Muted
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">{m.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            m.role === 'Owner'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={previewImage} alt="Expanded preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

      {/* Add Member Modal Dialog */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#5B9DFF] flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Add Member to Group</h3>
                    <p className="text-[11px] text-slate-400">Invite or add people to #{community.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form 1: Add by Name/Username */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddMember(newMemberName, newMemberRole);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Member Name or Handle
                  </label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. Alex Morgan or @alex_m"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B9DFF]/30 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1">
                    Assign Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: 'Member', label: 'Member', icon: Users },
                      { role: 'Moderator', label: 'Moderator ⚡', icon: Zap },
                      { role: 'Admin', label: 'Admin 🛡️', icon: Shield },
                    ].map((r) => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setNewMemberRole(r.role as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          newMemberRole === r.role
                            ? 'bg-[#5B9DFF] text-white border-[#5B9DFF] shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newMemberName.trim()}
                  className="w-full py-2.5 rounded-2xl bg-[#5B9DFF] text-white text-xs font-bold hover:bg-blue-600 transition shadow-md disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Member Directly</span>
                </button>
              </form>


            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Share Community Modal */}
      <ShareCommunityModal
        community={community}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShowToast={onShowToast}
      />

      {/* Forward Community Message Modal */}
      <AnimatePresence>
        {forwardTargetMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForwardTargetMessage(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-[24px] bg-white p-5 shadow-2xl border border-slate-100 z-10 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-[#5B9DFF] flex items-center justify-center">
                    <Forward className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Forward Message</h3>
                    <p className="text-[10px] text-slate-400">Share this group message with a contact</p>
                  </div>
                </div>
                <button
                  onClick={() => setForwardTargetMessage(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Snippet Preview */}
              <div className="my-3 p-2.5 rounded-[16px] bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
                <p className="text-[10px] font-bold text-[#5B9DFF] mb-0.5">
                  {forwardTargetMessage.senderName} ({community.name}):
                </p>
                <p className="line-clamp-2 italic text-slate-700">
                  {forwardTargetMessage.text || (forwardTargetMessage.imageUrl ? '📷 Photo Attachment' : forwardTargetMessage.audioDuration ? '🎤 Voice Note' : '📎 Media')}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-8 py-2 rounded-[14px] bg-slate-100/90 border border-transparent focus:border-blue-400 focus:bg-white text-xs outline-hidden transition text-slate-800"
                />
                {forwardSearchQuery && (
                  <button
                    onClick={() => setForwardSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px] max-h-[260px] no-scrollbar">
              {users.filter((u) => {
                  if (!forwardSearchQuery.trim()) return true;
                  const q = forwardSearchQuery.toLowerCase();
                  return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                }).map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      if (onForwardMessage) {
                        onForwardMessage(
                          contact.id,
                          forwardTargetMessage.text,
                          forwardTargetMessage.imageUrl
                        );
                      }
                      if (onShowToast) {
                        onShowToast(`Message forwarded to ${contact.name} ✈️`, 'success');
                      }
                      setForwardTargetMessage(null);
                      setForwardSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[16px] hover:bg-blue-50/60 active:bg-blue-100/70 transition group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full flex-shrink-0">
                        <img
                          src={contact.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                        {contact.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                          {contact.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          @{contact.username}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-slate-100 group-hover:bg-[#5B9DFF] group-hover:text-white text-slate-600 text-[11px] font-semibold flex items-center gap-1 transition flex-shrink-0 ml-2 shadow-2xs">
                      <span>Send</span>
                      <Forward className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
