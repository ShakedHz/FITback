import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { StudioRole } from '@/data/scheduleTypes';
import {
  bindPendingArboxToUser,
  connectArboxAccount,
  disconnectArboxAccount,
  getDefaultWeekStart,
  moveArboxScope,
  setArboxStorageOwner,
  setLinkedInstructor,
  syncArboxSchedule,
} from '@/services/arboxApi';
import { signInWithApple, isAppleConfigured } from './apple';
import { signInWithGoogle, isGoogleConfigured } from './google';
import { createSessionToken, hashPassword, verifyPassword } from './password';
import type {
  ArboxLoginOutcome,
  AuthUser,
  LoginInput,
  ProfileDetailsInput,
  RegisterInput,
  StoredAccount,
} from './types';
import { bioFromSpecialties, TRAINING_TYPES, type TrainingType } from '@/data/trainingTypes';
import {
  accountToUser,
  clearSession,
  createId,
  findAccountByEmail,
  findAccountById,
  loadSession,
  lookupAccount,
  saveAccount,
  saveSession,
} from './userStore';
import {
  membershipsFromAccount,
  upsertMembership,
  type StudioMembership,
} from '@/data/studioOrg';
import {
  acceptInviteOnDevice,
  peekPendingInvite,
  takePendingInvite,
  type StudioInvitePayload,
} from './studioInvite';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  googleEnabled: boolean;
  appleEnabled: boolean;
  clearError: () => void;
  register: (input: RegisterInput) => Promise<AuthUser>;
  loginWithEmail: (input: LoginInput) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  loginWithApple: () => Promise<AuthUser>;
  loginWithArbox: (
    apiKey: string,
    linkedInstructorId?: string
  ) => Promise<ArboxLoginOutcome>;
  addStudioWithArbox: (
    apiKey: string,
    linkedInstructorId?: string
  ) => Promise<ArboxLoginOutcome>;
  switchStudio: (clubId: string) => void;
  acceptStudioInvite: (payload: StudioInvitePayload, options?: { allowEmailMismatch?: boolean }) => AuthUser;
  updateAvatar: (avatar: string | undefined) => void;
  updateProfileDetails: (input: ProfileDetailsInput) => void;
  logout: () => void;
}

export function hasInstructorProfile(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.specialties && user.specialties.length > 0);
}

export function canAccessApp(user: AuthUser | null | undefined): boolean {
  return Boolean(
    user &&
      (hasInstructorProfile(user) || user.arboxLinked || (user.memberships?.length ?? 0) > 0)
  );
}

