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
import { connectArboxAccount, disconnectArboxAccount, getDefaultWeekStart, syncArboxSchedule } from '@/services/arboxApi';
import { signInWithApple, isAppleConfigured } from './apple';
import { signInWithGoogle, isGoogleConfigured } from './google';
import { createSessionToken, hashPassword, verifyPassword } from './password';
import type { AuthUser, LoginInput, ProfileDetailsInput, RegisterInput, StoredAccount } from './types';
import { bioFromSpecialties, type TrainingType } from '@/data/trainingTypes';
import {
  accountToUser,
  clearSession,
  createId,
  findAccountByEmail,
  findAccountById,
  findAccountByProvider,
  loadSession,
  saveAccount,
  saveSession,
} from './userStore';

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
  loginWithArbox: (apiKey: string, role?: StudioRole) => Promise<AuthUser>;
  updateAvatar: (avatar: string | undefined) => void;
  updateProfileDetails: (input: ProfileDetailsInput) => void;
  logout: () => void;
}

export function hasInstructorProfile(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.specialties && user.specialties.length > 0);
}

function normalizeSpecialties(specialties: TrainingType[]): TrainingType[] {
  return [...new Set(specialties)];
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

function upsertOAuthAccount(input: {
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'arbox';
  role?: StudioRole;
  arboxLinked?: boolean;
}): AuthUser {
  const email = input.email.trim().toLowerCase();
  const existing =
    findAccountByProvider(input.provider, email) || findAccountByEmail(email);

  const now = new Date().toISOString();
  const account: StoredAccount = existing
    ? {
        ...existing,
        name: input.name || existing.name,
        avatar: input.avatar || existing.avatar,
        provider: existing.provider === 'email' ? existing.provider : input.provider,
        role: input.role ?? existing.role,
        arboxLinked: input.arboxLinked ?? existing.arboxLinked,
        updatedAt: now,
      }
    : {
        id: createId(input.provider),
        email,
        name: input.name,
        avatar: input.avatar,
        provider: input.provider,
        role: input.role ?? 'instructor',
        arboxLinked: input.arboxLinked ?? false,
        createdAt: now,
        updatedAt: now,
      };

  saveAccount(account);
  createSession(account.id);
  return accountToUser(account);
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
      if (specialties.length === 0) throw new Error('Choose at least one class type');
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
      createSession(account.id);
      const authUser = accountToUser(account);
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
      const authUser = accountToUser(account);
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
        email: profile.email,
        name: profile.name,
        provider: 'apple',
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

  const loginWithArbox = useCallback(async (apiKey: string, role: StudioRole = 'studio_manager') => {
    setIsLoading(true);
    setError(null);
    try {
      const weekStart = getDefaultWeekStart();
      const { connection } = await connectArboxAccount(apiKey, role, weekStart);
      await syncArboxSchedule(connection, weekStart);

      const email = `${connection.clubId || connection.staffId}@arbox.movana.app`;
      const authUser = upsertOAuthAccount({
        email,
        name: connection.clubName || connection.staffName,
        provider: 'arbox',
        role,
        arboxLinked: true,
      });
      setUser(authUser);
      return authUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Arbox sign-in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
