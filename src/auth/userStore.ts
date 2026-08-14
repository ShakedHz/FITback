import type { AuthSession, AuthUser, StoredAccount } from './types';

const USERS_KEY = 'movana_auth_users_v1';
const SESSION_KEY = 'movana_auth_session_v1';

function readUsers(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findAccountByEmail(email: string): StoredAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return readUsers().find((u) => u.email === normalized);
}

export function findAccountById(id: string): StoredAccount | undefined {
  return readUsers().find((u) => u.id === id);
}

export function findAccountByProvider(
  provider: StoredAccount['provider'],
  email: string
): StoredAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return readUsers().find((u) => u.provider === provider && u.email === normalized);
}

export function saveAccount(account: StoredAccount): StoredAccount {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === account.id);
  if (index >= 0) users[index] = account;
  else users.push(account);
  writeUsers(users);
  return account;
}

export function accountToUser(account: StoredAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatar: account.avatar,
    bio: account.bio,
    specialties: account.specialties,
    provider: account.provider,
    role: account.role,
    arboxLinked: account.arboxLinked,
    createdAt: account.createdAt,
  };
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function createId(prefix: string): string {
  // crypto.randomUUID() requires a secure context (HTTPS/localhost) — not available
  // when opening the app on a phone via http://192.168.x.x
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const id = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${id}`;
}