function normalizeSpecialties(specialties: TrainingType[]): TrainingType[] {
  const next = [...new Set(specialties.filter((type) => TRAINING_TYPES.includes(type)))];
  return next;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_DAYS = 30;

function createSession(userId: string) {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  saveSession({
    userId,
    token: createSessionToken(),
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
}

function isPlaceholderEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@arbox.fitback.app');
}

function applyMembership(account: StoredAccount, membership: StudioMembership): StoredAccount {
  const memberships = upsertMembership(membershipsFromAccount(account), membership);
  return {
    ...account,
    memberships,
    activeStudioId: membership.clubId,
    role: membership.role,
    arboxClubId: membership.clubId,
    arboxStaffId: membership.staffId,
    updatedAt: new Date().toISOString(),
  };
}

function commitInvite(account: StoredAccount, payload: StudioInvitePayload): StoredAccount {
  const updated = applyMembership(account, {
    clubId: payload.clubId,
    clubName: payload.clubName,
    role: payload.role,
    staffId: payload.staffId,
    staffName: payload.staffName,
    joinedAt: new Date().toISOString(),
    source: 'invite',
  });
  acceptInviteOnDevice(payload, updated.id);
  return saveAccount(updated);
}

function consumePendingInvite(account: StoredAccount): StoredAccount {
  const pending = peekPendingInvite();
  if (!pending?.email || !pending.clubId) return account;
  const accountEmail = account.email.trim().toLowerCase();
  const inviteEmail = pending.email.trim().toLowerCase();
  if (accountEmail && accountEmail !== inviteEmail && !isPlaceholderEmail(accountEmail)) {
    return account;
  }
  takePendingInvite();
  return commitInvite(account, pending);
}

function persistAuth(account: StoredAccount): AuthUser {
  const next = consumePendingInvite(account);
  createSession(next.id);
  return accountToUser(next);
}

function upsertOAuthAccount(input: {
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'arbox';
  googleSub?: string;
  appleSub?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
  role?: StudioRole;
  arboxLinked?: boolean;
}): AuthUser {
  const existing = lookupAccount({
    provider: input.provider,
    email: input.email,
    googleSub: input.googleSub,
    appleSub: input.appleSub,
    arboxClubId: input.arboxClubId,
    arboxStaffId: input.arboxStaffId,
  });
  const email =
    input.email.trim().toLowerCase() ||
    existing?.email ||
    (input.appleSub ? `${input.appleSub}@privaterelay.appleid.com` : '');
  const name = input.name.trim() || existing?.name || email.split('@')[0] || 'Instructor';

  const now = new Date().toISOString();
  const account: StoredAccount = existing
    ? {
        ...existing,
        email,
        name,
        avatar: input.avatar || existing.avatar,
        provider: existing.provider === 'email' ? existing.provider : input.provider,
        role: input.role ?? existing.role,
        arboxLinked: input.arboxLinked ?? existing.arboxLinked,
        googleSub: input.googleSub ?? existing.googleSub,
        appleSub: input.appleSub ?? existing.appleSub,
        arboxClubId: input.arboxClubId ?? existing.arboxClubId,
        arboxStaffId: input.arboxStaffId ?? existing.arboxStaffId,
        updatedAt: now,
      }
    : {
        id: createId(input.provider),
        email,
        name,
        avatar: input.avatar,
        provider: input.provider,
        role: input.role ?? 'instructor',
        arboxLinked: input.arboxLinked ?? false,
        googleSub: input.googleSub,
        appleSub: input.appleSub,
        arboxClubId: input.arboxClubId,
        arboxStaffId: input.arboxStaffId,
        createdAt: now,
        updatedAt: now,
      };

  saveAccount(account);
  return persistAuth(account);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      const account = findAccountById(session.userId);
      if (account) setUser(accountToUser(account));
      else clearSession();
    }
    setIsReady(true);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const register = useCallback(async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const email = input.email.trim().toLowerCase();
      const name = input.name.trim();
      const password = input.password;

      const specialties = normalizeSpecialties(input.specialties);

      if (name.length < 2) throw new Error('Please enter your full name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      if (specialties.length === 0 && !peekPendingInvite()) {
        throw new Error('Choose at least one class type');
      }
      if (findAccountByEmail(email)) throw new Error('An account with this email already exists');

      const { hash, salt } = await hashPassword(password);
      const now = new Date().toISOString();
      const account: StoredAccount = {
        id: createId('email'),
        email,
        name,
        bio: bioFromSpecialties(specialties),
        specialties,
        provider: 'email',
        role: 'instructor',
        arboxLinked: false,
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
        updatedAt: now,
      };

      saveAccount(account);
      const authUser = persistAuth(account);
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (input: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const email = input.email.trim().toLowerCase();
      const account = findAccountByEmail(email);
      if (!account || !account.passwordHash || !account.passwordSalt) {
        throw new Error('Invalid email or password');
      }

      const ok = await verifyPassword(input.password, account.passwordHash, account.passwordSalt);
      if (!ok) throw new Error('Invalid email or password');

      createSession(account.id);
      const authUser = persistAuth(account);
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await signInWithGoogle();
      const authUser = upsertOAuthAccount({
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        provider: 'google',
        googleSub: profile.sub,
      });
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await signInWithApple();
      const authUser = upsertOAuthAccount({
        email: profile.emailFromApple ? profile.email : '',
        name: profile.name,
        provider: 'apple',
        appleSub: profile.sub,
      });
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithArbox = useCallback(async (
    apiKey: string,
    linkedInstructorId?: string
  ): Promise<ArboxLoginOutcome> => {
    setIsLoading(true);
    setError(null);
    try {
      const weekStart = getDefaultWeekStart();
      const { connection } = await connectArboxAccount(apiKey, undefined, weekStart, {
        linkedInstructorId,
      });
      const team = connection.team ?? [];
      const linked = linkedInstructorId || connection.linkedInstructorId;
      if (team.length > 1 && !linked) {
        return { kind: 'pick_instructor', team: team.map((m) => ({ id: m.id, name: m.name, role: m.role })) };
      }

      const bound = linked ? (setLinkedInstructor(linked) ?? connection) : connection;

      await syncArboxSchedule(bound, weekStart);

      const clubId = bound.clubId || '';
      const staffId = bound.linkedInstructorId || bound.staffId || '';
      const email = `${clubId || staffId || 'studio'}@arbox.fitback.app`;
      const authUser = upsertOAuthAccount({
        email,
        name: bound.staffName || bound.clubName,
        provider: 'arbox',
        role: bound.role,
        arboxLinked: true,
        arboxClubId: clubId || undefined,
        arboxStaffId: staffId || undefined,
      });
      const account = findAccountById(authUser.id);
      const withStudio = account
        ? saveAccount(
            applyMembership(account, {
              clubId,
              clubName: bound.clubName || authUser.name,
              role: bound.role,
              staffId: staffId || undefined,
              staffName: bound.staffName,
              joinedAt: new Date().toISOString(),
              source: 'arbox',
            })
          )
        : null;
      bindPendingArboxToUser(authUser.id, clubId || undefined);
      const nextUser = withStudio ? accountToUser(withStudio) : authUser;
      setUser(nextUser);
      return { kind: 'authenticated', user: nextUser };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arbox sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addStudioWithArbox = useCallback(async (
    apiKey: string,
    linkedInstructorId?: string
  ): Promise<ArboxLoginOutcome> => {
    if (!user) throw new Error('Sign in first to add a studio');
    const account = findAccountById(user.id);
    if (!account) throw new Error('Sign in first to add a studio');

    setIsLoading(true);
    setError(null);
    const previousClub = account.activeStudioId || account.arboxClubId || null;
    try {
      setArboxStorageOwner(account.id, { clubId: '_adding' });
      const weekStart = getDefaultWeekStart();
      const { connection } = await connectArboxAccount(apiKey, undefined, weekStart, {
        linkedInstructorId,
      });
      const team = connection.team ?? [];
      const linked = linkedInstructorId || connection.linkedInstructorId;
      if (team.length > 1 && !linked) {
        return { kind: 'pick_instructor', team: team.map((m) => ({ id: m.id, name: m.name, role: m.role })) };
      }

      const bound = linked ? (setLinkedInstructor(linked) ?? connection) : connection;
      const clubId = bound.clubId || '';
      if (!clubId) throw new Error('Arbox did not return a studio');
      moveArboxScope(account.id, '_adding', clubId);
      await syncArboxSchedule(bound, weekStart);

      const staffId = bound.linkedInstructorId || bound.staffId || '';
      const updated = saveAccount({
        ...applyMembership(account, {
          clubId,
          clubName: bound.clubName || clubId,
          role: bound.role,
          staffId: staffId || undefined,
          staffName: bound.staffName,
          joinedAt: new Date().toISOString(),
          source: 'arbox',
        }),
        arboxLinked: true,
      });
      const nextUser = accountToUser(updated);
      setUser(nextUser);
      return { kind: 'authenticated', user: nextUser };
    } catch (err) {
      if (previousClub) setArboxStorageOwner(account.id, { clubId: previousClub });
      else setArboxStorageOwner(account.id);
      const message = err instanceof Error ? err.message : 'Arbox sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const switchStudio = useCallback((clubId: string) => {
    setUser((current) => {
      if (!current) return current;
      const account = findAccountById(current.id);
      if (!account) return current;
      const memberships = membershipsFromAccount(account);
      const membership = memberships.find((m) => m.clubId === clubId);
      if (!membership) return current;
      const updated = saveAccount({
        ...account,
        memberships,
        activeStudioId: membership.clubId,
        role: membership.role,
        arboxClubId: membership.clubId,
        arboxStaffId: membership.staffId,
        updatedAt: new Date().toISOString(),
      });
      setArboxStorageOwner(updated.id, { clubId: membership.clubId });
      return accountToUser(updated);
    });
  }, []);

  const acceptStudioInvite = useCallback((
    payload: StudioInvitePayload,
    options?: { allowEmailMismatch?: boolean }
  ) => {
    if (!user) throw new Error('Sign in to join this studio');
    const account = findAccountById(user.id);
    if (!account) throw new Error('Sign in to join this studio');
    const accountEmail = account.email.trim().toLowerCase();
    const inviteEmail = payload.email.trim().toLowerCase();
    if (
      accountEmail &&
      accountEmail !== inviteEmail &&
      !isPlaceholderEmail(accountEmail) &&
      !options?.allowEmailMismatch
    ) {
      throw new Error('This invite is for a different email');
    }
    takePendingInvite();
    const updated = commitInvite(account, payload);
    const nextUser = accountToUser(updated);
    setUser(nextUser);
    setArboxStorageOwner(updated.id, { clubId: payload.clubId });
    return nextUser;
  }, [user]);

  const updateAvatar = useCallback((avatar: string | undefined) => {
    setUser((current) => {
      if (!current) return current;
      const account = findAccountById(current.id);
      if (!account) return current;

      const updated: StoredAccount = {
        ...account,
        avatar,
        updatedAt: new Date().toISOString(),
      };
      if (!avatar) delete updated.avatar;

      saveAccount(updated);
      return accountToUser(updated);
    });
  }, []);

  const updateProfileDetails = useCallback((input: ProfileDetailsInput) => {
    const specialties = normalizeSpecialties(input.specialties);
    if (specialties.length === 0) throw new Error('Choose at least one class type');

    setUser((current) => {
      if (!current) return current;
      const account = findAccountById(current.id);
      if (!account) return current;

      const updated: StoredAccount = {
        ...account,
        bio: bioFromSpecialties(specialties),
        specialties,
        updatedAt: new Date().toISOString(),
      };
      saveAccount(updated);
      return accountToUser(updated);
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    disconnectArboxAccount();
    setArboxStorageOwner(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      isLoading,
      error,
      googleEnabled: isGoogleConfigured(),
      appleEnabled: isAppleConfigured(),
      clearError,
      register,
      loginWithEmail,
      loginWithGoogle,
      loginWithApple,
      loginWithArbox,
      addStudioWithArbox,
      switchStudio,
      acceptStudioInvite,
      updateAvatar,
      updateProfileDetails,
      logout,
    }),
    [
      user,
      isReady,
      isLoading,
      error,
      clearError,
      register,
      loginWithEmail,
      loginWithGoogle,
      loginWithApple,
      loginWithArbox,
      addStudioWithArbox,
      switchStudio,
      acceptStudioInvite,
      updateAvatar,
      updateProfileDetails,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
