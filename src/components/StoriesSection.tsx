import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Story, User } from '../types';

interface StoriesSectionProps {
  stories: Story[];
  currentUser: User;
  onSelectStory: (index: number) => void;
  onAddStory: () => void;
}

const StoriesSectionComponent: React.FC<StoriesSectionProps> = ({
  stories,
  currentUser,
  onSelectStory,
  onAddStory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const myAvatar =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  const currentUserStoryIndex = stories.findIndex(
    (s) => s.userId === currentUser?.id || s.user?.id === currentUser?.id
  );
  const hasUserStory = currentUserStoryIndex !== -1;

  return (
    <section className="w-full py-2">
      <div
        ref={scrollRef}
        className="flex items-center gap-4 px-5 overflow-x-auto no-scrollbar scroll-smooth py-2"
      >
        {/* First Card: Your Story / Add Story */}
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
          onClick={() => {
            if (hasUserStory) {
              onSelectStory(currentUserStoryIndex);
            } else {
              onAddStory();
            }
          }}
        >
          <div
            className={`relative w-[72px] h-[72px] rounded-full p-1 flex items-center justify-center transition-all group-hover:shadow-lg ${
              hasUserStory
                ? 'bg-gradient-to-tr from-[#9333EA] via-purple-500 to-fuchsia-500 p-[2.5px]'
                : 'neu-raised p-1'
            }`}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
              <img
                src={myAvatar}
                alt="Your Story"
                loading="lazy"
                decoding="async"
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors" />
            </div>

            {/* Plus Icon Badge */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onAddStory();
              }}
              className="absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-full bg-[#9333EA] text-white flex items-center justify-center shadow-md ring-2 ring-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              title="Add story"
            >
              <Plus className="w-4.5 h-4.5 stroke-[3]" />
            </div>
          </div>
          <span className="mt-2 text-[12.5px] font-semibold text-slate-700 tracking-tight">
            Your Story
          </span>
        </motion.div>

        {/* Stories from following users */}
        {stories.map((story, index) => {
          // If this is the current user's story, skip here since it's displayed as "Your Story"
          if (story.userId === currentUser?.id || story.user?.id === currentUser?.id) {
            return null;
          }
          const storyUser: User = story.user || {
            id: story.userId || 'story_user',
            name: 'Story User',
            username: 'user',
            avatar:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
          };
          const storyAvatar =
            storyUser.avatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
          const storyUsername = (storyUser.username || 'user').split('.')[0];

          return (
            <motion.div
              key={story.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
              onClick={() => onSelectStory(index)}
            >
              {/* Floating circular profile card with electric purple border */}
              <div
                className={`relative w-[72px] h-[72px] rounded-full p-[3px] transition-all duration-300 ${
                  story.isSeen
                    ? 'neu-flat p-[3px] border border-slate-200'
                    : 'neu-raised bg-gradient-to-tr from-[#9333EA] to-[#C084FC] p-[2.5px]'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                  <img
                    src={storyAvatar}
                    alt={storyUser.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Small Username Below */}
              <span className="mt-2 text-[12.5px] font-semibold text-slate-600 max-w-[68px] truncate text-center group-hover:text-[#9333EA] transition-colors">
                {storyUsername}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export const StoriesSection = React.memo(StoriesSectionComponent);
