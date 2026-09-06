import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  getDocsFromCache,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, ensureFirebaseAuth, handleFirestoreError, OperationType, uploadChatMediaToStorage } from './firebase';
import { blobToDataUrl } from '../utils/audioBlobUtils';
import { Message, VoiceNoteData, User, MessagePrivacyMode } from '../types';
import { parseTimestampToMs, format12HourTime } from './timeUtils';

/**
 * Chat ID Generation:
 * Always use const chatId = [currentUserId, recipientId].sort().join('_')
 */
export const getChatRoomId = (currentUserId: string, recipientId: string): string => {
  const uidA = (currentUserId || '').trim();
  const uidB = (recipientId || '').trim();
  if (!uidA || !uidB) return '';
  return [uidA, uidB].sort().join('_');
};

/**
 * Normalizes a raw Firestore message document into our typed Message interface
 */
export const normalizeMessage = (id: string, raw: any): Message => {
  const createdAt = parseTimestampToMs(raw?.createdAt || raw?.timestamp || id);
  const timestampStr = format12HourTime(createdAt);

  return {
    id: id || raw?.id || `m_${Date.now()}`,
    senderId: raw?.senderId || '',
    receiverId: raw?.receiverId || '',
    text: typeof raw?.text === 'string' ? raw.text : '',
    imageUrl: raw?.imageUrl || undefined,
    voiceNote: raw?.voiceNote || undefined,
    timestamp: timestampStr,
    isRead: Boolean(raw?.isRead),
    privacyMode: 'normal',
    createdAt,
    isForwarded: Boolean(raw?.isForwarded),
    forwardedFrom: raw?.forwardedFrom,
    reactions: Array.isArray(raw?.reactions) ? raw.reactions : [],
    isDelivered: raw?.isDelivered !== undefined ? raw.isDelivered : true,
  };
};

/**
 * Real-time listener for messages in chats/{chatId}/messages
 * Queries ordered by createdAt ascending
 */
export const subscribeToChatMessages = (
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  if (!chatId) return () => {};

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages: Message[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data({ serverTimestamps: 'estimate' });
          return normalizeMessage(docSnap.id, {
            ...data,
            isDelivered: !snapshot.metadata.hasPendingWrites,
          });
        });

        callback(messages);
      },
      async (error) => {
        console.warn(`Firestore subscribeToChatMessages (${chatId}) notice:`, error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const messages: Message[] = cacheSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return normalizeMessage(docSnap.id, {
              ...data,
              isDelivered: true,
            });
          });
          if (messages.length > 0) callback(messages);
        } catch {
          // Cache empty or fallback
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn(`Firestore subscribeToChatMessages (${chatId}) notice:`, err);
    return () => {};
  }
};

/**
 * Explicit Write to Firestore using addDoc:
 * Every message document in Firestore MUST have:
 * - text (string)
 * - senderId (string, containing auth.currentUser.uid)
 * - receiverId (string)
 * - createdAt (fieldValue serverTimestamp())
 */
