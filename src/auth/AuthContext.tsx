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
  isDemoApiKey,
  moveArboxScope,
  setArboxStorageOwner,
  removeArboxTeamMember,
  setLinkedInstructor,
  syncArboxSchedule,
  syncStoredConnectionRole,
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
  removeStudioMembershipFromAccounts,
  saveAccount,
  saveSession,
} from './userStore';
import {
  getActiveMembership,
  markStaffRemovedFromStudio,
  membershipsFromAccount,
  revokeStudioInvites,
  saveStaffEmail,
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
  activeMembership: StudioMembership | undefined;
  isActiveStudioManager: boolean;
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
  createDemoStudio: (name?: string) => Promise<AuthUser>;
  createLocalStudio: (name: string) => Promise<AuthUser>;
  switchStudio: (clubId: string) => void;
  switchStudioView: (clubId: string) => StudioMembership | undefined;
  removeStudioInstructor: (input: {
    clubId: string;
    name: string;
    email?: string;
    staffId?: string;
    inviteId?: string;
  }) => void;
  acceptStudioInvite: (payload: StudioInvitePayload) => AuthUser;
  updateAvatar: (avatar: string | undefined) => void;
  updateProfileDetails: (input: ProfileDetailsInput) => void;
  logout: () => void;
}

export function hasInstructorProfile(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.specialties && user.specialties.length > 0);
}

