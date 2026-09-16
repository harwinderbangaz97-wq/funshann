import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Globe, Users, TrendingUp, Plus, Check, Share2 } from 'lucide-react';
import { CreateCommunityModal } from './CreateCommunityModal';
import { ShareCommunityModal } from './ShareCommunityModal';

export const CommunityDiscoveryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [shareCommunityTarget, setShareCommunityTarget] = useState<any | null>(null);

  const trendingCommunities = [
    { id: '1', name: 'Tech Enthusiasts', description: 'Discuss the latest in web dev, AI, and more.', members: '12.5k', icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-100', border: 'border-indigo-200/50' },
    { id: '2', name: 'Local Hikers', description: 'Explore trails and organize weekend trips.', members: '3.2k', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-100', border: 'border-emerald-200/50' },
    { id: '3', name: 'Startup Founders', description: 'Networking and advice for early-stage founders.', members: '8.9k', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-amber-200/50' },
  ];

  const suggestedCommunities = [
    { id: '4', name: 'Photography Lovers', description: 'Share tips, gear reviews, and your best shots.', members: '45k', icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-200/50' },
    { id: '5', name: 'React Developers', description: 'A community for all things React and Next.js.', members: '89k', icon: Users, color: 'text-[#5B9DFF]', bg: 'bg-blue-100', border: 'border-blue-200/50' },
    { id: '6', name: 'Digital Nomads', description: 'Work from anywhere and share your journey.', members: '21k', icon: Globe, color: 'text-rose-500', bg: 'bg-rose-100', border: 'border-rose-200/50' },
  ];

  const handleToggleJoin = (id: string) => {
    if (joinedCommunities.includes(id)) {
      setJoinedCommunities(joinedCommunities.filter((c) => c !== id));
    } else {
      setJoinedCommunities([...joinedCommunities, id]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full bg-slate-50 relative pb-24" // Extra padding for bottom nav
    >
      {/* Header */}
      <div className="flex-none pt-12 pb-4 px-4 bg-white shadow-sm z-10 sticky top-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Communities</h1>
          <button onClick={() => setIsCreateModalOpen(true)} className="w-10 h-10 rounded-full neu-raised flex items-center justify-center text-[#5B9DFF] hover:scale-105 transition-transform">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="neu-flat rounded-[20px] px-3.5 py-2.5 flex items-center gap-2.5 border border-slate-200/80 focus-within:ring-2 focus-within:ring-[#5B9DFF]/30 transition bg-white shadow-xs">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-8">
        
        {/* Trending Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Trending Now</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4">
            {trendingCommunities.map((community) => (
              <div key={community.id} className="min-w-[240px] bg-white neu-flat rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-tr ${community.bg} flex items-center justify-center shadow-inner border ${community.border}`}>
                    <community.icon className={`w-6 h-6 ${community.color}`} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{community.members}</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">{community.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{community.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShareCommunityTarget(community)}
                    className="p-2 rounded-xl bg-blue-50 text-[#5B9DFF] border border-blue-200/80 hover:bg-blue-100 transition flex items-center justify-center cursor-pointer"
                    title="Share Community"
                  >
                    <Share2 className="w-4 h-4 text-[#5B9DFF]" />
                  </button>
                  <button
                    onClick={() => handleToggleJoin(community.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                      joinedCommunities.includes(community.id)
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-[#5B9DFF] text-white shadow-md shadow-[#5B9DFF]/20 hover:bg-blue-600'
                    }`}
                  >
                    {joinedCommunities.includes(community.id) ? (
                      <>
                        <Check className="w-4 h-4" /> Joined
                      </>
                    ) : (
                      'Join Community'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suggested Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Suggested for You</h2>
          </div>
          <div className="space-y-3">
            {suggestedCommunities.map((community) => (
              <div key={community.id} className="flex items-center gap-3 p-3 bg-white neu-flat rounded-2xl border border-slate-200/60 shadow-sm">
                <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-tr ${community.bg} flex items-center justify-center flex-shrink-0 shadow-inner border ${community.border}`}>
                  <community.icon className={`w-5 h-5 ${community.color}`} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{community.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{community.members} members</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareCommunityTarget(community)}
                  className="p-1.5 rounded-xl bg-blue-50 text-[#5B9DFF] border border-blue-200/80 hover:bg-blue-100 transition flex items-center justify-center cursor-pointer flex-shrink-0"
                  title="Share Community"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#5B9DFF]" />
                </button>
                <button
                  onClick={() => handleToggleJoin(community.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 ${
                    joinedCommunities.includes(community.id)
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-[#5B9DFF]/10 text-[#5B9DFF] hover:bg-[#5B9DFF]/20'
                  }`}
                >
                  {joinedCommunities.includes(community.id) ? 'Joined' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
      {/* Create Modal */}
      <CreateCommunityModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Share Community Modal */}
      <ShareCommunityModal
        community={shareCommunityTarget}
        isOpen={shareCommunityTarget !== null}
        onClose={() => setShareCommunityTarget(null)}
      />
    </motion.div>
  );
};
