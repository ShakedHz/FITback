import { findStoredAccount } from './accountLookup';
import type { AuthProvider, AuthSession, AuthUser, StoredAccount } from './types';
import { activeStudioRole, membershipsFromAccount } from '@/data/studioOrg';

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

export function lookupAccount(query: {
  provider: AuthProvider;
  email?: string;
  googleSub?: string;
  appleSub?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
}): StoredAccount | undefined {
  return findStoredAccount(readUsers(), query);
}

export function saveAccount(account: StoredAccount): StoredAccount {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === account.id);
  if (index >= 0) users[index] = account;
  else users.push(account);
  writeUsers(users);
  return account;
}

/** Drop instructor membership for a studio (managers are never removed here). */
export function removeStudioMembershipFromAccounts(
  clubId: string,
  match: { email?: string; staffId?: string }
): void {
  const normalizedEmail = match.email?.trim().toLowerCase();
  const users = readUsers().map((account) => {
    const memberships = membershipsFromAccount(account);
    const shouldRemove = memberships.some((m) => {
      if (m.clubId !== clubId || m.role !== 'instructor') return false;
      if (match.staffId && m.staffId === match.staffId) return true;
      if (normalizedEmail && account.email.trim().toLowerCase() === normalizedEmail) return true;
      return false;
    });
    if (!shouldRemove) return account;

    const nextMemberships = memberships.filter((m) => {
      if (m.clubId !== clubId || m.role !== 'instructor') return true;
      if (match.staffId && m.staffId === match.staffId) return false;
      if (normalizedEmail && account.email.trim().toLowerCase() === normalizedEmail) return false;
      return true;
    });

    const next: StoredAccount = {
      ...account,
      memberships: nextMemberships,
      updatedAt: new Date().toISOString(),
    };

    if (account.activeStudioId === clubId) {
      const fallback = nextMemberships[0];
      if (fallback) {
        next.activeStudioId = fallback.clubId;
        next.role = fallback.role;
        next.arboxClubId = fallback.clubId;
        next.arboxStaffId = fallback.staffId;
      } else {
        delete next.activeStudioId;
        delete next.arboxClubId;
        delete next.arboxStaffId;
      }
    }

    return next;
  });
  writeUsers(users);
}

export function accountToUser(account: StoredAccount): AuthUser {
  const memberships = membershipsFromAccount(account);
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    avatar: account.avatar,
    bio: account.bio,
    specialties: account.specialties,
    provider: account.provider,
    role: activeStudioRole(account),
    arboxLinked: account.arboxLinked,
    googleSub: account.googleSub,
    appleSub: account.appleSub,
    arboxClubId: account.arboxClubId,
    arboxStaffId: account.arboxStaffId,
    memberships,
    activeStudioId: account.activeStudioId || memberships[0]?.clubId,
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
