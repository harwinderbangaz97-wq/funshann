import React, { useState } from 'react';
import { X, Users, Camera, Check, Plus, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onCreateGroup: (
    name: string,
    description: string,
    avatar: string,
    memberIds: string[],
    isPrivate?: boolean,
    category?: string
  ) => void;
  onShowToast?: (msg: string) => void;
}

const PRESET_GROUP_AVATARS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&auto=format&fit=crop&q=80',
];

const GROUP_CATEGORIES = ['General', 'Tech', 'Outdoors', 'Design', 'Gaming', 'Arts', 'Crypto'];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onCreateGroup,
  onShowToast,
}) => {
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(PRESET_GROUP_AVATARS[0]);
  const [groupCategory, setGroupCategory] = useState('General');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      if (onShowToast) onShowToast('Please enter a group name');
      return;
    }

    onCreateGroup(
      groupName.trim(),
      groupDesc.trim() || 'Collaborative group space',
      groupAvatar,
      selectedMemberIds,
      isPrivate,
      groupCategory
    );
    setGroupName('');
    setGroupDesc('');
    setSelectedMemberIds([]);
    setIsPrivate(false);
    onClose();
    if (onShowToast) onShowToast(`Created group "${groupName.trim()}" successfully! 🚀`);
  };

  const availableUsers = allUsers.filter((u) => u.id !== currentUser.id);
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-slate-200/80 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Group</h3>
              <p className="text-xs text-slate-500">Collaborate with multiple friends & creators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 no-scrollbar">
          {/* Avatar & Name */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Group Identity
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden neu-inset flex-shrink-0 border-2 border-blue-200">
                <img
                  src={groupAvatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
                  alt="Group Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group Name (e.g. Design Hackers 🎨)"
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white text-xs font-bold outline-hidden text-slate-900 transition"
                  maxLength={40}
                  required
                />
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Short description or topic..."
                  className="w-full px-3.5 py-2 rounded-[14px] bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white text-xs outline-hidden text-slate-700 transition"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Category & Privacy */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Category
                </label>
                <select
                  value={groupCategory}
                  onChange={(e) => setGroupCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-[14px] bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white text-xs font-bold outline-hidden text-slate-800 transition"
                >
                  {GROUP_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Privacy
                </label>
                <div className="flex bg-slate-100 p-1 rounded-[14px]">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    className={`flex-1 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer ${
                      !isPrivate ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    className={`flex-1 py-1 rounded-[10px] text-xs font-bold transition cursor-pointer ${
                      isPrivate ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Presets:</span>
              {PRESET_GROUP_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGroupAvatar(url)}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                    groupAvatar === url ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200'
                  }`}
                >
                  <img src={url} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Invite Members ({selectedMemberIds.length} selected)
              </label>
              <span className="text-[11px] text-[#5B9DFF] font-semibold">
                Tap to toggle
              </span>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts to add..."
              className="w-full px-3.5 py-2 rounded-[14px] bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white text-xs outline-hidden text-slate-800 transition"
            />

            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedMemberIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={`flex items-center justify-between p-2.5 rounded-[14px] transition cursor-pointer ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{user.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">@{user.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                        isSelected ? 'bg-blue-600 text-white' : 'neu-raised text-slate-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[14px] neu-raised text-slate-600 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!groupName.trim()}
              className={`px-5 py-2.5 rounded-[14px] text-xs font-bold text-white transition shadow-md cursor-pointer ${
                groupName.trim()
                  ? 'neu-active-blue'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              Create Group
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
