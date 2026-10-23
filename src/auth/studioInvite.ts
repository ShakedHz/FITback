import type { StudioRole } from '@/data/scheduleTypes';
import { createId } from '@/auth/userStore';
import {
  markInviteAccepted,
  upsertStudioInvite,
  type StudioInvite,
} from '@/data/studioOrg';

export interface StudioInvitePayload {
  v: 1;
  clubId: string;
  clubName: string;
  email: string;
  name: string;
  staffId?: string;
  staffName?: string;
  role: StudioRole;
  invitedByName: string;
  createdAt: string;
}

const PENDING_KEY = 'movana_pending_studio_invite_v1';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): Uint8Array {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeInviteToken(payload: StudioInvitePayload): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

export function decodeInviteToken(token: string): StudioInvitePayload | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(token.trim()));
    const parsed = JSON.parse(json) as StudioInvitePayload;
    if (parsed.v !== 1 || !parsed.clubId || !parsed.email || !parsed.clubName) return null;
    if (parsed.role !== 'instructor' && parsed.role !== 'studio_manager') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function inviteJoinUrl(token: string): string {
  // Path form survives email clients better than ?t= query strings (which often get stripped).
  return `${window.location.origin}/join/${token}`;
}

/** Resolve invite token from path (/join/:token) or legacy ?t= query. */
export function inviteTokenFromLocation(input: {
  pathToken?: string | null;
  queryToken?: string | null;
}): string {
  return (input.pathToken || input.queryToken || '').trim();
}

export function stashPendingInvite(payload: StudioInvitePayload) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function peekPendingInvite(): StudioInvitePayload | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudioInvitePayload;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  sessionStorage.removeItem(PENDING_KEY);
}

export function takePendingInvite(): StudioInvitePayload | null {
  const payload = peekPendingInvite();
  if (payload) clearPendingInvite();
  return payload;
}

export function createStudioInvite(input: {
  clubId: string;
  clubName: string;
  email: string;
  name: string;
  staffId?: string;
  staffName?: string;
  role: StudioRole;
  invitedByName: string;
}): { invite: StudioInvite; payload: StudioInvitePayload; token: string; url: string } {
  const email = input.email.trim().toLowerCase();
  const createdAt = new Date().toISOString();
  const payload: StudioInvitePayload = {
    v: 1,
    clubId: input.clubId,
    clubName: input.clubName,
    email,
    name: input.name.trim(),
    staffId: input.staffId,
    staffName: input.staffName,
    role: input.role,
    invitedByName: input.invitedByName,
    createdAt,
  };
  const invite = upsertStudioInvite({
    id: createId('invite'),
    clubId: input.clubId,
    clubName: input.clubName,
    email,
    name: payload.name,
    staffId: input.staffId,
    staffName: input.staffName,
    role: input.role,
    invitedByName: input.invitedByName,
    createdAt,
    status: 'pending',
  });
  const token = encodeInviteToken(payload);
  return { invite, payload, token, url: inviteJoinUrl(token) };
}

export function acceptInviteOnDevice(payload: StudioInvitePayload, userId: string) {
  markInviteAccepted(payload.clubId, payload.email, userId);
}

export function openMailtoInvite(to: string, subject: string, body: string) {
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