export function canAccessApp(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if ((user.memberships?.length ?? 0) > 0) return true;
  if (user.role === 'studio_manager') return true;
  if (user.arboxLinked) return true;
  return hasInstructorProfile(user);
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

export function homePathForMembership(_membership: StudioMembership): string {
  return '/dashboard';
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

      const pendingInvite = peekPendingInvite();
      const role = pendingInvite?.role ?? input.role ?? 'instructor';
      const specialties = normalizeSpecialties(input.specialties);

      if (name.length < 2) throw new Error('Please enter your full name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      if (pendingInvite?.email && email !== pendingInvite.email.trim().toLowerCase()) {
        throw new Error('This invite is for a different email');
      }
      if (
        role !== 'studio_manager' &&
        specialties.length === 0 &&
        !pendingInvite
      ) {
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
        role,
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
      const autoLinked =
        linkedInstructorId ??
        (isDemoApiKey(apiKey) ? 'staff-manager' : undefined);
      const { connection } = await connectArboxAccount(apiKey, undefined, weekStart, {
        linkedInstructorId: autoLinked,
      });
      const team = connection.team ?? [];
      const linked = autoLinked || connection.linkedInstructorId;
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
      const autoLinked =
        linkedInstructorId ??
        (isDemoApiKey(apiKey) ? 'staff-manager' : undefined);
      const { connection } = await connectArboxAccount(apiKey, undefined, weekStart, {
        linkedInstructorId: autoLinked,
      });
      const team = connection.team ?? [];
      const linked = autoLinked || connection.linkedInstructorId;
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

  const createDemoStudio = useCallback(async (name?: string) => {
    if (!user) throw new Error('Sign in first to add a studio');
    const account = findAccountById(user.id);
    if (!account) throw new Error('Sign in first to add a studio');

    setIsLoading(true);
    setError(null);
    try {
      const clubId = `demo-${createId('club').slice(5, 15)}`;
      const clubName = name?.trim() || `${account.name.split(' ')[0] || 'My'} Studio`;
      const apiKey = `demo-${clubId}`;
      setArboxStorageOwner(account.id, { clubId });
      const weekStart = getDefaultWeekStart();
      const { connection } = await connectArboxAccount(apiKey, undefined, weekStart, {
        linkedInstructorId: 'staff-manager',
        clubId,
        clubName,
      });
      const bound = setLinkedInstructor('staff-manager') ?? connection;
      await syncArboxSchedule(bound, weekStart);
      const staffId = bound.linkedInstructorId || bound.staffId || 'staff-manager';
      const updated = saveAccount({
        ...applyMembership(account, {
          clubId,
          clubName,
          role: bound.role,
          staffId,
          staffName: bound.staffName,
          joinedAt: new Date().toISOString(),
          source: 'arbox',
        }),
        arboxLinked: true,
      });
      bindPendingArboxToUser(updated.id, clubId);
      const nextUser = accountToUser(updated);
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create demo studio';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createLocalStudio = useCallback(async (name: string) => {
    if (!user) throw new Error('Sign in first to add a studio');
    const account = findAccountById(user.id);
    if (!account) throw new Error('Sign in first to add a studio');
    const clubName = name.trim();
    if (clubName.length < 2) throw new Error('Please enter a studio name');

    setIsLoading(true);
    setError(null);
    try {
      const clubId = `local-${createId('club').slice(5, 15)}`;
      const updated = saveAccount({
        ...applyMembership(account, {
          clubId,
          clubName,
          role: 'studio_manager',
          joinedAt: new Date().toISOString(),
          source: 'local',
        }),
      });
      setArboxStorageOwner(updated.id, { clubId });
      const nextUser = accountToUser(updated);
      setUser(nextUser);
      return nextUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create studio';
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
      syncStoredConnectionRole(membership.role);
      return accountToUser(updated);
    });
  }, []);

  const switchStudioView = useCallback((clubId: string): StudioMembership | undefined => {
    const account = user ? findAccountById(user.id) : undefined;
    if (!account) return undefined;
    const memberships = membershipsFromAccount(account);
    const membership = memberships.find((m) => m.clubId === clubId);
    if (!membership || membership.clubId === account.activeStudioId) return membership;

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
    syncStoredConnectionRole(membership.role);
    setUser(accountToUser(updated));
    return membership;
  }, [user]);

  const removeStudioInstructor = useCallback((input: {
    clubId: string;
    name: string;
    email?: string;
    staffId?: string;
    inviteId?: string;
  }) => {
    if (!user) throw new Error('Sign in required');
    const managerMembership = getActiveMembership(user);
    if (
      !managerMembership ||
      managerMembership.clubId !== input.clubId ||
      managerMembership.role !== 'studio_manager'
    ) {
      throw new Error('Only studio managers can remove instructors');
    }

    const normalizedEmail = input.email?.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail === user.email.trim().toLowerCase()) {
      throw new Error('Cannot remove yourself');
    }
    if (input.staffId && input.staffId === user.arboxStaffId) {
      throw new Error('Cannot remove yourself');
    }

    revokeStudioInvites(input.clubId, {
      email: normalizedEmail,
      staffId: input.staffId,
      inviteId: input.inviteId,
    });
    removeStudioMembershipFromAccounts(input.clubId, {
      email: normalizedEmail,
      staffId: input.staffId,
    });
    if (input.staffId) {
      markStaffRemovedFromStudio(input.clubId, input.staffId);
      saveStaffEmail(input.clubId, input.staffId, '');
      // Persist roster change so the team list / overview update immediately
      // and survive reload (demo reconnect also respects the removed list).
      removeArboxTeamMember(input.staffId);
    }
  }, [user]);

  const acceptStudioInvite = useCallback((payload: StudioInvitePayload) => {
    if (!user) throw new Error('Sign in to join this studio');
    const account = findAccountById(user.id);
    if (!account) throw new Error('Sign in to join this studio');
    const accountEmail = account.email.trim().toLowerCase();
    const inviteEmail = payload.email.trim().toLowerCase();
    // One profile ↔ one email: invite must match the signed-in account.
    if (
      accountEmail &&
      accountEmail !== inviteEmail &&
      !isPlaceholderEmail(accountEmail)
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

  const activeMembership = useMemo(
    () => (user ? getActiveMembership(user) : undefined),
    [user]
  );

  const isActiveStudioManager = activeMembership
    ? activeMembership.role === 'studio_manager'
    : user?.role === 'studio_manager';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      activeMembership,
      isActiveStudioManager,
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
      createDemoStudio,
      createLocalStudio,
      switchStudio,
      switchStudioView,
      removeStudioInstructor,
      acceptStudioInvite,
      updateAvatar,
      updateProfileDetails,
      logout,
    }),
    [
      user,
      activeMembership,
      isActiveStudioManager,
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
      createDemoStudio,
      createLocalStudio,
      switchStudio,
      switchStudioView,
      removeStudioInstructor,
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
