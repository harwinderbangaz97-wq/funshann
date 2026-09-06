import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Camera,
  Check,
  CheckCheck,
  MoreVertical,
  X,
  Mic,
  Trash2,
  Sparkles,
  Search,
  Plus,
  Lock, Globe,
  Unlock,
  EyeOff,
  ShieldCheck,
  Palette,
  Flame,
  Eye,
  Shield,
  Flag,
  Copy,
  Clock,
  AlertTriangle,
  Info,
  Smile,
  Forward,
  Bell,
  BellOff,
  Users as UsersIcon,
  UserPlus,
  Settings,
  Edit3,
  Megaphone,
  MessageSquare,
  Share2,
  RefreshCw,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ChatThread, Message, VoiceNoteData, MessagePrivacyMode, MessageReportReason } from '../types';
import { ShareCommunityModal } from './ShareCommunityModal';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import { ChatWallpaperModal, ChatWallpaperSettings } from './ChatWallpaperModal';
import { DeleteMessageConfirmModal } from './DeleteMessageConfirmModal';
import { IndividualUserMenu } from './IndividualUserMenu';
import { UniversalReportModal } from './UniversalReportModal';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupInfoModal } from './GroupInfoModal';
import { CommunityChannelModal } from './CommunityChannelModal';
import { CHAT_WALLPAPERS } from '../data/wallpapers';
import { useNavigation } from '../context/NavigationContext';
import { usePermissionAndMedia } from '../context/PermissionAndMediaContext';
import { audioRecorder } from '../services/audioRecorderService';
import { validateMessageDeletion, getMessagePrivacySettings } from '../data/messagePrivacyService';
import { getIndividualChatSettings, saveIndividualChatSettings } from '../services/individualChatSettingsService';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, getUserProfileFromFirestore, uploadChatMediaToStorage, isValidMediaUrl } from '../services/firebase';
import { createPlayableAudioBlob, blobToDataUrl } from '../utils/audioBlobUtils';
import {
  getChatRoomId,
  subscribeToChatMessages,
  markMessageAsReadInFirestore,
  deleteChatMessageFromFirestore,
  toggleMessageReactionInFirestore,
  addChatMessageToFirestore,
  createOrEnsureChatDocument,
  setTypingStatusInFirestore,
  subscribeToChatTypingStatus,
} from '../services/chatService';
import { parseTimestampToMs, format12HourTime, formatRelativeTime } from '../services/timeUtils';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export interface Community {
  id: string;
  name: string;
  description: string;
  members: string;
  lastMessage: string;
  isPrivate: boolean;
  category: string;
  gradient: string;
  bgLight: string;
  borderLight: string;
  badgeColor: string;
  avatarUrl?: string;
  avatarEmoji?: string;
}

interface ChatViewProps {
  threads: ChatThread[];
  currentUser: User;
  activeChatUserId?: string | null;
  onSelectThread: (threadId: string) => void;
  onBackToList: () => void;
  onSendMessage: (
    receiverId: string,
    text?: string,
    imageUrl?: string,
    voiceNote?: VoiceNoteData,
    privacyMode?: MessagePrivacyMode,
    isForwarded?: boolean,
    forwardedFrom?: string,
    skipFirestoreWrite?: boolean
  ) => void;
  onDeleteMessage?: (threadId: string, messageId: string) => void;
  onReportMessage?: (
    threadId: string,
    message: Message,
    reason: MessageReportReason,
    details?: string
  ) => void;
  onMarkMessageSeen?: (threadId: string, messageId: string) => void;
  onToggleReaction?: (threadId: string, messageId: string, emoji: string) => void;
  lockedChatUserIds?: string[];
  chatLockPasscode?: string;
  isChatLockEnabled?: boolean;
  onShowToast?: (message: string) => void;
  onOpenUserProfile?: (user: User) => void;
  onBackToHome?: () => void;
  onToggleFollow?: (userId: string) => void;
  onToggleLockChat?: (userId: string) => void;
  onClearChat?: (userId: string) => void;
  onCreateGroup?: (name: string, description: string, avatar: string, memberIds: string[]) => void;
  onUpdateGroup?: (groupId: string, updates: { name?: string; description?: string; avatar?: string; memberIds?: string[] }) => void;
  onLeaveGroup?: (groupId: string) => void;
  allUsers?: User[];
}

const CHAT_SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
];

