import type { StudioRole } from '@/data/scheduleTypes';

export type StudioJoinSource = 'arbox' | 'invite' | 'local';

export interface StudioMembership {
  clubId: string;
  clubName: string;
  role: StudioRole;
  staffId?: string;
  staffName?: string;
  joinedAt: string;
  source: StudioJoinSource;
}

export type StudioInviteStatus = 'pending' | 'accepted';

export interface StudioInvite {
  id: string;
  clubId: string;
  clubName: string;
  email: string;
  name: string;
  staffId?: string;
  staffName?: string;
  role: StudioRole;
  invitedByName: string;
  createdAt: string;
  status: StudioInviteStatus;
  acceptedUserId?: string;
}

const INVITES_KEY = 'movana_studio_invites_v1';
const STAFF_EMAILS_KEY = 'movana_studio_staff_emails_v1';
const REMOVED_STAFF_KEY = 'movana_studio_removed_staff_v1';

type StaffEmailMap = Record<string, Record<string, string>>;
type RemovedStaffMap = Record<string, string[]>;

function readInvites(): StudioInvite[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioInvite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvites(invites: StudioInvite[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
}

function readStaffEmails(): StaffEmailMap {
  try {
    const raw = localStorage.getItem(STAFF_EMAILS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StaffEmailMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStaffEmails(map: StaffEmailMap) {
  localStorage.setItem(STAFF_EMAILS_KEY, JSON.stringify(map));
}

function readRemovedStaff(): RemovedStaffMap {
  try {
    const raw = localStorage.getItem(REMOVED_STAFF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RemovedStaffMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeRemovedStaff(map: RemovedStaffMap) {
  localStorage.setItem(REMOVED_STAFF_KEY, JSON.stringify(map));
}

export function upsertMembership(
  memberships: StudioMembership[] | undefined,
  next: StudioMembership
): StudioMembership[] {
  const current = memberships ?? [];
  const without = current.filter((m) => m.clubId !== next.clubId);
  return [...without, next];
}

export function membershipsFromAccount(input: {
  memberships?: StudioMembership[];
  arboxClubId?: string;
  arboxStaffId?: string;
  role: StudioRole;
  name: string;
  createdAt: string;
}): StudioMembership[] {
  if (input.memberships?.length) return input.memberships;
  if (!input.arboxClubId) return [];
  return [
    {
      clubId: input.arboxClubId,
      clubName: input.name,
      role: input.role,
      staffId: input.arboxStaffId,
      joinedAt: input.createdAt,
      source: 'arbox',
    },
  ];
}

export function getActiveMembership(input: {
  memberships?: StudioMembership[];
  activeStudioId?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
  role: StudioRole;
  name: string;
  createdAt: string;
}): StudioMembership | undefined {
  const memberships = membershipsFromAccount(input);
  if (!memberships.length) return undefined;
  return (
    memberships.find((membership) => membership.clubId === input.activeStudioId) ??
    memberships[0]
  );
}

export function activeStudioRole(input: {
  memberships?: StudioMembership[];
  activeStudioId?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
  role: StudioRole;
  name: string;
  createdAt: string;
}): StudioRole {
  return getActiveMembership(input)?.role ?? input.role;
}

/** True when content belongs to the currently active studio view. */
export function belongsToActiveStudio(
  item: { clubId?: string },
  activeClubId: string | undefined
): boolean {
  if (!activeClubId) return true;
  if (!item.clubId) return false;
  return item.clubId === activeClubId;
}

export function listInvitesForStudio(clubId: string): StudioInvite[] {
  return readInvites().filter((invite) => invite.clubId === clubId);
}

export function saveStaffEmail(clubId: string, staffId: string, email: string) {
  const map = readStaffEmails();
  const studio = map[clubId] ?? {};
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    delete studio[staffId];
  } else {
    studio[staffId] = normalized;
  }
  if (Object.keys(studio).length === 0) delete map[clubId];
  else map[clubId] = studio;
  writeStaffEmails(map);
}

export function getStaffEmail(clubId: string, staffId: string): string {
  return readStaffEmails()[clubId]?.[staffId] ?? '';
}

export function upsertStudioInvite(invite: StudioInvite): StudioInvite {
  const invites = readInvites();
  const index = invites.findIndex(
    (row) => row.clubId === invite.clubId && row.email === invite.email
  );
  if (index >= 0) {
    invites[index] = { ...invites[index], ...invite, id: invites[index].id };
    writeInvites(invites);
    return invites[index];
  }
  writeInvites([...invites, invite]);
  return invite;
}

export function markInviteAccepted(clubId: string, email: string, userId: string) {
  const normalized = email.trim().toLowerCase();
  const invites = readInvites().map((invite) => {
    if (invite.clubId !== clubId || invite.email !== normalized) return invite;
    return {
      ...invite,
      status: 'accepted' as const,
      acceptedUserId: userId,
    };
  });
  writeInvites(invites);
}

export function revokeStudioInvites(
  clubId: string,
  match: { email?: string; staffId?: string; inviteId?: string }
): void {
  const normalizedEmail = match.email?.trim().toLowerCase();
  const invites = readInvites().filter((invite) => {
    if (invite.clubId !== clubId) return true;
    if (match.inviteId && invite.id === match.inviteId) return false;
    if (normalizedEmail && invite.email === normalizedEmail) return false;
    if (match.staffId && invite.staffId === match.staffId) return false;
    return true;
  });
  writeInvites(invites);
}

export function markStaffRemovedFromStudio(clubId: string, staffId: string) {
  const map = readRemovedStaff();
  const current = map[clubId] ?? [];
  if (current.includes(staffId)) return;
  map[clubId] = [...current, staffId];
  writeRemovedStaff(map);
}

export function isStaffRemovedFromStudio(clubId: string, staffId: string): boolean {
  return (readRemovedStaff()[clubId] ?? []).includes(staffId);
}

export type TeamMemberStatus = 'you' | 'joined' | 'invited' | 'uninvited';

export interface StudioTeamRow {
  key: string;
  name: string;
  role: StudioRole;
  staffId?: string;
  email: string;
  status: TeamMemberStatus;
}

export function resolveMemberStatus(input: {
  email: string;
  currentUserEmail?: string;
  joinedOnDevice?: boolean;
  clubId: string;
}): TeamMemberStatus {
  const email = input.email.trim().toLowerCase();
  if (email && input.currentUserEmail && email === input.currentUserEmail) return 'you';
  if (input.joinedOnDevice) return 'joined';
  const invite = readInvites().find(
    (row) => row.clubId === input.clubId && row.email === email
  );
  if (!invite) return 'uninvited';
  switch (invite.status) {
    case 'accepted':
      return 'joined';
    case 'pending':
      return 'invited';
    default: {
      const _exhaustive: never = invite.status;
      return _exhaustive;
    }
  }
}
