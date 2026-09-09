import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { ChatThread } from '../types';

interface ChatListProps {
  threads: ChatThread[];
  currentUserId: string;
  searchQuery?: string;
  onSelectThread: (threadId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  threads,
  currentUserId,
  searchQuery = '',
  onSelectThread,
}) => {
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const name = t.isGroup ? t.groupName : t.participant?.name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredThreads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pt-2">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">
        All Conversations
      </h2>
      {filteredThreads.map((thread) => {
        const isThreadUnread = Boolean(
          (thread.unreadCount && thread.unreadCount > 0) ||
          (thread.lastMessage && !thread.lastMessage.isRead && thread.lastMessage.senderId !== currentUserId)
        );

        return (
          <motion.div
            key={thread.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectThread(thread.id)}
            className={`flex items-center gap-4 p-4 rounded-3xl transition cursor-pointer border group ${
              isThreadUnread
                ? 'bg-blue-50/40 border-blue-100 hover:bg-white hover:shadow-md'
                : 'hover:bg-white hover:shadow-md border-transparent hover:border-slate-100'
            }`}
          >
            {/* User Avatar with Online Indicator and Unread Dot */}
            <div className="relative flex-shrink-0">
              <img
                src={
                  thread.isGroup
                    ? (thread.groupAvatar || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=150&auto=format&fit=crop&q=80')
                    : (thread.participant?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
                }
                alt={thread.isGroup ? thread.groupName : thread.participant?.name}
                className="w-14 h-14 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
              />
              {!thread.isGroup && thread.participant?.isOnline && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
              )}
              {/* Distinct red unread indicator dot on avatar */}
              {isThreadUnread && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-xs animate-pulse pointer-events-none" />
              )}
            </div>

            {/* Content & Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                  <h3 className={`text-sm font-bold truncate ${isThreadUnread ? 'text-slate-900' : 'text-slate-800'}`}>
                    {thread.isGroup ? thread.groupName : (thread.participant?.name || 'Contact')}
                  </h3>
                  {/* Distinct blue/red unread dot indicator next to individual chat item */}
                  {isThreadUnread && (
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs flex-shrink-0 animate-pulse"
                      title="Unread messages"
                    />
                  )}
                </div>
                <span className={`text-[10px] font-semibold flex-shrink-0 ${isThreadUnread ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                  {thread.lastMessage.timestamp}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-xs truncate pr-4 ${isThreadUnread ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>
                  {thread.lastMessage.text || (thread.lastMessage.isVoice ? 'Voice message' : 'Sent an attachment')}
                </p>
                {thread.unreadCount > 0 ? (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-red-200 flex-shrink-0">
                    {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                  </span>
                ) : isThreadUnread ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs flex-shrink-0 animate-pulse" />
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
