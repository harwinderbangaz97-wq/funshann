import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Message } from '../types';

interface UseRealtimeMessagesOptions {
  chatId: string;
  currentUserId: string;
  recipientId: string;
  messageLimit?: number;
}

export function useRealtimeMessages({
  chatId,
  currentUserId,
  recipientId,
  messageLimit = 100,
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscribe in real-time with onSnapshot using proper indexed query
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    // Query messages with proper indexing
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const msgs: Message[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data({ serverTimestamps: 'estimate' });
          let createdAtMs = Date.now();
          if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
            createdAtMs = data.createdAt.toMillis();
          } else if (data.timestamp && typeof data.timestamp.toMillis === 'function') {
            createdAtMs = data.timestamp.toMillis();
          } else if (typeof data.createdAt === 'number') {
            createdAtMs = data.createdAt;
          }

          const images = Array.isArray(data.images)
            ? data.images
            : (Array.isArray(data.mediaUrls)
              ? data.mediaUrls
              : (data.imageUrl ? [data.imageUrl] : []));

          return {
            id: docSnap.id,
            text: typeof data.text === 'string' ? data.text : '',
            senderId: data.senderId || '',
            receiverId: data.receiverId || '',
            createdAt: createdAtMs,
            timestamp: data.timestamp && typeof data.timestamp === 'string' ? data.timestamp : new Date(createdAtMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            imageUrl: data.imageUrl || (images.length > 0 ? images[0] : undefined),
            images: images.length > 0 ? images : undefined,
            mediaUrls: images.length > 0 ? images : undefined,
            voiceNote: data.voiceNote,
            isRead: Boolean(data.isRead || data.status === 'read'),
            reactions: Array.isArray(data.reactions) ? data.reactions : [],
            isDelivered: data.isDelivered !== undefined ? Boolean(data.isDelivered) : (data.status === 'delivered' || data.status === 'read' || false),
            status: data.status || (Boolean(data.isRead || data.status === 'read') ? 'read' : ((data.isDelivered !== undefined ? Boolean(data.isDelivered) : (data.status === 'delivered' || data.status === 'read' || false)) ? 'delivered' : 'sent')),
            isForwarded: Boolean(data.isForwarded),
            forwardedFrom: data.forwardedFrom,
          } as Message;
        }).reverse(); // Ascending chronological order

        // Deduplicate incoming messages with any still-pending optimistic messages
        setMessages((prev) => {
          const confirmedIds = new Set(msgs.map((m) => m.id));
          const pendingOptimistic = prev.filter(
            (m) =>
              m.id.startsWith('opt_') &&
              !confirmedIds.has(m.id) &&
              !msgs.some(
                (rm) =>
                  rm.senderId === m.senderId &&
                  ((m.text && rm.text === m.text) || (m.voiceNote && rm.voiceNote)) &&
                  Math.abs((rm.createdAt || 0) - (m.createdAt || 0)) < 15000
              )
          );
          return [...msgs, ...pendingOptimistic];
        });
        setLoading(false);
      },
      (error) => {
        console.warn('Realtime messages listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, messageLimit]);

  // Optimistic message sender with 0ms perceived latency
  const sendMessage = useCallback(
    async (text: string, mediaUrls?: string[]) => {
      if (!text.trim() && (!mediaUrls || mediaUrls.length === 0)) return;
      if (!chatId) return;

      const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      // 1. Optimistically append message to local state immediately
      const optimisticMsg: Message = {
        id: optimisticId,
        text: text.trim(),
        senderId: currentUserId,
        receiverId: recipientId,
        createdAt: now,
        timestamp: timeStr,
        imageUrl: mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : undefined,
        images: mediaUrls,
        mediaUrls,
        isRead: false,
        reactions: [],
        isDelivered: false,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // 2. Perform background write to Firestore
      try {
        const messageObj: any = {
          text: text.trim(),
          senderId: currentUserId,
          receiverId: recipientId,
          chatId,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          isRead: false,
          reactions: [],
        };

        if (mediaUrls && mediaUrls.length > 0) {
          messageObj.imageUrl = mediaUrls[0];
          messageObj.images = mediaUrls;
          messageObj.mediaUrls = mediaUrls;
        }

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        await addDoc(messagesRef, messageObj);

        // Update parent chat room metadata
        const chatRoomRef = doc(db, 'chats', chatId);
        const participantIds = [currentUserId, recipientId].sort();
        await setDoc(
          chatRoomRef,
          {
            id: chatId,
            participantIds,
            participants: participantIds,
            lastMessage: {
              text: text.trim() || 'Media attachment',
              imageUrl: mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null,
              timestamp: timeStr,
              isRead: false,
              senderId: currentUserId,
            },
            updatedAt: serverTimestamp(),
            lastActivityMs: now,
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to send message to Firestore:', err);
      }
    },
    [chatId, currentUserId, recipientId]
  );

  // Automatically mark unread messages as read when viewing the chat
  const markAsRead = useCallback(async () => {
    if (!chatId || !currentUserId) return;
    try {
      const chatRoomRef = doc(db, 'chats', chatId);
      await updateDoc(chatRoomRef, {
        'lastMessage.isRead': true,
        unreadCount: 0,
      });
    } catch {
      // ignore
    }
  }, [chatId, currentUserId]);

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
  };
}
