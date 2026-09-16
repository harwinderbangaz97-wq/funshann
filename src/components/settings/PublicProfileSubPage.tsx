import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Mail,
  Phone,
  Cake,
  Users,
  Heart,
  Search,
  Eye,
  Shield,
  Check,
} from 'lucide-react';
import { PublicProfileSettings, User } from '../../types';
import {
  getPublicProfileSettings,
  savePublicProfileSettings,
} from '../../services/privacySettingsService';

interface PublicProfileSubPageProps {
  currentUser: User;
  onShowToast: (msg: string) => void;
}

export const PublicProfileSubPage: React.FC<PublicProfileSubPageProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<PublicProfileSettings>(() => {
    return getPublicProfileSettings();
  });

  const handleToggle = (key: keyof PublicProfileSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    savePublicProfileSettings(updated);
    onShowToast('Public profile settings updated');
  };

  const controls = [
    {
      key: 'showBirthday' as keyof PublicProfileSettings,
      title: 'Show Birthday & Zodiac',
      desc: 'Allow visitors to see your birthday date on your profile header',
      icon: Cake,
      color: 'text-pink-500',
    },
    {
      key: 'showEmail' as keyof PublicProfileSettings,
      title: 'Show Public Contact Email',
      desc: 'Display your contact email on the public profile action bar',
      icon: Mail,
      color: 'text-[#5B9DFF]',
    },
    {
      key: 'showPhone' as keyof PublicProfileSettings,
      title: 'Show Public Phone Number',
      desc: 'Display contact phone for direct inquiries',
      icon: Phone,
      color: 'text-emerald-500',
    },
    {
      key: 'showFollowersList' as keyof PublicProfileSettings,
      title: 'Show Followers & Following List',
      desc: 'Allow visitors to tap and view your connection list',
      icon: Users,
      color: 'text-[#5B9DFF]',
    },
    {
      key: 'showLikedPosts' as keyof PublicProfileSettings,
      title: 'Public Liked Posts Tab',
      desc: 'Display a dedicated tab on your profile of posts you liked',
      icon: Heart,
      color: 'text-red-500',
    },
    {
      key: 'allowSearchIndexing' as keyof PublicProfileSettings,
      title: 'Search Engine Indexing',
      desc: 'Allow public search engines (Google, Bing) to index your profile',
      icon: Search,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Informational Banner */}
      <div className="neu-flat rounded-[24px] p-4 flex items-start gap-3 bg-gradient-to-r from-blue-50/50 via-white to-white border border-blue-100/60">
        <div className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] flex-shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Public Visibility Controls</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Customize what casual visitors and followers can see on your public profile page.
          </p>
        </div>
      </div>

      {/* Toggles List */}
      <div className="neu-flat rounded-[24px] divide-y divide-slate-100/80 overflow-hidden">
        {controls.map((item) => {
          const Icon = item.icon;
          const isEnabled = settings[item.key];
          return (
            <div key={item.key} className="p-4 flex items-center justify-between">
              <div className="flex items-start gap-3 pr-2">
                <div className="w-9 h-9 rounded-full neu-raised flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(item.key)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                  isEnabled ? 'bg-[#5B9DFF]' : 'bg-slate-300'
                }`}
              >
                <motion.div
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Mini Preview Box */}
      <div className="neu-flat rounded-[24px] p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Eye className="w-4 h-4 text-[#5B9DFF]" />
          <span>Visitor Preview</span>
        </div>
        <div className="p-3 neu-inset rounded-2xl bg-white space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Email Display:</span>
            <span className="font-bold">{settings.showEmail ? currentUser.email : 'Hidden'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Phone Display:</span>
            <span className="font-bold">{settings.showPhone ? currentUser.mobileNumber : 'Hidden'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Followers List:</span>
            <span className="font-bold">{settings.showFollowersList ? 'Publicly Viewable' : 'Hidden'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
