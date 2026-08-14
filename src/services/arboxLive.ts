import type { ArboxConnection, ScheduleAttendee, ScheduleEvent, StudioRole } from '@/data/scheduleTypes';

export interface ArboxProbeResult {
  ok: boolean;
  mode: 'live' | 'unavailable';
  message: string;
  endpoints: { path: string; status: number; ok: boolean }[];
  sampleKeys?: string[];
}

export interface ArboxConnectResponse {
  connection: ArboxConnection;
  events: ScheduleEvent[];
  clients: ScheduleAttendee[];
  probe: ArboxProbeResult;
  debug?: ArboxConnection['scheduleDebug'];
}

export interface ArboxScheduleResponse {
  events: ScheduleEvent[];
  clients: ScheduleAttendee[];
  debug?: ArboxConnection['scheduleDebug'];
}

function proxyBase(): string | null {
  const env = import.meta.env.VITE_ARBOX_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '/api/arbox';
  return null;
}

export function hasArboxProxy(): boolean {
  return Boolean(proxyBase());
}

export async function probeArboxApi(apiKey: string): Promise<ArboxProbeResult> {
  const base = proxyBase();
  if (!base) {
    return {
      ok: false,
      mode: 'unavailable',
      message: 'Arbox proxy not configured',
      endpoints: [],
    };
  }

  const res = await fetch(`${base}/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    return {
      ok: false,
      mode: 'unavailable',
      message: err.message ?? `Probe failed (${res.status})`,
      endpoints: [],
    };
  }

  return res.json() as Promise<ArboxProbeResult>;
}

function formatDateForArbox(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function connectLiveArbox(
  apiKey: string,
  role: StudioRole,
  weekStart: Date
): Promise<ArboxConnectResponse> {
  const base = proxyBase();
  if (!base) {
    throw new Error('Arbox proxy is not running. Use npm run dev.');
  }

  const res = await fetch(`${base}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      role,
      weekStartDate: formatDateForArbox(weekStart),
    }),
  });

  const body = await res.json().catch(() => ({})) as ArboxConnectResponse & { message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? 'Invalid Arbox API key or service unavailable');
  }

  return body;
}

export async function fetchLiveArboxSchedule(
  apiKey: string,
  weekStart: Date
): Promise<ArboxScheduleResponse> {
  const base = proxyBase();
  if (!base) return { events: [], clients: [] };

  const params = new URLSearchParams({ weekStart: formatDateForArbox(weekStart) });
  const res = await fetch(`${base}/schedule?${params}`, {
    headers: { 'x-arbox-api-key': apiKey },
  });

  const body = await res.json().catch(() => ({})) as ArboxScheduleResponse & { message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? `Schedule sync failed (${res.status})`);
  }

  return { events: body.events ?? [], clients: body.clients ?? [], debug: body.debug };
}
