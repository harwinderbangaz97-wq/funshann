import {
  PublicProfileSettings,
  PrivacyControlsSettings,
  WhoCanContactSettings,
  BlockedUserItem,
} from '../types';
import { db, auth } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

const STORAGE_PUBLIC_PROFILE = 'funshann_public_profile_settings';
const STORAGE_PRIVACY_CONTROLS = 'funshann_privacy_controls_settings';
const STORAGE_WHO_CAN_CONTACT = 'funshann_who_can_contact_settings';
const STORAGE_MESSAGING_PRIVACY = 'funshann_messaging_privacy';
const STORAGE_BLOCKED_USERS = 'funshann_blocked_users';
const STORAGE_SAVED_LOGIN = 'funshann_saved_login_enabled';
const STORAGE_CONTACT_SYNC = 'funshann_contact_sync_enabled';

export const DEFAULT_PUBLIC_PROFILE_SETTINGS: PublicProfileSettings = {
  showEmail: false,
  showPhone: false,
  showBirthday: true,
  showFollowersList: true,
  showLikedPosts: false,
  allowSearchIndexing: true,
};

export const DEFAULT_PRIVACY_CONTROLS: PrivacyControlsSettings = {
  isPrivateAccount: false,
  whoCanMention: 'everyone',
  whoCanTag: 'everyone',
  allowStoryReshare: true,
  allowStoryReplies: 'everyone',
  showActivityIndicator: true,
  readReceiptsEnabled: true,
};

export const DEFAULT_WHO_CAN_CONTACT: WhoCanContactSettings = {
  directMessages: 'everyone',
  voiceNotes: 'everyone',
  filterSpamRequests: true,
  allowGroupInvites: 'following',
};

export const INITIAL_BLOCKED_USERS: BlockedUserItem[] = [];

// Public Profile Settings
export const getPublicProfileSettings = (): PublicProfileSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_PUBLIC_PROFILE);
    if (saved) return { ...DEFAULT_PUBLIC_PROFILE_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_PUBLIC_PROFILE_SETTINGS;
};

export const savePublicProfileSettings = (settings: PublicProfileSettings): void => {
  try {
    localStorage.setItem(STORAGE_PUBLIC_PROFILE, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
};

// Privacy Controls Settings
export const getPrivacyControls = (): PrivacyControlsSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_PRIVACY_CONTROLS);
    if (saved) return { ...DEFAULT_PRIVACY_CONTROLS, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_PRIVACY_CONTROLS;
};

export const savePrivacyControls = (controls: PrivacyControlsSettings): void => {
  try {
    localStorage.setItem(STORAGE_PRIVACY_CONTROLS, JSON.stringify(controls));
  } catch (e) {
    console.error(e);
  }
};

// Who Can Contact Settings
export const getWhoCanContact = (): WhoCanContactSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_WHO_CAN_CONTACT);
    if (saved) return { ...DEFAULT_WHO_CAN_CONTACT, ...JSON.parse(saved) };
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_WHO_CAN_CONTACT;
};

export const getMessagingPrivacy = (): 'everyone' | 'followers_only' | 'disabled' => {
  try {
    const saved = localStorage.getItem(STORAGE_MESSAGING_PRIVACY);
    if (saved === 'everyone' || saved === 'followers_only' || saved === 'disabled') {
      return saved;
    }
    const whoContact = getWhoCanContact();
    if (whoContact.directMessages === 'following') return 'followers_only';
    if (whoContact.directMessages === 'nobody') return 'disabled';
    return 'everyone';
  } catch {
    return 'everyone';
  }
};

export const saveMessagingPrivacy = async (
  privacy: 'everyone' | 'followers_only' | 'disabled',
  targetUid?: string
): Promise<void> => {
  try {
    localStorage.setItem(STORAGE_MESSAGING_PRIVACY, privacy);

    // Sync WhoCanContactSettings
    const currentWho = getWhoCanContact();
    const directMessagesVal =
      privacy === 'followers_only' ? 'following' : privacy === 'disabled' ? 'nobody' : 'everyone';
    saveWhoCanContact({ ...currentWho, directMessages: directMessagesVal });

    // Sync Firestore doc
    const uid = targetUid || auth.currentUser?.uid;
    if (uid) {
      await updateDoc(doc(db, 'users', uid), { messagingPrivacy: privacy });
    }
  } catch (e) {
    console.error('Error saving messaging privacy:', e);
  }
};

export const saveWhoCanContact = (settings: WhoCanContactSettings, targetUid?: string): void => {
  try {
    localStorage.setItem(STORAGE_WHO_CAN_CONTACT, JSON.stringify(settings));
    const mappedPrivacy: 'everyone' | 'followers_only' | 'disabled' =
      settings.directMessages === 'following'
        ? 'followers_only'
        : settings.directMessages === 'nobody'
        ? 'disabled'
        : 'everyone';
    localStorage.setItem(STORAGE_MESSAGING_PRIVACY, mappedPrivacy);

    const uid = targetUid || auth.currentUser?.uid;
    if (uid) {
      updateDoc(doc(db, 'users', uid), { messagingPrivacy: mappedPrivacy }).catch(console.warn);
    }
  } catch (e) {
    console.error(e);
  }
};

// Blocked Users
export const getBlockedUsers = (): BlockedUserItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_BLOCKED_USERS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_BLOCKED_USERS;
};

export const saveBlockedUsers = (users: BlockedUserItem[]): void => {
  try {
    localStorage.setItem(STORAGE_BLOCKED_USERS, JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
};

export const unblockUser = (userId: string): BlockedUserItem[] => {
  const current = getBlockedUsers();
  const updated = current.filter((u) => u.userId !== userId && u.id !== userId);
  saveBlockedUsers(updated);
  return updated;
};

// Saved Login
export const getSavedLoginEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_SAVED_LOGIN);
    return saved !== null ? JSON.parse(saved) : true;
  } catch {
    return true;
  }
};

export const saveSavedLoginEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_SAVED_LOGIN, JSON.stringify(enabled));
  } catch (e) {
    console.error(e);
  }
};

// Contact Sync
export const getContactSyncEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(STORAGE_CONTACT_SYNC);
    return saved !== null ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
};

export const saveContactSyncEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(STORAGE_CONTACT_SYNC, JSON.stringify(enabled));
  } catch (e) {
    console.error(e);
  }
};
