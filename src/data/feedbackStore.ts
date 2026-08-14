export interface StoredFeedback {
  id: string;
  /** feedback page id — class event id or weekly-{weekKey} */
  sourceId: string;
  lessonId?: string;
  rating: number;
  improve?: string;
  title?: string;
  instructor?: string;
  createdAt: string;
}

const STORAGE_KEY = 'movana_feedback_responses_v1';
export const FEEDBACK_UPDATED_EVENT = 'movana-feedback-updated';

/** In-memory mirror so the same JS session always sees the latest writes. */
let memoryCache: StoredFeedback[] | null = null;

function readAll(): StoredFeedback[] {
  if (memoryCache) return memoryCache.map((item) => ({ ...item }));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as StoredFeedback[]) : [];
  } catch {
    memoryCache = [];
  }
  return memoryCache.map((item) => ({ ...item }));
}

function writeAll(items: StoredFeedback[]) {
  memoryCache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private mode — memory cache still works in this session */
  }
  notifyFeedbackUpdated();
}

function notifyFeedbackUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATED_EVENT));
  try {
    // Wake other tabs on the same origin (storage event alone is flaky on some mobile browsers)
    localStorage.setItem(`${STORAGE_KEY}__ping`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function getAllFeedback(): StoredFeedback[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function hasFeedbackData(): boolean {
  return readAll().length > 0;
}

export function saveFeedback(input: {
  sourceId: string;
  rating: number;
  improve?: string;
  title?: string;
  instructor?: string;
  lessonId?: string;
}): StoredFeedback {
  const entry: StoredFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceId: input.sourceId,
    lessonId: input.lessonId || undefined,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    improve: input.improve?.trim() || undefined,
    title: input.title,
    instructor: input.instructor,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(entry);
  writeAll(all.slice(0, 500));
  return entry;
}

/** Re-run when feedback is saved in this tab or another tab on the same origin. */
export function subscribeFeedback(onChange: () => void): () => void {
  const handler = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY || e.key.startsWith(STORAGE_KEY)) {
      memoryCache = null; // force reload from localStorage
      handler();
    }
  };
  const onVis = () => {
    if (document.visibilityState === 'visible') {
      memoryCache = null;
      handler();
    }
  };
  const onFocus = () => {
    memoryCache = null;
    handler();
  };
  const onPageShow = () => {
    memoryCache = null;
    handler();
  };

  window.addEventListener(FEEDBACK_UPDATED_EVENT, handler);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onPageShow);

  return () => {
    window.removeEventListener(FEEDBACK_UPDATED_EVENT, handler);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
  };
}