export const addChatMessageToFirestore = async (
  chatId: string,
  messageData: {
    senderId: string;
    receiverId: string;
    text?: string;
    imageUrl?: string;
    voiceNote?: VoiceNoteData;
    isForwarded?: boolean;
    forwardedFrom?: string;
    privacyMode?: MessagePrivacyMode;
  }
): Promise<string> => {
  if (!chatId) throw new Error('Missing chatId for addChatMessageToFirestore');
  await ensureFirebaseAuth();

  const senderId = auth.currentUser?.uid || messageData.senderId;
  const receiverId = messageData.receiverId;
  const text = messageData.text || '';

  const messageObj: any = {
    text,
    senderId,
    receiverId,
    createdAt: serverTimestamp(),
    isRead: false,
    reactions: [],
  };

  if (messageData.imageUrl) {
    messageObj.imageUrl = messageData.imageUrl;
  }
  if (messageData.voiceNote) {
    let finalVoiceNote = { ...messageData.voiceNote };
    if (finalVoiceNote.audioUrl && finalVoiceNote.audioUrl.startsWith('blob:')) {
      try {
        const uploaded = await uploadChatMediaToStorage(senderId, chatId, finalVoiceNote.audioUrl, 'audio');
        if (uploaded && !uploaded.startsWith('blob:')) {
          finalVoiceNote.audioUrl = uploaded;
        } else {
          const res = await fetch(finalVoiceNote.audioUrl);
          const b = await res.blob();
          finalVoiceNote.audioUrl = await blobToDataUrl(b);
        }
      } catch (err) {
        console.warn('Voice upload error in addChatMessageToFirestore:', err);
      }
    }
    messageObj.voiceNote = finalVoiceNote;
  }
  if (messageData.isForwarded) {
    messageObj.isForwarded = true;
    if (messageData.forwardedFrom) {
      messageObj.forwardedFrom = messageData.forwardedFrom;
    }
  }

  // Perform ONLY addDoc on chats/{chatId}/messages
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const docRef = await addDoc(messagesRef, messageObj);

  // Update room parent document at chats/{chatId} for thread listings and previews
  const summaryText = messageObj.voiceNote
    ? `Voice note (0:${messageObj.voiceNote.durationSeconds < 10 ? '0' : ''}${messageObj.voiceNote.durationSeconds})`
    : messageObj.text || (messageObj.imageUrl ? 'Photo attachment' : '');

  const chatRoomRef = doc(db, 'chats', chatId);
  const participantIds = [senderId, receiverId].sort();
  await setDoc(
    chatRoomRef,
    {
      id: chatId,
      participantIds,
      participants: participantIds,
      lastMessage: {
        text: summaryText,
        imageUrl: messageObj.imageUrl || null,
        isVoice: !!messageObj.voiceNote,
        voiceDuration: messageObj.voiceNote?.durationSeconds || null,
        timestamp: format12HourTime(Date.now()),
        isRead: false,
        senderId,
      },
      updatedAt: serverTimestamp(),
      lastActivityMs: Date.now(),
    },
    { merge: true }
  ).catch(console.warn);

  return docRef.id;
};

/**
 * Sends a message in the 1-on-1 chat room: chats/{chatId}/messages
 */
export const sendChatMessage = async (
  senderId: string,
  receiverId: string,
  payload: {
    text?: string;
    imageUrl?: string;
    voiceNote?: VoiceNoteData;
    isForwarded?: boolean;
    forwardedFrom?: string;
    privacyMode?: MessagePrivacyMode;
  }
): Promise<string> => {
  const chatId = getChatRoomId(senderId, receiverId);
  return await addChatMessageToFirestore(chatId, {
    senderId,
    receiverId,
    ...payload,
  });
};

/**
 * Marks incoming messages as read in chats/{chatId}/messages/{messageId}
 */
export const markMessageAsReadInFirestore = async (
  chatId: string,
  messageId: string
): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!chatId || !messageId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      isRead: true,
      readAt: serverTimestamp(),
    }).catch(async () => {
      await setDoc(msgRef, { isRead: true }, { merge: true });
    });
  } catch (error) {
    console.warn('Error marking message as read in Firestore:', error);
  }
};

/**
 * Deletes a message in chats/{chatId}/messages/{messageId} upon user manual confirmation
 */
export const deleteChatMessageFromFirestore = async (
  chatId: string,
  messageId: string
): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!chatId || !messageId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (error) {
    console.warn('Error deleting message from Firestore:', error);
  }
};

/**
 * Toggles a message emoji reaction in chats/{chatId}/messages/{messageId}
 */
export const toggleMessageReactionInFirestore = async (
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  try {
    await ensureFirebaseAuth();
    if (!chatId || !messageId || !userId) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentReactions: Array<{ emoji: string; count: number; userIds: string[] }> =
      Array.isArray(data.reactions) ? [...data.reactions] : [];

    const existingIndex = currentReactions.findIndex((r) => r.emoji === emoji);

    if (existingIndex > -1) {
      const reaction = currentReactions[existingIndex];
      const hasUser = reaction.userIds.includes(userId);

      if (hasUser) {
        const nextUserIds = reaction.userIds.filter((id) => id !== userId);
        if (nextUserIds.length === 0) {
          currentReactions.splice(existingIndex, 1);
        } else {
          currentReactions[existingIndex] = {
            ...reaction,
            count: nextUserIds.length,
            userIds: nextUserIds,
          };
        }
      } else {
        currentReactions[existingIndex] = {
          ...reaction,
          count: reaction.count + 1,
          userIds: [...reaction.userIds, userId],
        };
      }
    } else {
      currentReactions.push({
        emoji,
        count: 1,
        userIds: [userId],
      });
    }

    await updateDoc(msgRef, {
      reactions: currentReactions,
    });
  } catch (error) {
    console.warn('Error toggling reaction in Firestore:', error);
  }
};