const MessageBubbleItem: React.FC<{
  msg: Message;
  isMyMessage: boolean;
  activeThreadId: string;
  currentUserId: string;
  onOpenContextMenu: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  onImageClick: (url: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}> = ({
  msg,
  isMyMessage,
  currentUserId,
  onOpenContextMenu,
  onForward,
  onImageClick,
  onToggleReaction,
}) => {
  const touchTimerRef = useRef<number | null>(null);
  const isTouchMoved = useRef(false);

  const handleTouchStart = () => {
    isTouchMoved.current = false;
    touchTimerRef.current = window.setTimeout(() => {
      if (!isTouchMoved.current) {
        if (navigator.vibrate) navigator.vibrate(40);
        onOpenContextMenu(msg);
      }
    }, 400);
  };

  const handleTouchMove = () => {
    isTouchMoved.current = true;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(30);
    onOpenContextMenu(msg);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={`group flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} relative select-none`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div
        className={`relative max-w-[85%] rounded-[22px] p-3 text-xs leading-relaxed transition-all cursor-pointer ${
          isMyMessage
            ? 'neu-active-blue text-white rounded-br-sm shadow-md'
            : 'bg-white/95 backdrop-blur-md text-slate-800 rounded-bl-sm border border-slate-200/80 shadow-xs'
        }`}
      >
        {!isMyMessage && msg.senderName && (
          <span className="text-[10px] font-bold text-blue-600 mb-1 block">
            {msg.senderName}
          </span>
        )}
        {msg.isForwarded && (
          <div className="flex items-center gap-1 mb-1.5 opacity-80 text-[10px] font-medium italic select-none">
            <Forward className="w-3 h-3" />
            <span>Forwarded{msg.forwardedFrom ? ` from ${msg.forwardedFrom}` : ''}</span>
          </div>
        )}
        {msg.voiceNote && (
          <VoiceMessageBubble voiceNote={msg.voiceNote} isMyMessage={isMyMessage} />
        )}
        {msg.imageUrl && (
          <div
            className="mb-2 rounded-[14px] overflow-hidden cursor-pointer neu-inset"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(msg.imageUrl || '');
            }}
          >
            <img
              src={msg.imageUrl}
              alt="Sent attachment"
              className="w-full max-h-60 object-cover hover:scale-102 transition-transform duration-300"
            />
          </div>
        )}
        {msg.text && <p className="font-normal whitespace-pre-wrap">{msg.text}</p>}
      </div>

      {msg.reactions && msg.reactions.length > 0 && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex flex-wrap items-center gap-1 mt-1 z-10 select-none ${
            isMyMessage ? 'justify-end pr-1' : 'justify-start pl-1'
          }`}
        >
          {msg.reactions.map((r) => {
            const hasUserReacted = r.userIds.includes(currentUserId);
            return (
              <motion.button
                key={r.emoji}
                type="button"
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleReaction) {
                    if (navigator.vibrate) navigator.vibrate(20);
                    onToggleReaction(msg.id, r.emoji);
                  }
                }}
                className={`group/r flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-xs transition cursor-pointer backdrop-blur-md ${
                  hasUserReacted
                    ? 'bg-blue-50/95 border border-[#5B9DFF] text-[#1d4ed8] shadow-sm ring-1 ring-[#5B9DFF]/30 font-bold'
                    : 'bg-white/95 border border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm leading-none transition-transform group-hover/r:scale-120">
                  {r.emoji}
                </span>
                {r.count > 1 && (
                  <span className="text-[10px] font-bold opacity-90">{r.count}</span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-500 font-semibold drop-shadow-xs">
        <span className="bg-white/70 backdrop-blur-xs px-1.5 py-0.2 rounded-md">{format12HourTime(msg.createdAt || msg.timestamp)}</span>
        {isMyMessage && (
          <span title={msg.isRead ? 'Seen' : (msg.isDelivered ? 'Delivered' : 'Sent')}>
            {msg.isRead || msg.isDelivered ? (
              <CheckCheck
                className={`w-3 h-3 ${msg.isRead ? 'text-[#5B9DFF]' : 'text-slate-400'}`}
              />
            ) : (
              <Check className="w-3 h-3 text-slate-400" />
            )}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onForward) onForward(msg);
            else onOpenContextMenu(msg);
          }}
          className="opacity-60 hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition cursor-pointer"
        >
          <Forward className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenContextMenu(msg);
          }}
          className="opacity-60 hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

const TypingIndicatorBubble: React.FC<{ participant: User }> = ({ participant }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.92 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="flex items-end gap-2.5 max-w-[85%] select-none my-1.5"
    >
      <div className="w-8 h-8 rounded-full neu-raised p-0.5 flex-shrink-0 mb-1">
        <img
          src={participant.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
          alt={participant.name}
          className="w-full h-full rounded-full object-cover"
        />
      </div>
      <div className="flex flex-col items-start">
        <div className="neu-flat-soft rounded-[22px] rounded-tl-sm px-4 py-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-1.5 py-0.5 px-0.5">
            {[0, 0.2, 0.4].map((delay) => (
              <motion.span
                key={delay}
                animate={{ y: [0, -6, 0], scale: [0.9, 1.25, 0.9] }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay,
                }}
                className="w-2.5 h-2.5 rounded-full bg-[#5B9DFF] shadow-xs"
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate-600 italic tracking-tight">
            {participant.name.split(' ')[0]} is typing...
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  threads: rawThreads,
  currentUser,
  activeChatUserId,
  onSelectThread,
  onBackToList,
  onSendMessage,
  onDeleteMessage,
  onReportMessage,
  onMarkMessageSeen,
  onToggleReaction,
  lockedChatUserIds = [],
  chatLockPasscode = '123456',
  isChatLockEnabled = true,
  onShowToast,
  onOpenUserProfile,
  onBackToHome,
  onToggleFollow,
  onToggleLockChat,
  onClearChat,
  onCreateGroup,
  onUpdateGroup,
  onLeaveGroup,
  allUsers = [],
}) => {
  if (currentUser && !currentUser.uid && currentUser.id) {
    currentUser.uid = currentUser.id;
  }

  const threads = useMemo(() => {
    return rawThreads.map(thread => {
      if (thread.isGroup || !allUsers || !allUsers.length) return thread;
      const currentUid = currentUser.uid || currentUser.id;
      const otherUserId = thread.id.split('_').find(id => id !== currentUid && id !== currentUser.id);
      if (otherUserId) {
        const otherUser = allUsers.find(u => u.id === otherUserId || (u as any).uid === otherUserId);
        if (otherUser) {
          return { ...thread, participant: otherUser };
        }
      }
      return thread;
    });
  }, [rawThreads, allUsers, currentUser.uid, currentUser.id]);

  const {
    navState,
    setChatAttachmentOpen,
    setChatWallpaperOpen,
    setChatLightboxUrl,
    setChatMenuOpen,
  } = useNavigation();
  const { requestPermission } = usePermissionAndMedia();

  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const showImagePicker = navState.chatAttachmentOpen;
  const setShowImagePicker = setChatAttachmentOpen;
  const lightboxImage = navState.chatLightboxUrl;
  const setLightboxImage = setChatLightboxUrl;
  const isWallpaperModalOpen = navState.chatWallpaperOpen;
  const setIsWallpaperModalOpen = setChatWallpaperOpen;
  const showThreadMenu = navState.chatMenuOpen;
  const setShowThreadMenu = setChatMenuOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainTab, setActiveMainTab] = useState<'messages' | 'communities'>('messages');

  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState<string>('All');
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>(['c1', 'c2']);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<string[]>([]);
  const [joinRequestModalCommunity, setJoinRequestModalCommunity] = useState<Community | null>(null);
  const [selectedChannelCommunity, setSelectedChannelCommunity] = useState<Community | null>(null);
  const [shareCommunityTarget, setShareCommunityTarget] = useState<Community | null>(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [joinRequestNote, setJoinRequestNote] = useState('');
  const [localToast, setLocalToast] = useState<{ id: string; message: string; type?: 'success' | 'info' | 'warning' } | null>(null);

  const triggerCommunityToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    if (onShowToast) onShowToast(message);
    setLocalToast({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      setLocalToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  };

  const handleToggleCommunityState = (community: Community) => {
    if (joinedCommunityIds.includes(community.id)) {
      setJoinedCommunityIds((prev) => prev.filter((id) => id !== community.id));
      triggerCommunityToast(`You left "${community.name}"`, 'info');
    } else if (community.isPrivate) {
      if (pendingJoinRequests.includes(community.id)) {
        setPendingJoinRequests((prev) => prev.filter((id) => id !== community.id));
        triggerCommunityToast(`Join request cancelled for "${community.name}"`, 'info');
      } else {
        setJoinRequestModalCommunity(community);
        setJoinRequestNote('');
      }
    } else {
      setJoinedCommunityIds((prev) => [...prev, community.id]);
      triggerCommunityToast(`Joined "${community.name}" 🎉`, 'success');
    }
  };

  const handleSendJoinRequest = () => {
    if (!joinRequestModalCommunity) return;
    const comm = joinRequestModalCommunity;
    setPendingJoinRequests((prev) => [...prev, comm.id]);
    setJoinRequestModalCommunity(null);
    triggerCommunityToast(`Join request sent for "${comm.name}" 📩`, 'success');
  };

  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('Tech');
  const [createIsPrivate, setCreateIsPrivate] = useState(false);
  const [createGradient, setCreateGradient] = useState('from-indigo-500 to-blue-600');

  const [communities, setCommunities] = useState<Community[]>([
    {
      id: 'c1',
      name: 'Tech Enthusiasts',
      description: 'Discuss web dev, React 19, AI models, and modern frameworks.',
      lastMessage: 'React Developer: Has anyone tried React 19 hooks yet?',
      members: '12.5k',
      isPrivate: false,
      category: 'Tech',
      gradient: 'from-indigo-500 to-blue-600',
      bgLight: 'bg-indigo-50',
      borderLight: 'border-indigo-200/60',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'c2',
      name: 'Local Hikers & Explorers',
      description: 'Share trail recommendations, gear tips, and organize weekend group climbs.',
      lastMessage: 'Sarah: See you all at 8 AM tomorrow at the main trailhead!',
      members: '3.2k',
      isPrivate: false,
      category: 'Outdoors',
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200/60',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'c3',
      name: 'UI/UX Designers Guild',
      description: 'Private community for portfolio critiques, Figma tricks, and design systems.',
      lastMessage: 'Alex (Admin): Weekly design system teardown begins in 1 hr.',
      members: '4.8k',
      isPrivate: true,
      category: 'Design',
      gradient: 'from-purple-500 to-pink-600',
      bgLight: 'bg-purple-50',
      borderLight: 'border-purple-200/60',
      badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'c4',
      name: 'Crypto & Web3 Pioneers',
      description: 'Private circle exploring DeFi protocols, smart contracts, and Web3 security.',
      lastMessage: 'Marcus (Admin): New analysis paper posted in general channel.',
      members: '1.9k',
      isPrivate: true,
      category: 'Crypto',
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200/60',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'c5',
      name: 'Photography & Visual Arts',
      description: 'Showcase high-res landscape & portrait shots, color grading, and camera gear.',
      lastMessage: 'Elena: Just shared my golden hour photo series from Yosemite!',
      members: '45.1k',
      isPrivate: false,
      category: 'Arts',
      gradient: 'from-rose-500 to-red-600',
      bgLight: 'bg-rose-50',
      borderLight: 'border-rose-200/60',
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'c6',
      name: 'React & TypeScript Mastery',
      description: 'Advanced design patterns, generic type mastery, and state engine optimization.',
      lastMessage: 'David: Created a reusable state machine helper for React forms!',
      members: '8.9k',
      isPrivate: false,
      category: 'Tech',
      gradient: 'from-cyan-500 to-blue-600',
      bgLight: 'bg-cyan-50',
      borderLight: 'border-cyan-200/60',
      badgeColor: 'bg-cyan-100 text-cyan-700',
    },
  ]);

  const filteredCommunities = useMemo(() => {
    return communities.filter((community) => {
      const matchesQuery =
        community.name.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
        community.description.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
        community.category.toLowerCase().includes(communitySearchQuery.toLowerCase());

      if (!matchesQuery) return false;
      if (selectedCommunityCategory === 'Joined') return joinedCommunityIds.includes(community.id);
      if (selectedCommunityCategory === 'Private') return community.isPrivate;
      if (selectedCommunityCategory === 'Public') return !community.isPrivate;
      return true;
    });
  }, [communities, communitySearchQuery, selectedCommunityCategory, joinedCommunityIds]);

  const handleCreateCommunitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      triggerCommunityToast('Please enter a community name', 'warning');
      return;
    }
    const newId = 'c_' + Date.now();
    const newComm: Community = {
      id: newId,
      name: createName.trim(),
      description: createDesc.trim() || `A community created by ${currentUser.name || 'User'}`,
      lastMessage: `${currentUser.name || 'User'}: Welcome to ${createName.trim()}! 🎉`,
      members: '1 member',
      isPrivate: createIsPrivate,
      category: createCategory,
      gradient: createGradient,
      bgLight: 'bg-indigo-50',
      borderLight: 'border-indigo-200/60',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    };

    setCommunities((prev) => [newComm, ...prev]);
    setJoinedCommunityIds((prev) => [...prev, newId]);
    setIsCreateCommunityOpen(false);
    setCreateName('');
    setCreateDesc('');
    setCreateCategory('Tech');
    setCreateIsPrivate(false);
    triggerCommunityToast(`Community "${newComm.name}" created! 🎉`, 'success');
  };

  const [contextMessage, setContextMessage] = useState<Message | null>(null);
  const [reportTargetMessage, setReportTargetMessage] = useState<Message | null>(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<Message | null>(null);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  const [globalWallpaper, setGlobalWallpaper] = useState<ChatWallpaperSettings>(() => {
    try {
      const saved = localStorage.getItem('funshann_global_chat_wallpaper');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { wallpaperId: 'clean-default', dimming: 15, blur: 0, applyToAll: true };
  });

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([20, 40, 60, 30, 75, 45, 90, 60, 30, 80, 50, 40]);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const dynamicThreads = useMemo(() => {
    return threads.map(thread => {
      if (thread.isGroup || !thread.participant) return thread;
      const liveUser = allUsers?.find(u => u.id === thread.participant!.id);
      return liveUser ? { ...thread, participant: liveUser } : thread;
    });
  }, [threads, allUsers]);

  const isGroupThread = Boolean(
    activeChatUserId?.startsWith('g_') ||
    activeChatUserId?.startsWith('group_') ||
    threads.find(t => t.id === activeChatUserId)?.isGroup
  );

  const recipientUserId = useMemo(() => {
    if (!activeChatUserId || isGroupThread) return '';
    const currentUid = currentUser.uid || currentUser.id;
    if (activeChatUserId.includes('_')) {
      return activeChatUserId.split('_').find(id => id !== currentUid && id !== currentUser.id) || activeChatUserId;
    }
    return activeChatUserId;
  }, [activeChatUserId, isGroupThread, currentUser.uid, currentUser.id]);

  const [dynamicParticipant, setDynamicParticipant] = useState<User | null>(null);

  useEffect(() => {
    if (!recipientUserId || isGroupThread) {
      setDynamicParticipant(null);
      return;
    }
    const found = allUsers?.find(u => u.id === recipientUserId || (u as any).uid === recipientUserId);
    if (found) { setDynamicParticipant(found); return; }
    getUserProfileFromFirestore(recipientUserId).then(remoteUser => {
      if (remoteUser) setDynamicParticipant(remoteUser);
    }).catch(console.warn);
  }, [recipientUserId, allUsers, isGroupThread]);

  const rawActiveThread = useMemo(() => {
    if (!activeChatUserId) return null;
    return dynamicThreads.find(
      (t) =>
        t.id === activeChatUserId ||
        t.participant?.id === activeChatUserId ||
        (recipientUserId && (t.participant?.id === recipientUserId || (!t.isGroup && t.id.includes(recipientUserId))))
    ) || null;
  }, [activeChatUserId, dynamicThreads, recipientUserId]);

  const resolvedParticipant = useMemo(() => {
    if (isGroupThread) return undefined;
    if (dynamicParticipant) return dynamicParticipant;
    if (rawActiveThread?.participant) {
      const live = allUsers?.find(u => u.id === rawActiveThread.participant!.id || (u as any).uid === rawActiveThread.participant!.id);
      return live || rawActiveThread.participant;
    }
    return undefined;
  }, [rawActiveThread, recipientUserId, allUsers, isGroupThread, dynamicParticipant]);

  const currentUserId = auth.currentUser?.uid || currentUser.uid || currentUser.id || '';
  const recipientId = resolvedParticipant?.uid || resolvedParticipant?.id || recipientUserId || (
    activeChatUserId?.includes('_')
      ? activeChatUserId.split('_').find(id => id !== currentUserId && id !== currentUser.id)
      : activeChatUserId
  ) || '';

  const chatId = useMemo(() => {
    if (!activeChatUserId) return '';
    if (isGroupThread) return rawActiveThread?.id || activeChatUserId;
    if (!currentUserId || !recipientId) return '';
    return [currentUserId, recipientId].sort().join('_');
  }, [activeChatUserId, isGroupThread, rawActiveThread?.id, currentUserId, recipientId]);

  useEffect(() => {
    if (chatId && currentUserId && recipientId && !isGroupThread) {
      createOrEnsureChatDocument(currentUserId, recipientId).catch(console.warn);
    }
  }, [chatId, currentUserId, recipientId, isGroupThread]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLimit, setMessageLimit] = useState(30);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Real-time Firestore typing indicator state
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [activeTypingUserIds, setActiveTypingUserIds] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);

  const startYRef = useRef<number>(0);
  const isTouchActiveRef = useRef<boolean>(false);
  const previousScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef<boolean>(false);
  const previousChatIdRef = useRef<string>('');
  const prevLastMessageIdRef = useRef<string | null>(null);

  // Reset pagination state when switching chats
  useEffect(() => {
    if (chatId !== previousChatIdRef.current) {
      previousChatIdRef.current = chatId;
      setMessageLimit(30);
      setHasMoreOlder(true);
      setIsLoadingOlder(false);
      setIsPulling(false);
      setPullDistance(0);
      prevLastMessageIdRef.current = null;
      setIsOtherUserTyping(false);
      setActiveTypingUserIds([]);
    }
  }, [chatId]);

  // Subscribe to real-time typing status in Firestore
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setIsOtherUserTyping(false);
      setActiveTypingUserIds([]);
      return;
    }
    const unsubscribe = subscribeToChatTypingStatus(chatId, currentUserId, (typing, userIds) => {
      setIsOtherUserTyping(typing);
      setActiveTypingUserIds(userIds);
    });
    return () => unsubscribe();
  }, [chatId, currentUserId]);

  // Cleanup local typing status on unmount or chat change
  const clearLocalTypingStatus = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isCurrentlyTypingRef.current && chatId && currentUserId) {
      isCurrentlyTypingRef.current = false;
      setTypingStatusInFirestore(chatId, currentUserId, false).catch(console.warn);
    }
  }, [chatId, currentUserId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (chatId && currentUserId && isCurrentlyTypingRef.current) {
        setTypingStatusInFirestore(chatId, currentUserId, false).catch(console.warn);
      }
    };
  }, [chatId, currentUserId]);

  // Handle local user input changes and track typing status in Firestore
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!chatId || !currentUserId) return;

    if (val.trim().length > 0) {
      if (!isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = true;
        setTypingStatusInFirestore(chatId, currentUserId, true).catch(console.warn);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isCurrentlyTypingRef.current = false;
        setTypingStatusInFirestore(chatId, currentUserId, false).catch(console.warn);
      }, 2500);
    } else {
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTypingStatusInFirestore(chatId, currentUserId, false).catch(console.warn);
      }
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim() || attachedImage) {
      clearLocalTypingStatus();
      onSendMessage(recipientId, inputText.trim(), attachedImage || undefined);
      setInputText('');
      setAttachedImage(null);
    }
  };

  const typingParticipant = useMemo<User | undefined>(() => {
    if (activeTypingUserIds.length === 0) return resolvedParticipant;
    const typingUid = activeTypingUserIds[0];
    const foundUser = allUsers?.find(u => u.id === typingUid || (u as any).uid === typingUid);
    return foundUser || resolvedParticipant;
  }, [activeTypingUserIds, allUsers, resolvedParticipant]);

  useEffect(() => {
    if (!chatId) { setMessages([]); return; }
    // Query the newest messageLimit messages (in desc order), then reverse for ascending timeline
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Determine if more history exists beyond current limit
      if (snapshot.docs.length < messageLimit) {
        setHasMoreOlder(false);
      } else {
        setHasMoreOlder(true);
      }

      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data({ serverTimestamps: 'estimate' });
        const createdAtMs = parseTimestampToMs(data.createdAt || data.timestamp || docSnap.id);
        return {
          id: docSnap.id,
          text: typeof data.text === 'string' ? data.text : '',
          senderId: data.senderId || '',
          receiverId: data.receiverId || '',
          createdAt: createdAtMs,
          timestamp: format12HourTime(createdAtMs),
          imageUrl: data.imageUrl,
          voiceNote: data.voiceNote,
          isRead: Boolean(data.isRead),
          reactions: Array.isArray(data.reactions) ? data.reactions : [],
          isDelivered: !snapshot.metadata.hasPendingWrites,
        } as Message;
      }).reverse(); // Ascending chronological order

      setMessages(msgs);
    }, (error) => console.warn('Snapshot error:', error));
    return () => unsubscribe();
  }, [chatId, messageLimit]);

  const handleLoadOlderMessages = useCallback(() => {
    if (isLoadingOlder || !hasMoreOlder) return;
    setIsLoadingOlder(true);
    if (chatContainerRef.current) {
      previousScrollHeightRef.current = chatContainerRef.current.scrollHeight;
      isPrependingRef.current = true;
    }
    // Increment message limit to query older history
    setMessageLimit((prev) => prev + 25);

    // Failsafe reset if snapshot is already in cache
    setTimeout(() => {
      setIsLoadingOlder(false);
    }, 1500);
  }, [isLoadingOlder, hasMoreOlder]);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current || isLoadingOlder || !hasMoreOlder) return;
    if (chatContainerRef.current.scrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      isTouchActiveRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouchActiveRef.current || !chatContainerRef.current || isLoadingOlder || !hasMoreOlder) return;
    if (chatContainerRef.current.scrollTop <= 2) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      if (diff > 0) {
        setIsPulling(true);
        // Dampen touch pull distance (max 75px)
        const distance = Math.min(75, diff * 0.45);
        setPullDistance(distance);
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isTouchActiveRef.current) {
      if (pullDistance >= 45 && !isLoadingOlder && hasMoreOlder) {
        handleLoadOlderMessages();
      }
      isTouchActiveRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const activeThread = useMemo<ChatThread | null>(() => {
    if (!activeChatUserId) return null;
    const baseThread: ChatThread = rawActiveThread || {
      id: chatId,
      participant: resolvedParticipant,
      participantIds: [currentUserId, recipientId].sort(),
      unreadCount: 0,
      messages: [],
      lastMessage: { text: '', timestamp: '', isRead: true, senderId: '' },
    };
    return {
      ...baseThread,
      id: chatId || baseThread.id,
      participant: resolvedParticipant || baseThread.participant,
      messages,
      isTyping: isOtherUserTyping || rawActiveThread?.isTyping,
    };
  }, [activeChatUserId, rawActiveThread, chatId, resolvedParticipant, recipientId, currentUserId, messages, isOtherUserTyping]);

  // Handle auto-scroll vs preserving scroll position on older message load
  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    const lastMsgId = lastMsg?.id;

    if (isPrependingRef.current && chatContainerRef.current) {
      // Maintain previous scroll position so the view doesn't jump
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          const newScrollHeight = chatContainerRef.current.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
          if (scrollDiff > 0) {
            chatContainerRef.current.scrollTop = scrollDiff;
          }
        }
        isPrependingRef.current = false;
        setIsLoadingOlder(false);
      });
    } else if (lastMsgId !== prevLastMessageIdRef.current) {
      // Auto-scroll to bottom only when new incoming message at bottom or initial load
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLastMessageIdRef.current = lastMsgId || null;
  }, [messages]);

  useEffect(() => {
    if (activeThread?.isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.isTyping]);

  useEffect(() => {
    if (activeThread && chatId) {
      const myUid = auth.currentUser?.uid || currentUserId;
      activeThread.messages.forEach((m) => {
        if (m.receiverId === myUid && !m.isRead) {
          markMessageAsReadInFirestore(chatId, m.id).catch(console.warn);
          if (onMarkMessageSeen) onMarkMessageSeen(activeThread.id, m.id);
        }
      });
    }
  }, [activeThread?.id, activeThread?.messages, currentUserId, chatId, onMarkMessageSeen]);

  const handleStartRecording = async () => {
    const hasMicPermission = await requestPermission('microphone', 'Voice Messages');
    if (!hasMicPermission) return;
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    await audioRecorder.startRecording({
      onWaveform: (waveform) => setLiveWaveform(waveform),
      onTick: (seconds) => setRecordingSeconds(seconds),
    });
  };

  const handleSendVoiceNote = async () => {
    if (!activeThread || !chatId) return;
    setIsRecordingVoice(false);
    clearLocalTypingStatus();

    try {
      const result = await audioRecorder.stopRecording();
      const senderUid = auth.currentUser?.uid || currentUserId;
      const targetRecipientId = activeThread.isGroup ? activeThread.id : recipientId;

      // 1. When a voice recording is finished, upload the actual recorded audio Blob to the existing Firebase Storage.
      let audioBlob: Blob | undefined = result.blob;
      if (!audioBlob && result.audioUrl && result.audioUrl.startsWith('blob:')) {
        try {
          const res = await fetch(result.audioUrl);
          audioBlob = await res.blob();
        } catch (e) {
          console.warn('Error extracting blob from local URL:', e);
        }
      }

      if (!audioBlob || audioBlob.size === 0) {
        audioBlob = createPlayableAudioBlob(result.durationSeconds || 2, result.waveform);
      }

      // 2. Use the existing uploadChatMediaToStorage() function to upload the audio Blob
      // 3. After the upload succeeds, get the permanent Firebase Storage download URL.
      let permanentUrl = '';
      try {
        permanentUrl = await uploadChatMediaToStorage(
          senderUid,
          chatId,
          audioBlob,
          'audio'
        );
      } catch (uploadErr) {
        console.warn('Voice message Firebase Storage upload error:', uploadErr);
      }

      // 5. NEVER save a local blob: URL as voiceNote.audioUrl because another user's device cannot access
      if (!permanentUrl || permanentUrl.startsWith('blob:')) {
        try {
          if (audioBlob) {
            permanentUrl = await blobToDataUrl(audioBlob);
          }
        } catch {
          permanentUrl = '';
        }
      }

      // Revoke the temporary local blob URL
      if (result.audioUrl && result.audioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(result.audioUrl);
        } catch {
          // ignore
        }
      }

      // 4. Save that permanent Storage URL as voiceNote.audioUrl in the Firestore message.
      const messageObj = {
        text: '',
        senderId: senderUid,
        receiverId: targetRecipientId,
        voiceNote: {
          audioUrl: permanentUrl,
          durationSeconds: result.durationSeconds || 1,
          waveform: result.waveform && result.waveform.length > 0 ? result.waveform : [30, 50, 70, 40, 60],
        },
        createdAt: serverTimestamp(),
        reactions: [],
        isRead: false,
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageObj);
    } catch (e) {
      console.warn('Voice note submission error:', e);
    }
  };

  if (activeChatUserId && activeThread) {
    const threadWallpaper = globalWallpaper;
    const selectedWallpaper = CHAT_WALLPAPERS.find(w => w.id === threadWallpaper.wallpaperId);
    const wallStyles: React.CSSProperties = {
      backgroundImage: threadWallpaper.wallpaperId !== 'clean-default' && selectedWallpaper?.value ? (selectedWallpaper.type === 'image' ? `url(${selectedWallpaper.value})` : selectedWallpaper.value) : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };

    return (
      <div className="h-[100dvh] flex flex-col min-h-0 bg-slate-50 relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-400">
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-30 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToList}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="flex items-center gap-3 cursor-pointer group min-w-0"
              onClick={() => { if (resolvedParticipant && onOpenUserProfile) onOpenUserProfile(resolvedParticipant); }}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={activeThread.isGroup ? (activeThread.groupAvatar || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80') : (resolvedParticipant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')}
                  alt={activeThread.isGroup ? activeThread.groupName : (resolvedParticipant?.name || 'Contact')}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform"
                />
                {!activeThread.isGroup && resolvedParticipant?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {activeThread.isGroup ? activeThread.groupName : (resolvedParticipant?.name || 'Contact')}
                </h3>
                {!activeThread.isGroup ? (
                  activeThread.isTyping ? (
                    <p className="text-[10px] font-semibold text-blue-600 animate-pulse flex items-center gap-1">
                      <span>typing</span>
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-emerald-600 animate-pulse">
                      {resolvedParticipant?.isOnline ? 'Active Now' : 'Last seen recently'}
                    </p>
                  )
                ) : (
                  activeThread.isTyping ? (
                    <p className="text-[10px] font-semibold text-blue-600 animate-pulse">
                      {typingParticipant ? `${typingParticipant.name.split(' ')[0]} is typing...` : 'typing...'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-slate-500">
                      {activeThread.participantIds?.length || 0} members
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500 cursor-pointer"><Camera className="w-5 h-5" /></button>
            <button onClick={() => setShowThreadMenu(true)} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500 cursor-pointer"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        <div
          ref={chatContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 relative no-scrollbar"
          style={{ ...wallStyles, WebkitOverflowScrolling: 'touch' }}
        >
          <div className="absolute inset-0 z-0" style={{ backgroundColor: `rgba(241, 245, 249, ${threadWallpaper.dimming / 100})`, backdropFilter: `blur(${threadWallpaper.blur}px)` }} />
          <div className="relative z-10 flex flex-col gap-4 pb-2">
            {/* Pull to Refresh Indicator & History Loader */}
            <div className="flex flex-col items-center justify-center -mt-1 mb-1">
              {(isPulling || isLoadingOlder) && (
                <div
                  className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-white/95 backdrop-blur-md shadow-md border border-slate-200/80 text-xs font-semibold text-slate-700 transition-all duration-200 animate-in fade-in"
                  style={{
                    transform: `translateY(${Math.min(pullDistance, 35)}px)`,
                    opacity: Math.max(0.6, Math.min(1, (pullDistance + 10) / 40)),
                  }}
                >
                  {isLoadingOlder ? (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      <span>Loading older messages...</span>
                    </>
                  ) : pullDistance >= 45 ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      <span>Release to load older history</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown
                        className="w-4 h-4 text-slate-400 transition-transform duration-150"
                        style={{ transform: `rotate(${Math.min(180, (pullDistance / 45) * 180)}deg)` }}
                      />
                      <span>Pull down to load older messages</span>
                    </>
                  )}
                </div>
              )}

              {!isPulling && !isLoadingOlder && hasMoreOlder && messages.length >= 10 && (
                <button
                  onClick={handleLoadOlderMessages}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-blue-600 border border-slate-200/70 text-[11px] font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400 group-hover:text-blue-500 group-hover:rotate-180 transition-all duration-300" />
                  <span>Load older messages</span>
                </button>
              )}

              {!hasMoreOlder && messages.length >= 15 && (
                <div className="text-[10px] text-slate-400 font-medium py-1">
                  Beginning of conversation history
                </div>
              )}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm"><Sparkles className="w-8 h-8 text-blue-400" /></div>
                <div><p className="text-sm font-bold text-slate-800">Start the conversation</p><p className="text-xs text-slate-500">Send a friendly greeting to begin</p></div>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubbleItem
                key={m.id}
                msg={m}
                isMyMessage={m.senderId === (currentUser.uid || currentUser.id)}
                activeThreadId={activeThread.id}
                currentUserId={currentUser.uid || currentUser.id || ''}
                onOpenContextMenu={setContextMessage}
                onForward={setForwardTargetMessage}
                onImageClick={setLightboxImage}
                onToggleReaction={(messageId, emoji) => {
                  if (onToggleReaction && activeThread) onToggleReaction(activeThread.id, messageId, emoji);
                }}
              />
            ))}
            {activeThread.isTyping && (typingParticipant || resolvedParticipant) && (
              <TypingIndicatorBubble participant={typingParticipant || resolvedParticipant!} />
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        <div className="p-3 bg-white border-t border-slate-200/60 z-30 flex-shrink-0">
          {isRecordingVoice ? (
            <div className="flex items-center gap-3 bg-blue-50/80 rounded-full px-4 py-3 border border-blue-200/60 animate-in slide-in-from-bottom-2">
              <button onClick={() => setIsRecordingVoice(false)} className="p-1.5 rounded-full bg-rose-100 text-rose-600"><Trash2 className="w-4 h-4" /></button>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700 tabular-nums">{Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {liveWaveform.map((h, i) => <div key={i} className="w-0.5 bg-blue-400 rounded-full transition-all" style={{ height: `${Math.max(10, h)}%` }} />)}
                </div>
              </div>
              <button onClick={handleSendVoiceNote} className="w-9 h-9 rounded-full bg-[#5B9DFF] text-white flex items-center justify-center shadow-lg"><Send className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-end gap-2 sm:gap-3">
              <button onClick={() => setShowImagePicker(true)} className="p-2.5 rounded-2xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"><ImageIcon className="w-5 h-5" /></button>
              <div className="flex-1 relative flex flex-col gap-2">
                {attachedImage && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-md group animate-in zoom-in-95">
                    <img src={attachedImage} className="w-full h-full object-cover" />
                    <button onClick={() => setAttachedImage(null)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="w-full max-h-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[20px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none no-scrollbar font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)} className="absolute right-2.5 bottom-2 p-1 text-slate-400 hover:text-blue-500 transition"><Smile className="w-5 h-5" /></button>
                </div>
              </div>
              {inputText.trim() || attachedImage ? (
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-2xl bg-[#5B9DFF] text-white shadow-lg hover:bg-blue-600 transition cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleStartRecording}
                  className="p-3 rounded-2xl bg-white border border-slate-200 text-[#5B9DFF] shadow-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {contextMessage && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setContextMessage(null)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl space-y-1" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Message Options</span>
                <button onClick={() => setContextMessage(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <button onClick={() => { if (contextMessage.text) navigator.clipboard.writeText(contextMessage.text); setContextMessage(null); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"><Copy className="w-4 h-4" />Copy Text</button>
              <button onClick={() => { setForwardTargetMessage(contextMessage); setContextMessage(null); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700"><Forward className="w-4 h-4" />Forward</button>
              <button onClick={() => { setReportTargetMessage(contextMessage); setContextMessage(null); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition text-sm font-semibold text-rose-600"><Flag className="w-4 h-4" />Report Message</button>
              {contextMessage.senderId === (currentUser.uid || currentUser.id) && (
                <button onClick={() => { setDeleteTargetMessage(contextMessage); setContextMessage(null); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 transition text-sm font-semibold text-rose-600"><Trash2 className="w-4 h-4" />Delete Message</button>
              )}
            </motion.div>
          </div>
        )}

        <ChatWallpaperModal isOpen={isWallpaperModalOpen} onClose={() => setIsWallpaperModalOpen(false)} currentSettings={globalWallpaper} participantName="this chat" onSaveWallpaper={(s) => setGlobalWallpaper(s)} onShowToast={onShowToast} />
        {deleteTargetMessage && (
          <DeleteMessageConfirmModal
            isOpen={!!deleteTargetMessage}
            message={deleteTargetMessage}
            onClose={() => setDeleteTargetMessage(null)}
            onConfirmDelete={() => {
              if (onDeleteMessage) onDeleteMessage(activeThread.id, deleteTargetMessage.id);
              setDeleteTargetMessage(null);
            }}
          />
        )}
        {reportTargetMessage && (
          <UniversalReportModal
            isOpen={!!reportTargetMessage}
            onClose={() => setReportTargetMessage(null)}
            contentType="message"
            contentId={reportTargetMessage.id}
            threadId={activeThread.id}
            snippet={reportTargetMessage.text}
            reporterUserId={currentUser.id}
            targetUser={{
              id: reportTargetMessage.senderId,
              name: reportTargetMessage.senderName || 'Member',
              username: 'user',
            }}
            onShowToast={onShowToast}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 animate-in fade-in duration-500">
      <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-20 sticky top-0 shadow-xs">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBackToHome} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">Chat <Sparkles className="w-5 h-5 text-blue-500" /></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setIsCreateGroupModalOpen(true)} className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 hover:bg-blue-100 transition cursor-pointer" title="New Group"><UserPlus className="w-5 h-5" /></button>
            <button onClick={() => setIsWallpaperModalOpen(true)} className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200/60 hover:bg-slate-200 transition cursor-pointer" title="Global Chat Settings"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-100/80 p-1 rounded-[18px] border border-slate-200/50">
          <button onClick={() => setActiveMainTab('messages')} className={`flex-1 py-2 rounded-[14px] text-xs font-bold transition flex items-center justify-center gap-2 ${activeMainTab === 'messages' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><MessageSquare className="w-4 h-4" />Messages</button>
          <button onClick={() => setActiveMainTab('communities')} className={`flex-1 py-2 rounded-[14px] text-xs font-bold transition flex items-center justify-center gap-2 ${activeMainTab === 'communities' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><UsersIcon className="w-4 h-4" />Communities</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="p-4 sm:p-6">
          {activeMainTab === 'messages' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-400">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages or people..." className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs font-medium" />
              </div>
              <div className="space-y-1 pt-2">
                <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">All Conversations</h2>
                {threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center"><MessageSquare className="w-8 h-8 text-slate-400" /></div>
                    <p className="text-sm font-bold text-slate-600">No conversations yet</p>
                  </div>
                ) : (
                  threads.filter(t => !searchQuery || (t.isGroup ? t.groupName : t.participant?.name)?.toLowerCase().includes(searchQuery.toLowerCase())).map((thread) => (
                    <motion.div key={thread.id} whileTap={{ scale: 0.98 }} onClick={() => onSelectThread(thread.id)} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white hover:shadow-md transition cursor-pointer border border-transparent hover:border-slate-100 group">
                      <div className="relative flex-shrink-0">
                        <img src={thread.isGroup ? (thread.groupAvatar || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80') : (thread.participant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')} alt={thread.isGroup ? thread.groupName : thread.participant?.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        {!thread.isGroup && thread.participant?.isOnline && <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="text-sm font-bold text-slate-800 truncate pr-2">{thread.isGroup ? thread.groupName : (thread.participant?.name || 'Contact')}</h3>
                          <span className="text-[10px] font-semibold text-slate-400">{thread.lastMessage.timestamp}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate pr-4 ${thread.unreadCount > 0 ? 'text-blue-600 font-bold' : 'text-slate-500 font-medium'}`}>{thread.lastMessage.text || (thread.lastMessage.isVoice ? 'Voice message' : 'Sent an attachment')}</p>
                          {thread.unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-blue-200">{thread.unreadCount}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeMainTab === 'communities' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-400">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={communitySearchQuery} onChange={(e) => setCommunitySearchQuery(e.target.value)} placeholder="Explore communities..." className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none shadow-xs font-medium" />
                </div>
                <button onClick={() => setIsCreateCommunityOpen(true)} className="p-3.5 rounded-2xl bg-blue-500 text-white shadow-md hover:bg-blue-600 transition cursor-pointer"><Plus className="w-5 h-5" /></button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['All', 'Joined', 'Public', 'Private'].map((cat) => (
                  <button key={cat} onClick={() => setSelectedCommunityCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 cursor-pointer ${selectedCommunityCategory === cat ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredCommunities.length === 0 ? (
                  <div className="col-span-full py-20 text-center space-y-2 opacity-50"><p className="text-sm font-bold text-slate-800">No communities found</p><p className="text-xs text-slate-500">Try a different search or filter</p></div>
                ) : (
                  filteredCommunities.map((community) => {
                    const isJoined = joinedCommunityIds.includes(community.id);
                    const isPending = pendingJoinRequests.includes(community.id);
                    return (
                      <div key={community.id} onClick={() => setSelectedChannelCommunity(community)} className="group bg-white rounded-[28px] p-5 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition cursor-pointer relative overflow-hidden flex flex-col gap-4">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${community.gradient} opacity-10 rounded-bl-[100px] transition-transform group-hover:scale-110`} />
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${community.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                            {community.isPrivate ? <Lock className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-slate-800 truncate mb-1 group-hover:text-blue-600 transition-colors">{community.name}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed">{community.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{community.members} Members</span>
                            {community.isPrivate && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Private</span>}
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setShareCommunityTarget(community)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"><Share2 className="w-4 h-4" /></button>
                            {isJoined ? (
                              <button onClick={() => handleToggleCommunityState(community)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-600 hover:bg-rose-100 hover:text-rose-600 transition group/leave"><span className="group-hover/leave:hidden">Joined</span><span className="hidden group-hover/leave:inline">Leave</span></button>
                            ) : isPending ? (
                              <button className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5 animate-pulse" />Pending</button>
                            ) : (
                              <button onClick={() => handleToggleCommunityState(community)} className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-500 text-white shadow-md hover:bg-blue-600 transition">Join</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button onClick={() => setIsCreateCommunityOpen(true)} className="w-full py-4 rounded-[28px] border-2 border-dashed border-slate-200 bg-white text-slate-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition flex items-center justify-center gap-2 font-bold text-sm shadow-xs"><Plus className="w-5 h-5" />Create Your Own Community</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCreateCommunityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Create Community</h3>
                <button onClick={() => setIsCreateCommunityOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Community Name</label><input type="text" required value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. AI Explorers" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold" /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">About</label><textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Describe your community..." className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Category</label><select value={createCategory} onChange={(e) => setCreateCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none font-bold">{['Tech', 'Outdoors', 'Design', 'Arts', 'Gaming'].map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  <div className="space-y-1.5"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Privacy</label><div className="flex bg-slate-100 p-1 rounded-xl"><button type="button" onClick={() => setCreateIsPrivate(false)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${!createIsPrivate ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Public</button><button type="button" onClick={() => setCreateIsPrivate(true)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${createIsPrivate ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Private</button></div></div>
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-600 transition mt-2">Create Community</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {joinRequestModalCommunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center"><Lock className="w-5 h-5" /></div><div><h3 className="text-base font-black text-slate-800 leading-tight">Private Community</h3><p className="text-xs text-slate-500">Request access to join</p></div></div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><h4 className="text-sm font-bold text-slate-800 mb-1">{joinRequestModalCommunity.name}</h4><p className="text-[11px] text-slate-500 leading-relaxed">{joinRequestModalCommunity.description}</p></div>
              <textarea value={joinRequestNote} onChange={(e) => setJoinRequestNote(e.target.value)} placeholder="Say something about why you'd like to join..." className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium" />
              <div className="flex items-center gap-3 pt-2"><button onClick={() => setJoinRequestModalCommunity(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition">Cancel</button><button onClick={handleSendJoinRequest} className="flex-1 py-3 rounded-2xl bg-blue-500 text-white text-xs font-bold shadow-lg hover:bg-blue-600 transition">Send Request</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedChannelCommunity && (
        <CommunityChannelModal
          isOpen={!!selectedChannelCommunity}
          onClose={() => setSelectedChannelCommunity(null)}
          community={selectedChannelCommunity as any}
          isJoined={joinedCommunityIds.includes(selectedChannelCommunity.id)}
          onJoinToggle={() => handleToggleCommunityState(selectedChannelCommunity)}
          onShowToast={(msg) => triggerCommunityToast(msg)}
          onForwardMessage={(receiverId, text, imageUrl, voiceNote) => onSendMessage(receiverId, text, imageUrl, voiceNote, 'normal', true, selectedChannelCommunity.name)}
          users={allUsers || []}
        />
      )}

      <ShareCommunityModal community={shareCommunityTarget as any} isOpen={shareCommunityTarget !== null} onClose={() => setShareCommunityTarget(null)} users={allUsers || []} onShowToast={(msg) => triggerCommunityToast(msg)} />

      <AnimatePresence>
        {localToast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-3 border border-white/10"><Sparkles className="w-4 h-4 text-blue-400" /><span>{localToast.message}</span><button onClick={() => setLocalToast(null)} className="p-1 hover:text-blue-400 transition"><X className="w-4 h-4" /></button></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
