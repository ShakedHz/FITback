import type { TrainingType } from './trainingTypes';
import { getAllFeedback, hasFeedbackData, type StoredFeedback } from './feedbackStore';
import type { Locale } from '@/i18n/locale';

export type InsightType = 'positive' | 'neutral' | 'warning';
export type AnalyticsPeriod = '7d' | '30d';

export interface WeeklyPoint {
  day: string;
  value: number;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/** Optional free-text improvement note from a client (rating is always required). */
export interface ClientComment {
  id: string;
  rating: number;
  text: string;
  dateLabel: string;
}

export interface AiTheme {
  theme: string;
  mentions: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AiRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export interface LessonAnalytics {
  lessonId: string;
  responseCount: number;
  avgRating: number;
  ratingDistribution: RatingDistribution;
  /** Share of responses that are 4–5 stars */
  highRatingRate: number;
  /** Share of responses that are 1–2 stars */
  lowRatingRate: number;
  comments: ClientComment[];
  weeklyResponses: WeeklyPoint[];
  aiSummary: string;
  aiThemes: AiTheme[];
  recommendations: AiRecommendation[];
  insights: { text: string; type: InsightType }[];
}

export interface AnalyticsOverview {
  responseCount: number;
  avgRating: number;
  highRatingRate: number;
  lowRatingRate: number;
  activeLessons: number;
  commentCount: number;
}

export interface LessonAnalyticsInput {
  id: string;
  trainingType: TrainingType;
  title: string;
  duration: number;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function avgFromDistribution(dist: RatingDistribution): number {
  const total = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
  if (total === 0) return 0;
  const sum = dist[1] * 1 + dist[2] * 2 + dist[3] * 3 + dist[4] * 4 + dist[5] * 5;
  return Math.round((sum / total) * 10) / 10;
}

const THEME_RULES: {
  themeHe: string;
  themeEn: string;
  keys: string[];
  sentiment: AiTheme['sentiment'];
}[] = [
  {
    themeHe: 'קצב ותזמון',
    themeEn: 'Pace & timing',
    keys: ['rushed', 'fast', 'slow', 'time', 'short', 'longer', 'quick', 'pace', 'קצב', 'מהר', 'לאט', 'זמן', 'קצר', 'ארוך'],
    sentiment: 'neutral',
  },
  {
    themeHe: 'הסברים ובהירות',
    themeEn: 'Cueing & clarity',
    keys: ['cue', 'cues', 'hear', 'follow', 'clear', 'count', 'demo', 'explain', 'הסבר', 'הדרכה', 'ברור', 'לא הבנתי'],
    sentiment: 'neutral',
  },
  {
    themeHe: 'שחרור ומתיחות',
    themeEn: 'Cool-down / recovery',
    keys: ['cool-down', 'cooldown', 'recovery', 'relax', 'stretch', 'שחרור', 'מתיחות', 'קירור'],
    sentiment: 'neutral',
  },
  {
    themeHe: 'רמת קושי',
    themeEn: 'Difficulty level',
    keys: ['advanced', 'hard', 'easy', 'modification', 'level', 'intense', 'קשה', 'קל', 'רמה', 'עומס', 'קל מדי', 'קשה מדי'],
    sentiment: 'negative',
  },
  {
    themeHe: 'מעברים',
    themeEn: 'Transitions',
    keys: ['transition', 'transitions', 'sides', 'change', 'מעבר', 'מעברים'],
    sentiment: 'neutral',
  },
  {
    themeHe: 'סביבה',
    themeEn: 'Environment',
    keys: ['music', 'room', 'warm', 'lighting', 'loud', 'מוזיקה', 'חדר', 'חם', 'רועש'],
    sentiment: 'neutral',
  },
];

function quoteNote(text: string, max = 80): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return `“${clean}”`;
  return `“${clean.slice(0, max - 1)}…”`;
}

type EffortLevel = 'tooEasy' | 'justRight' | 'tooHard';

function parseEffort(text: string): EffortLevel | null {
  const head = text.split('·')[0]?.trim().toLowerCase() ?? '';
  if (head.includes('קל מדי') || head.includes('too easy')) return 'tooEasy';
  if (head.includes('קשה מדי') || head.includes('too hard')) return 'tooHard';
  if (head === 'מדויק' || head.includes('just right')) return 'justRight';
  return null;
}

const REQUEST_RULES: { he: string; en: string; keys: string[] }[] = [
  { he: 'יותר תרגילי בטן', en: 'more core work', keys: ['בטן', 'core', 'abs', 'abdominal'] },
  { he: 'יותר עבודה על הידיים', en: 'more arm work', keys: ['ידיים', 'arms', 'upper body'] },
  { he: 'פחות עבודה על הרגליים', en: 'less leg work', keys: ['רגליים', 'legs', 'חזרות על הרגליים'] },
  { he: 'יותר מתיחות', en: 'more stretching', keys: ['מתיחות', 'stretch', 'שחרור'] },
  { he: 'קצב אחר', en: 'a different pace', keys: ['קצב', 'pace', 'מהר', 'לאט'] },
  { he: 'יותר עומס על הרפורמר', en: 'more reformer load', keys: ['רפורמר', 'reformer', 'להעמיס'] },
];

function pctOf(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function majorityLabel(count: number, total: number, locale: Locale): string | null {
  if (total <= 0 || count <= 0) return null;
  const share = count / total;
  if (share >= 0.6) return locale === 'he' ? 'רוב המתאמנות' : 'Most clients';
  if (share >= 0.45 && share < 0.6 && total >= 3) {
    return locale === 'he' ? 'כמחצית מהמתאמנות' : 'About half of clients';
  }
  return null;
}

/** Natural Hebrew/English prose from ratings + client notes (no stats dump). */
function buildAiSummary(
  comments: ClientComment[],
  responseCount: number,
  avgRating: number,
  highRatingRate: number,
  locale: Locale
): string {
  const he = locale === 'he';
  const sentences: string[] = [];

  const effortCounts: Record<EffortLevel, number> = {
    tooEasy: 0,
    justRight: 0,
    tooHard: 0,
  };
  comments.forEach((c) => {
    const effort = parseEffort(c.text);
    if (effort) effortCounts[effort] += 1;
  });
  const effortTotal = effortCounts.tooEasy + effortCounts.justRight + effortCounts.tooHard;

  if (effortTotal > 0) {
    const ranked = (Object.entries(effortCounts) as [EffortLevel, number][])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    const [top, topCount] = ranked[0]!;
    const effortPhrase: Record<EffortLevel, { he: string; en: string }> = {
      tooHard: { he: 'שהיה להן קשה מדי', en: 'the class felt too hard' },
      tooEasy: { he: 'שהיה להן קל מדי', en: 'the class felt too easy' },
      justRight: { he: 'שהעומס היה מדויק', en: 'the effort level felt just right' },
    };
    const who = majorityLabel(topCount, effortTotal, locale);
    if (who) {
      sentences.push(
        he
          ? `${who} ציינו ${effortPhrase[top].he}.`
          : `${who} said ${effortPhrase[top].en}.`
      );
    } else {
      const p = pctOf(topCount, effortTotal);
      sentences.push(
        he
          ? `${p}% מהמתאמנות ציינו ${effortPhrase[top].he}.`
          : `${p}% of clients said ${effortPhrase[top].en}.`
      );
    }
  } else if (responseCount > 0) {
    if (highRatingRate >= 70) {
      sentences.push(
        he
          ? `רוב המתאמנות דירגו את השיעורים ב־4–5 כוכבים (ממוצע ${avgRating}/5).`
          : `Most clients rated classes 4–5 stars (average ${avgRating}/5).`
      );
    } else if (avgRating > 0) {
      sentences.push(
        he
          ? `הממוצע כרגע הוא ${avgRating}/5 מתוך ${responseCount} דירוגים.`
          : `The average is ${avgRating}/5 from ${responseCount} ratings.`
      );
    }
  }

  const noteBodies = comments
    .map((c) => {
      const parts = c.text.split('·').map((p) => p.trim()).filter(Boolean);
      return parts.length > 1 ? parts.slice(1).join(' · ') : c.text;
    })
    .filter(Boolean);

  const requestHits = REQUEST_RULES.map((rule) => ({
    ...rule,
    count: noteBodies.filter((text) =>
      rule.keys.some((k) => text.toLowerCase().includes(k.toLowerCase()))
    ).length,
  }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  if (requestHits[0] && noteBodies.length > 0) {
    const top = requestHits[0];
    const p = pctOf(top.count, Math.max(comments.length, 1));
    if (p >= 15 || top.count >= 2) {
      sentences.push(
        he
          ? `${p}% כתבו שהן היו רוצות ${top.he} בשיעורים.`
          : `${p}% wrote that they want ${top.en} in class.`
      );
    } else if (sentences.length === 0 && comments[0]) {
      sentences.push(
        he
          ? `בהערה האחרונה: ${quoteNote(comments[0].text, 100)}`
          : `Latest note: ${quoteNote(comments[0].text, 100)}`
      );
    }
  } else if (comments.length > 0 && sentences.length < 2) {
    // keep a light second beat only when we have nothing about requests
  }

  if (sentences.length === 0) {
    return he
      ? 'עדיין אין מספיק משוב כדי לבנות סיכום.'
      : 'Not enough feedback yet to build a summary.';
  }

  return sentences.join(' ');
}

/** Build AI copy only from real ratings + client notes (no generic filler). */
function buildAiAnalysis(
  _lesson: LessonAnalyticsInput,
  dist: RatingDistribution,
  comments: ClientComment[],
  avgRating: number,
  highRatingRate: number,
  lowRatingRate: number,
  locale: Locale = 'he'
): Pick<LessonAnalytics, 'aiSummary' | 'aiThemes' | 'recommendations' | 'insights'> {
  const responseCount = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
  const he = locale === 'he';
  const lowNotes = comments.filter((c) => c.rating <= 2);
  const midNotes = comments.filter((c) => c.rating === 3);
  const highNotes = comments.filter((c) => c.rating >= 4);

  const aiThemes: AiTheme[] = THEME_RULES.map((rule) => {
    const mentions = comments.filter((c) =>
      rule.keys.some((k) => c.text.toLowerCase().includes(k.toLowerCase()))
    ).length;
    return {
      theme: he ? rule.themeHe : rule.themeEn,
      mentions,
      sentiment: rule.sentiment,
    };
  })
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions);

  const recommendations: AiRecommendation[] = [];

  const notesForActions = [...comments].sort((a, b) => a.rating - b.rating).slice(0, 3);
  notesForActions.forEach((note) => {
    const matched = THEME_RULES.find((rule) =>
      rule.keys.some((k) => note.text.toLowerCase().includes(k.toLowerCase()))
    );
    const themeName = matched ? (he ? matched.themeHe : matched.themeEn) : null;
    recommendations.push({
      id: `note-${note.id}`,
      title: themeName
        ? he
          ? `לשפר: ${themeName}`
          : `Fix: ${themeName}`
        : he
          ? 'מההערה של לקוחה'
          : 'From a client note',
      detail: he
        ? `דירוג ${note.rating}/5 עם ההערה ${quoteNote(note.text)}. ` +
          (themeName
            ? `כדאי להתמקד בזה בשיעור הבא.`
            : 'כדאי להתייחס לזה ישירות במערך הבא.')
        : `Client rated ${note.rating}/5 and wrote ${quoteNote(note.text)}. ` +
          (themeName
            ? `Focus the next class on ${themeName.toLowerCase()}.`
            : 'Address this specifically in your next plan.'),
      priority: note.rating <= 2 ? 'high' : note.rating === 3 ? 'medium' : 'low',
    });
  });

  if (lowRatingRate > 0 && lowNotes.length === 0) {
    recommendations.push({
      id: 'low-scores',
      title: he ? 'דירוגים נמוכים בלי הערות' : 'Low scores without notes',
      detail: he
        ? `${lowRatingRate}% מהדירוגים הם 1–2 כוכבים, בלי הערות כתובות. שאלי אחרי השיעור הבא מה הרגיש לא מדויק.`
        : `${lowRatingRate}% of ratings are 1–2 stars, but clients left no written notes. Ask what felt off after the next class.`,
      priority: 'high',
    });
  }

  if (recommendations.length === 0 && responseCount > 0 && comments.length === 0) {
    recommendations.push({
      id: 'ratings-only',
      title: avgRating >= 4
        ? he
          ? 'הלקוחות מרוצות בינתיים'
          : 'Clients are happy so far'
        : he
          ? 'צריך עוד פרטים'
          : 'Need more detail',
      detail: he
        ? avgRating >= 4
          ? `הממוצע ${avgRating}/5 מתוך ${responseCount} דירוגים, בלי הערות כתובות עדיין.`
          : `הממוצע ${avgRating}/5 מתוך ${responseCount} דירוגים. עודדי הערה קצרה בפעם הבאה כדי לדעת מה לשנות.`
        : avgRating >= 4
          ? `Average is ${avgRating}/5 from ${responseCount} rating${responseCount === 1 ? '' : 's'}, with no written notes yet.`
          : `Average is ${avgRating}/5 from ${responseCount} rating${responseCount === 1 ? '' : 's'}. Encourage a short note next time so you know what to change.`,
      priority: avgRating >= 4 ? 'low' : 'medium',
    });
  }

  const aiSummary = buildAiSummary(
    comments,
    responseCount,
    avgRating,
    highRatingRate,
    locale
  );

  const insights: LessonAnalytics['insights'] = [];
  if (lowNotes[0]) {
    insights.push({
      text: he
        ? `דירוג נמוך (${lowNotes[0].rating}/5): ${quoteNote(lowNotes[0].text, 100)}`
        : `Low score (${lowNotes[0].rating}/5): ${quoteNote(lowNotes[0].text, 100)}`,
      type: 'warning',
    });
  } else if (midNotes[0]) {
    insights.push({
      text: he
        ? `דירוג מעורב (3/5): ${quoteNote(midNotes[0].text, 100)}`
        : `Mixed score (3/5): ${quoteNote(midNotes[0].text, 100)}`,
      type: 'neutral',
    });
  } else if (highNotes[0]) {
    insights.push({
      text: he
        ? `הערה חיובית (${highNotes[0].rating}/5): ${quoteNote(highNotes[0].text, 100)}`
        : `Positive note (${highNotes[0].rating}/5): ${quoteNote(highNotes[0].text, 100)}`,
      type: 'positive',
    });
  } else if (avgRating > 0) {
    insights.push({
      text: he
        ? `ממוצע ${avgRating}/5 מתוך ${responseCount} דירוגים.`
        : `Average ${avgRating}/5 from ${responseCount} client rating${responseCount === 1 ? '' : 's'}.`,
      type: avgRating >= 4 ? 'positive' : avgRating <= 2.5 ? 'warning' : 'neutral',
    });
  }

  return {
    aiSummary,
    aiThemes,
    recommendations: recommendations.slice(0, 3),
    insights,
  };
}

function formatCommentDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function analyticsFromFeedback(
  feedback: StoredFeedback[],
  lesson: LessonAnalyticsInput,
  locale: Locale = 'he'
): LessonAnalytics {
  const ratingDistribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedback.forEach((f) => {
    const star = Math.min(5, Math.max(1, Math.round(f.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingDistribution[star] += 1;
  });

  const responseCount = feedback.length;
  const avgRating = avgFromDistribution(ratingDistribution);
  const high = ratingDistribution[4] + ratingDistribution[5];
  const low = ratingDistribution[1] + ratingDistribution[2];
  const highRatingRate = responseCount ? Math.round((high / responseCount) * 100) : 0;
  const lowRatingRate = responseCount ? Math.round((low / responseCount) * 100) : 0;

  const comments: ClientComment[] = feedback
    .filter((f) => f.improve)
    .map((f) => ({
      id: f.id,
      rating: f.rating,
      text: f.improve!,
      dateLabel: formatCommentDate(f.createdAt),
    }));

  const dayCounts = Object.fromEntries(weekDays.map((d) => [d, 0])) as Record<string, number>;
  feedback.forEach((f) => {
    const day = weekDays[new Date(f.createdAt).getDay()];
    dayCounts[day] += 1;
  });
  const weeklyResponses = weekDays.map((day) => ({ day, value: dayCounts[day] }));

  const ai = buildAiAnalysis(
    lesson,
    ratingDistribution,
    comments,
    avgRating,
    highRatingRate,
    lowRatingRate,
    locale
  );

  return {
    lessonId: lesson.id,
    responseCount,
    avgRating,
    ratingDistribution,
    highRatingRate,
    lowRatingRate,
    comments,
    weeklyResponses,
    ...ai,
  };
}

export function hasSurveyResults(): boolean {
  return hasFeedbackData();
}

/** Empty analytics shell — used when no survey responses have arrived yet. */
export function emptyAnalytics(
  lesson: LessonAnalyticsInput,
  locale: Locale = 'he'
): LessonAnalytics {
  return {
    lessonId: lesson.id,
    responseCount: 0,
    avgRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    highRatingRate: 0,
    lowRatingRate: 0,
    comments: [],
    weeklyResponses: weekDays.map((day) => ({ day, value: 0 })),
    aiSummary:
      locale === 'he' ? 'עדיין אין משוב מלקוחות.' : 'No client feedback yet.',
    aiThemes: [],
    recommendations: [],
    insights: [],
  };
}

function feedbackForLesson(
  lesson: LessonAnalyticsInput,
  allFeedback: StoredFeedback[] = getAllFeedback()
): StoredFeedback[] {
  const titleNorm = lesson.title.trim().toLowerCase();
  return allFeedback.filter((f) => {
    if (f.lessonId === lesson.id || f.sourceId === lesson.id) return true;
    if (f.title && f.title.trim().toLowerCase() === titleNorm) return true;
    return false;
  });
}

/** Analytics from real survey responses, or an empty shell if none exist. */
export function resolveLessonAnalytics(
  lesson: LessonAnalyticsInput,
  allFeedback?: StoredFeedback[],
  locale: Locale = 'he'
): LessonAnalytics {
  const feedback = feedbackForLesson(lesson, allFeedback);
  if (feedback.length === 0) return emptyAnalytics(lesson, locale);
  return analyticsFromFeedback(feedback, lesson, locale);
}

/** Studio-wide analytics from all survey responses (empty shell if none). */
export function resolveOverallAnalytics(
  fallbackType: TrainingType = 'pilates',
  allFeedback: StoredFeedback[] = getAllFeedback(),
  locale: Locale = 'he'
): LessonAnalytics {
  const meta: LessonAnalyticsInput = {
    id: 'overall',
    title: 'All classes',
    trainingType: fallbackType,
    duration: 0,
  };
  if (allFeedback.length === 0) return emptyAnalytics(meta, locale);
  return analyticsFromFeedback(allFeedback, meta, locale);
}

export function getAnalyticsOverview(items: LessonAnalytics[]): AnalyticsOverview {
  if (items.length === 0) {
    return {
      responseCount: 0,
      avgRating: 0,
      highRatingRate: 0,
      lowRatingRate: 0,
      activeLessons: 0,
      commentCount: 0,
    };
  }
  const responseCount = items.reduce((s, a) => s + a.responseCount, 0);
  const commentCount = items.reduce((s, a) => s + a.comments.length, 0);
  return {
    responseCount,
    avgRating: Math.round((items.reduce((s, a) => s + a.avgRating, 0) / items.length) * 10) / 10,
    highRatingRate: Math.round(items.reduce((s, a) => s + a.highRatingRate, 0) / items.length),
    lowRatingRate: Math.round(items.reduce((s, a) => s + a.lowRatingRate, 0) / items.length),
    activeLessons: items.length,
    commentCount,
  };
}

export function lessonHealthScore(a: LessonAnalytics): number {
  const ratingPts = (a.avgRating / 5) * 45;
  const highPts = (a.highRatingRate / 100) * 35;
  const lowPenalty = (a.lowRatingRate / 100) * 20;
  return Math.round(clamp(ratingPts + highPts - lowPenalty, 0, 100));
}

export function primaryAction(a: LessonAnalytics): { text: string; tone: InsightType } {
  const high = a.recommendations.find((r) => r.priority === 'high');
  if (high) return { text: `${high.title}: ${high.detail}`, tone: 'warning' };
  const mid = a.recommendations.find((r) => r.priority === 'medium');
  if (mid) return { text: `${mid.title}: ${mid.detail}`, tone: 'neutral' };
  const low = a.recommendations[0];
  return { text: low ? `${low.title}: ${low.detail}` : a.aiSummary, tone: 'positive' };
}

/**
 * Period filter for real survey data.
 * Uses actual responses (no fake scaling) so a single test rating shows up correctly.
 */
export function scalePeriod(analytics: LessonAnalytics, _period: AnalyticsPeriod): LessonAnalytics {
  return analytics;
}

/** Build analytics from feedback created within the last `days` days. */
export function resolveOverallAnalyticsForPeriod(
  fallbackType: TrainingType,
  period: AnalyticsPeriod,
  allFeedback: StoredFeedback[] = getAllFeedback(),
  locale: Locale = 'he'
): LessonAnalytics {
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const feedback = allFeedback.filter((f) => new Date(f.createdAt).getTime() >= cutoff);
  return resolveOverallAnalytics(fallbackType, feedback, locale);
}

export function resolveLessonAnalyticsForPeriod(
  lesson: LessonAnalyticsInput,
  period: AnalyticsPeriod,
  allFeedback: StoredFeedback[] = getAllFeedback(),
  locale: Locale = 'he'
): LessonAnalytics {
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const feedback = feedbackForLesson(lesson, allFeedback).filter(
    (f) => new Date(f.createdAt).getTime() >= cutoff
  );
  if (feedback.length === 0) return emptyAnalytics(lesson, locale);
  return analyticsFromFeedback(feedback, lesson, locale);
}