/**
 * Ensures or creates the main chat document at chats/{chatId} with participantIds: [user1Id, user2Id]
 */
export const createOrEnsureChatDocument = async (
  user1Id: string,
  user2Id: string,
  extraData?: {
    lastMessage?: any;
    participantsInfo?: Record<string, Partial<User>>;
  }
): Promise<string> => {
  const chatId = getChatRoomId(user1Id, user2Id);
  if (!chatId) return '';
  await ensureFirebaseAuth();
  const chatRoomRef = doc(db, 'chats', chatId);
  const participantIds = [user1Id, user2Id].sort();
  await setDoc(
    chatRoomRef,
    {
      id: chatId,
      participantIds,
      participants: participantIds,
      updatedAt: serverTimestamp(),
      lastActivityMs: Date.now(),
      ...(extraData?.lastMessage ? { lastMessage: extraData.lastMessage } : {}),
      ...(extraData?.participantsInfo ? { participantsInfo: extraData.participantsInfo } : {}),
    },
    { merge: true }
  ).catch(console.warn);
  return chatId;
};

/**
 * Real-time listener for all chat rooms in the chats collection
 */
export const subscribeToAllChatRooms = (
  callback: (rooms: Array<{ id: string; participantIds: string[]; participants: string[]; lastMessage?: any; updatedAt?: any }>) => void
): Unsubscribe => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rooms: Array<{ id: string; participantIds: string[]; participants: string[]; lastMessage?: any; updatedAt?: any }> = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const pIds = Array.isArray(data.participantIds)
              ? data.participantIds
              : Array.isArray(data.participants)
              ? data.participants
              : [];
            rooms.push({
              id: docSnap.id,
              participantIds: pIds,
              participants: pIds,
              lastMessage: data.lastMessage,
              updatedAt: data.updatedAt,
            });
          }
        });
        callback(rooms);
      },
      async (error) => {
        console.warn('Firestore subscribeToAllChatRooms notice:', error?.message || error);
        try {
          const cacheSnap = await getDocsFromCache(q);
          const rooms: Array<{ id: string; participantIds: string[]; participants: string[]; lastMessage?: any; updatedAt?: any }> = [];
          cacheSnap.forEach((docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const pIds = Array.isArray(data.participantIds)
                ? data.participantIds
                : Array.isArray(data.participants)
                ? data.participants
                : [];
              rooms.push({
                id: docSnap.id,
                participantIds: pIds,
                participants: pIds,
                lastMessage: data.lastMessage,
                updatedAt: data.updatedAt,
              });
            }
          });
          if (rooms.length > 0) callback(rooms);
        } catch {
          // Cache empty or fallback
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscribeToAllChatRooms notice:', err);
    return () => {};
  }
};

/**
 * Updates the user's typing state in chats/{chatId}
 */
export const setTypingStatusInFirestore = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  if (!chatId || !userId) return;
  try {
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(
      chatRef,
      {
        typing: {
          [userId]: isTyping,
        },
        typingTimestamps: {
          [userId]: isTyping ? Date.now() : 0,
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Error setting typing status in Firestore:', error);
  }
};

/**
 * Real-time listener for typing status in a specific chat room
 */
export const subscribeToChatTypingStatus = (
  chatId: string,
  currentUserId: string,
  callback: (isOtherUserTyping: boolean, typingUserIds: string[]) => void
): Unsubscribe => {
  if (!chatId) return () => {};
  try {
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(
      chatRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(false, []);
          return;
        }
        const data = snapshot.data();
        const typingMap = data.typing || {};
        const timestampsMap = data.typingTimestamps || {};
        const now = Date.now();

        // Check which participants other than currentUserId are actively typing
        const typingUserIds: string[] = [];
        for (const [uid, typingState] of Object.entries(typingMap)) {
          if (uid !== currentUserId && typingState === true) {
            const timestamp = (timestampsMap as Record<string, number>)[uid];
            if (!timestamp || now - timestamp < 15000) {
              typingUserIds.push(uid);
            }
          }
        }
        callback(typingUserIds.length > 0, typingUserIds);
      },
      (error) => {
        console.warn('Error listening to chat typing status:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error subscribing to chat typing status:', err);
    return () => {};
  }
};

