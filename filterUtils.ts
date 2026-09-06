import { User } from './src/types';

export function filterAndDeduplicateUsers(users: User[]): User[] {
  const emailMap = new Map<string, User>();
  const usernameMap = new Map<string, User>();
  const result: User[] = [];

  for (const u of users) {
    if (!u || !u.id) continue;
    
    // 1. Identify Demo users
    const isDemo = 
      u.email?.toLowerCase().includes('example.com') ||
      u.email?.toLowerCase().includes('demo') ||
      u.email?.toLowerCase().includes('test') ||
      u.username?.toLowerCase().includes('demo') ||
      u.username?.toLowerCase().includes('test') ||
      u.name?.toLowerCase().includes('demo') ||
      u.name?.toLowerCase().includes('test') ||
      (u.name && u.name.includes('Mock')) ||
      (u.username && u.username.includes('mock'));

    if (isDemo) continue;

    // 2. Identify duplicates by email
    if (u.email) {
      const email = u.email.toLowerCase();
      if (emailMap.has(email)) continue;
      emailMap.set(email, u);
    }

    // 3. Identify duplicates by username
    if (u.username) {
      const username = u.username.toLowerCase();
      if (usernameMap.has(username)) continue;
      usernameMap.set(username, u);
    }

    result.push(u);
  }
  return result;
}
