import type { StudioRole } from '@/data/scheduleTypes';
import type { TrainingType } from '@/data/trainingTypes';
import type { StudioMembership } from '@/data/studioOrg';

export type AuthProvider = 'email' | 'google' | 'apple' | 'arbox';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  specialties?: TrainingType[];
  provider: AuthProvider;
  role: StudioRole;
  arboxLinked: boolean;
  googleSub?: string;
  appleSub?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
  memberships: StudioMembership[];
  activeStudioId?: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredAccount {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  specialties?: TrainingType[];
  provider: AuthProvider;
  role: StudioRole;
  arboxLinked: boolean;
  googleSub?: string;
  appleSub?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
  memberships?: StudioMembership[];
  activeStudioId?: string;
  /** PBKDF2 hash — only for email accounts */
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  specialties: TrainingType[];
  role?: StudioRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProfileDetailsInput {
  specialties: TrainingType[];
}

export type ArboxLoginOutcome =
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'pick_instructor'; team: { id: string; name: string; role: StudioRole }[] };
