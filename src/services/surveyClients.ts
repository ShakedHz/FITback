import { toDateKey } from '@/data/scheduleTypes';

const CLIENTS_KEY = 'movana_survey_clients_v1';
const HISTORY_KEY = 'movana_weekly_surveys_v1';
export const CLIENTS_UPDATED_EVENT = 'movana-clients-updated';

export interface SurveyClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface WeeklySurveyRecord {
  weekKey: string;
  sentAt: string;
  recipientCount: number;
  surveyUrl: string;
  phones: string[];
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function loadSurveyClients(): SurveyClient[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SurveyClient[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSurveyClients(clients: SurveyClient[]): void {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLIENTS_UPDATED_EVENT));
  }
}

/** Re-run when the client roster changes (Clients page add/remove). */
export function subscribeClients(onChange: () => void): () => void {
  const handler = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === CLIENTS_KEY) handler();
  };
  const onVis = () => {
    if (document.visibilityState === 'visible') handler();
  };
  window.addEventListener(CLIENTS_UPDATED_EVENT, handler);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', handler);
  document.addEventListener('visibilitychange', onVis);
  return () => {
    window.removeEventListener(CLIENTS_UPDATED_EVENT, handler);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', handler);
    document.removeEventListener('visibilitychange', onVis);
  };
}

export function addSurveyClient(input: {
  name: string;
  phone?: string;
  email?: string;
}): SurveyClient {
  const client: SurveyClient = {
    id: createId(),
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim() ? input.email.trim().toLowerCase() : undefined,
    createdAt: new Date().toISOString(),
  };
  const next = [client, ...loadSurveyClients()];
  saveSurveyClients(next);
  return client;
}

export function removeSurveyClient(id: string): SurveyClient[] {
  const next = loadSurveyClients().filter((c) => c.id !== id);
  saveSurveyClients(next);
  return next;
}

export function getWeekKey(weekStart: Date): string {
  return toDateKey(weekStart);
}

export function buildWeeklySurveyUrl(instructorName: string, weekKey: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    title: 'Weekly class feedback',
    instructor: instructorName,
    week: weekKey,
  });
  return `${origin}/feedback/weekly-${weekKey}?${params.toString()}`;
}

export function buildWeeklySurveyMessage(instructorName: string, surveyUrl: string): string {
  return (
    `Hi! How were your classes with ${instructorName} this week? ` +
    `Quick rating (1–5 stars) — optional note welcome: ${surveyUrl}`
  );
}

export function getWeeklySurveyHistory(): WeeklySurveyRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WeeklySurveyRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getWeeklySurveyForWeek(weekKey: string): WeeklySurveyRecord | undefined {
  return getWeeklySurveyHistory().find((s) => s.weekKey === weekKey);
}

export function recordWeeklySurveySend(record: WeeklySurveyRecord): WeeklySurveyRecord[] {
  const history = [
    record,
    ...getWeeklySurveyHistory().filter((s) => s.weekKey !== record.weekKey),
  ].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}
