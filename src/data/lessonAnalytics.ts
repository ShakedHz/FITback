import type { TrainingType } from './trainingTypes';
import { getAllFeedback, hasFeedbackData, type StoredFeedback } from './feedbackStore';

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

const THEME_RULES: { theme: string; keys: string[]; sentiment: AiTheme['sentiment'] }[] = [
  {
    theme: 'Pace & timing',
    keys: ['rushed', 'fast', 'slow', 'time', 'short', 'longer', 'quick', 'pace', 'קצב', 'מהר', 'לאט', 'זמן', 'קצר', 'ארוך'],
    sentiment: 'neutral',
  },
  {
    theme: 'Cueing & clarity',
    keys: ['cue', 'cues', 'hear', 'follow', 'clear', 'count', 'demo', 'explain', 'הסבר', 'הדרכה', 'ברור', 'לא הבנתי'],
    sentiment: 'neutral',
  },
  {
    theme: 'Cool-down / recovery',
    keys: ['cool-down', 'cooldown', 'recovery', 'relax', 'stretch', 'שחרור', 'מתיחות', 'קירור'],
    sentiment: 'neutral',
  },
  {
    theme: 'Difficulty level',
    keys: ['advanced', 'hard', 'easy', 'modification', 'level', 'intense', 'קשה', 'קל', 'רמה', 'עומס'],
    sentiment: 'negative',
  },
  {
    theme: 'Transitions',
    keys: ['transition', 'transitions', 'sides', 'change', 'מעבר', 'מעברים'],
    sentiment: 'neutral',
  },
  {
    theme: 'Environment',
    keys: ['music', 'room', 'warm', 'lighting', 'loud', 'מוזיקה', 'חדר', 'חם', 'רועש'],
    sentiment: 'neutral',
  },
];

function quoteNote(text: string, max = 80): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return `“${clean}”`;
  return `“${clean.slice(0, max - 1)}…”`;
}

