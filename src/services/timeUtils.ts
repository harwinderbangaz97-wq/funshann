import { Timestamp } from 'firebase/firestore';

/**
 * Safely parses any timestamp value (Firestore Timestamp, JS Date, ISO string, numeric ms/seconds, post ID)
 * into numeric milliseconds since Unix epoch.
 * Gracefully fallbacks to Date.now() without returning NaN or Invalid Date.
 */
export const parseTimestampToMs = (val: any): number => {
  if (val === null || val === undefined) {
    return Date.now();
  }

  // 1. Firebase Timestamp instance or duck-typed object with toMillis() / toDate()
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val?.toMillis === 'function') {
    try {
      const ms = val.toMillis();
      if (typeof ms === 'number' && !isNaN(ms) && ms > 0) return ms;
    } catch {
      // ignore
    }
  }
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
    } catch {
      // ignore
    }
  }

  // 2. Firestore Timestamp raw fields ({ seconds, nanoseconds } or { _seconds, _nanoseconds })
  if (typeof val?.seconds === 'number' && val.seconds > 0) {
    return Math.floor(val.seconds * 1000 + (val.nanoseconds ? val.nanoseconds / 1000000 : 0));
  }
  if (typeof val?._seconds === 'number' && val._seconds > 0) {
    return Math.floor(val._seconds * 1000 + (val._nanoseconds ? val._nanoseconds / 1000000 : 0));
  }

  // 3. JavaScript Date instance
  if (val instanceof Date) {
    const time = val.getTime();
    return !isNaN(time) ? time : Date.now();
  }

  // 4. Number (could be ms or seconds)
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return Date.now();
    // If it's in seconds (e.g. 10-digit number like 1757000000), convert to ms
    if (val < 10000000000) {
      return val * 1000;
    }
    return val;
  }

  // 5. String
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'Just now') {
      return Date.now();
    }

    // Check if string contains "post_1757000000" or similar
    if (trimmed.startsWith('post_')) {
      const parsedIdNum = parseInt(trimmed.replace('post_', ''), 10);
      if (!isNaN(parsedIdNum) && parsedIdNum > 1000000000) {
        return parsedIdNum < 10000000000 ? parsedIdNum * 1000 : parsedIdNum;
      }
    }

    // Try parsing pure numeric string
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 0) {
        return num < 10000000000 ? num * 1000 : num;
      }
    }

    // Try parsing ISO date string
    const parsedDate = Date.parse(trimmed);
    if (!isNaN(parsedDate) && parsedDate > 0) {
      return parsedDate;
    }

    // Handle relative strings like "5m ago", "2h ago", "1d ago"
    const relMatch = trimmed.match(/^(\d+)\s*(s|m|h|d|w|mo|y)\s*ago$/i);
    if (relMatch) {
      const count = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();
      const unitMultiplier: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        mo: 30 * 24 * 60 * 60 * 1000,
        y: 365 * 24 * 60 * 60 * 1000,
      };
      if (unitMultiplier[unit]) {
        return Date.now() - count * unitMultiplier[unit];
      }
    }
  }

  return Date.now();
};

/**
 * Converts any timestamp into standard 12-hour format with AM/PM (e.g., "02:30 PM", "10:15 AM").
 * Guarantees a clean, valid 12-hour time string without "Invalid Date".
 */
export const format12HourTime = (val: any): string => {
  const ms = parseTimestampToMs(val);
  try {
    const date = new Date(ms);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const fallback = new Date();
    return fallback.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
};

/**
 * Computes dynamic relative time (e.g., "Just now" for < 1 min, "5m ago", "2h ago", "1d ago", "2w ago")
 * based on the real time difference between Date.now() and the timestamp.
 */
export const formatRelativeTime = (val: any): string => {
  if (!val) return 'Just now';
  const ms = parseTimestampToMs(val);
  const now = Date.now();
  const diffMs = now - ms;

  // If created within the last 60 seconds (or slightly in future due to client clock offset)
  if (diffMs < 60 * 1000) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }

  const diffMonths = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }

  const diffYears = Math.floor(diffMs / (365 * 24 * 60 * 60 * 1000));
  return `${diffYears}y ago`;
};

/**
 * Returns formatted 12-hour time with optional date (e.g., "Today, 02:30 PM", "Yesterday, 10:15 AM", "Oct 12, 02:30 PM").
 */
export const formatDetailed12HourTime = (val: any): string => {
  const ms = parseTimestampToMs(val);
  const date = new Date(ms);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = format12HourTime(ms);

  if (isToday) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr}, ${timeStr}`;
};

/**
 * Formats a timestamp specifically for last seen display (e.g. "just now", "5m ago", "today at 02:30 PM", "yesterday at 10:15 AM", "3d ago", "Oct 12 at 02:30 PM").
 */
export const formatLastSeenTime = (val: any): string => {
  if (!val) return 'recently';
  const ms = parseTimestampToMs(val);
  const now = Date.now();
  const diffMs = Math.max(0, now - ms);

  // If under 1 minute
  if (diffMs < 60 * 1000) {
    return 'just now';
  }

  // If under 1 hour, show concise relative time like "5m ago"
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  // If today
  const date = new Date(ms);
  const nowDate = new Date(now);
  const isToday =
    date.getDate() === nowDate.getDate() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();

  const timeStr = format12HourTime(ms);

  if (isToday) {
    return `today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `yesterday at ${timeStr}`;
  }

  // If within the last 7 days
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Older
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr} at ${timeStr}`;
};

/**
 * Determines whether a user is genuinely online right now.
 * Validates both the isOnline boolean and heartbeat freshness (within 90 seconds).
 */
export const isUserOnline = (user?: { isOnline?: boolean; lastActive?: any; lastSeen?: any } | null): boolean => {
  if (!user || !user.isOnline) return false;
  const rawTime = user.lastActive ?? user.lastSeen;
  if (!rawTime) return false;
  const ms = parseTimestampToMs(rawTime);
  const now = Date.now();
  return (now - ms) <= 90 * 1000;
};

/**
 * Returns user presence status label for UI display:
 * - "online" if user is genuinely online
 * - "last seen [formatted time]" if offline with a known timestamp
 * - "offline" fallback if no user or no timestamp
 */
export const getUserPresenceLabel = (user?: { isOnline?: boolean; lastActive?: any; lastSeen?: any } | null): string => {
  if (!user) return 'offline';
  if (isUserOnline(user)) {
    return 'online';
  }
  const rawTime = user.lastActive ?? user.lastSeen;
  if (rawTime) {
    const formatted = formatLastSeenTime(rawTime);
    return `last seen ${formatted}`;
  }
  return 'offline';
};
