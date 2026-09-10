import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  Mic,
  ShieldAlert,
  Users2,
  Check,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { WhoCanContactSettings } from '../../types';
import {
  getWhoCanContact,
  saveWhoCanContact,
  saveMessagingPrivacy,
} from '../../services/privacySettingsService';

interface WhoCanContactSubPageProps {
  onShowToast: (msg: string) => void;
}

export const WhoCanContactSubPage: React.FC<WhoCanContactSubPageProps> = ({
  onShowToast,
}) => {
  const [settings, setSettings] = useState<WhoCanContactSettings>(() => {
    return getWhoCanContact();
  });

  const handleSelect = (
    key: 'directMessages' | 'voiceNotes' | 'allowGroupInvites',
    value: 'everyone' | 'following' | 'nobody'
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveWhoCanContact(updated);

    if (key === 'directMessages') {
      const mapped =
        value === 'everyone'
          ? 'everyone'
          : value === 'following'
          ? 'followers_only'
          : 'disabled';
      saveMessagingPrivacy(mapped).catch(console.warn);
    }

    onShowToast('Contact preference saved');
  };

  const handleToggleFilter = () => {
    const updated = { ...settings, filterSpamRequests: !settings.filterSpamRequests };
    setSettings(updated);
    saveWhoCanContact(updated);
    onShowToast(`Spam message filter ${updated.filterSpamRequests ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* 1. Direct Messages */}
      <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Who Can Send Direct Messages</h4>
            <p className="text-[11px] text-slate-500">Control incoming chat requests</p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {[
            { id: 'everyone', label: 'Everyone on Funshann', desc: 'Anyone can send you direct messages' },
            { id: 'following', label: 'People You Follow / Mutuals Only', desc: 'Only users you follow can chat directly' },
            { id: 'nobody', label: 'Nobody (Disable Direct Messages)', desc: 'Close your inbox to all new messages' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect('directMessages', item.id as any)}
              className={`w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                settings.directMessages === item.id
                  ? 'neu-active-blue text-white shadow-xs'
                  : 'neu-inset text-slate-700 hover:bg-slate-100/80'
              }`}
            >
              <div>
                <p className="text-xs font-bold">{item.label}</p>
                <p className={`text-[10px] mt-0.5 ${settings.directMessages === item.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.desc}
                </p>
              </div>
              {settings.directMessages === item.id && <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Voice Notes Permissions */}
      <div className="neu-flat rounded-[24px] p-4.5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-purple-500">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Who Can Send Voice Notes</h4>
            <p className="text-[11px] text-slate-500">Control audio messages in conversations</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 neu-inset rounded-2xl">
          {(['everyone', 'following', 'nobody'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect('voiceNotes', opt)}
              className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                settings.voiceNotes === opt
                  ? 'neu-active-blue text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt === 'following' ? 'Friends only' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Spam & Offensive Message Request Filter */}
      <div className="neu-flat rounded-[24px] p-4.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-amber-500">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Filter Spam & Unknown Requests</h4>
            <p className="text-[11px] text-slate-500">Automatically hide suspicious message requests into a Hidden folder</p>
          </div>
        </div>

        <button
          onClick={handleToggleFilter}
          className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
            settings.filterSpamRequests ? 'bg-[#5B9DFF]' : 'bg-slate-300'
          }`}
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
              settings.filterSpamRequests ? 'translate-x-5.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