/** Build AI copy only from real ratings + client notes (no generic filler). */
function buildAiAnalysis(
  _lesson: LessonAnalyticsInput,
  dist: RatingDistribution,
  comments: ClientComment[],
  avgRating: number,
  highRatingRate: number,
  lowRatingRate: number
): Pick<LessonAnalytics, 'aiSummary' | 'aiThemes' | 'recommendations' | 'insights'> {
  const responseCount = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
  const lowNotes = comments.filter((c) => c.rating <= 2);
  const midNotes = comments.filter((c) => c.rating === 3);
  const highNotes = comments.filter((c) => c.rating >= 4);

  const aiThemes: AiTheme[] = THEME_RULES.map((rule) => {
    const mentions = comments.filter((c) =>
      rule.keys.some((k) => c.text.toLowerCase().includes(k.toLowerCase()))
    ).length;
    return { theme: rule.theme, mentions, sentiment: rule.sentiment };
  })
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions);

  const recommendations: AiRecommendation[] = [];

  // One recommendation per real note (most recent / lowest rating first)
  const notesForActions = [...comments].sort((a, b) => a.rating - b.rating).slice(0, 3);
  notesForActions.forEach((note) => {
    const matched = THEME_RULES.find((rule) =>
      rule.keys.some((k) => note.text.toLowerCase().includes(k.toLowerCase()))
    );
    recommendations.push({
      id: `note-${note.id}`,
      title: matched ? `Fix: ${matched.theme}` : 'From a client note',
      detail:
        `Client rated ${note.rating}/5 and wrote ${quoteNote(note.text)}. ` +
        (matched
          ? `Focus the next class on ${matched.theme.toLowerCase()}.`
          : 'Address this specifically in your next plan.'),
      priority: note.rating <= 2 ? 'high' : note.rating === 3 ? 'medium' : 'low',
    });
  });

  if (lowRatingRate > 0 && lowNotes.length === 0) {
    recommendations.push({
      id: 'low-scores',
      title: 'Low scores without notes',
      detail: `${lowRatingRate}% of ratings are 1–2 stars, but clients left no written notes. Ask what felt off after the next class.`,
      priority: 'high',
    });
  }

  if (recommendations.length === 0 && responseCount > 0 && comments.length === 0) {
    recommendations.push({
      id: 'ratings-only',
      title: avgRating >= 4 ? 'Clients are happy so far' : 'Need more detail',
      detail:
        avgRating >= 4
          ? `Average is ${avgRating}/5 from ${responseCount} rating${responseCount === 1 ? '' : 's'}, with no written notes yet.`
          : `Average is ${avgRating}/5 from ${responseCount} rating${responseCount === 1 ? '' : 's'}. Encourage a short note next time so you know what to change.`,
      priority: avgRating >= 4 ? 'low' : 'medium',
    });
  }

  // Summary: facts + quote real notes
  const parts: string[] = [];
  parts.push(
    `${responseCount} rating${responseCount === 1 ? '' : 's'} · average ${avgRating}/5` +
      (highRatingRate > 0 ? ` · ${highRatingRate}% gave 4–5★` : '') +
      (lowRatingRate > 0 ? ` · ${lowRatingRate}% gave 1–2★` : '') +
      '.'
  );

  if (comments.length === 1) {
    parts.push(`Client note: ${quoteNote(comments[0]!.text, 120)}`);
  } else if (comments.length > 1) {
    const themeBit = aiThemes[0]
      ? ` Most notes relate to ${aiThemes[0].theme.toLowerCase()}.`
      : '';
    parts.push(
      `${comments.length} written notes.${themeBit} Latest: ${quoteNote(comments[0]!.text, 100)}`
    );
  } else {
    parts.push('No written notes yet — analysis is based on star ratings only.');
  }

  const aiSummary = parts.join(' ');

  const insights: LessonAnalytics['insights'] = [];
  if (lowNotes[0]) {
    insights.push({
      text: `Low score (${lowNotes[0].rating}/5): ${quoteNote(lowNotes[0].text, 100)}`,
      type: 'warning',
    });
  } else if (midNotes[0]) {
    insights.push({
      text: `Mixed score (3/5): ${quoteNote(midNotes[0].text, 100)}`,
      type: 'neutral',
    });
  } else if (highNotes[0]) {
    insights.push({
      text: `Positive note (${highNotes[0].rating}/5): ${quoteNote(highNotes[0].text, 100)}`,
      type: 'positive',
    });
  } else if (avgRating > 0) {
    insights.push({
      text: `Average ${avgRating}/5 from ${responseCount} client rating${responseCount === 1 ? '' : 's'}.`,
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
  lesson: LessonAnalyticsInput
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
    lowRatingRate
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
export function emptyAnalytics(lesson: LessonAnalyticsInput): LessonAnalytics {
  return {
    lessonId: lesson.id,
    responseCount: 0,
    avgRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    highRatingRate: 0,
    lowRatingRate: 0,
    comments: [],
    weeklyResponses: weekDays.map((day) => ({ day, value: 0 })),
    aiSummary: 'No client feedback yet.',
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
  allFeedback?: StoredFeedback[]
): LessonAnalytics {
  const feedback = feedbackForLesson(lesson, allFeedback);
  if (feedback.length === 0) return emptyAnalytics(lesson);
  return analyticsFromFeedback(feedback, lesson);
}

/** Studio-wide analytics from all survey responses (empty shell if none). */
export function resolveOverallAnalytics(
  fallbackType: TrainingType = 'pilates',
  allFeedback: StoredFeedback[] = getAllFeedback()
): LessonAnalytics {
  const meta: LessonAnalyticsInput = {
    id: 'overall',
    title: 'All classes',
    trainingType: fallbackType,
    duration: 0,
  };
  if (allFeedback.length === 0) return emptyAnalytics(meta);
  return analyticsFromFeedback(allFeedback, meta);
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
  allFeedback: StoredFeedback[] = getAllFeedback()
): LessonAnalytics {
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const feedback = allFeedback.filter((f) => new Date(f.createdAt).getTime() >= cutoff);
  return resolveOverallAnalytics(fallbackType, feedback);
}

export function resolveLessonAnalyticsForPeriod(
  lesson: LessonAnalyticsInput,
  period: AnalyticsPeriod,
  allFeedback: StoredFeedback[] = getAllFeedback()
): LessonAnalytics {
  const days = period === '7d' ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const feedback = feedbackForLesson(lesson, allFeedback).filter(
    (f) => new Date(f.createdAt).getTime() >= cutoff
  );
  if (feedback.length === 0) return emptyAnalytics(lesson);
  return analyticsFromFeedback(feedback, lesson);
}
