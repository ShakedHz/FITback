import type { Lesson } from './mockData';
import {
  resolveLessonAnalytics,
  resolveOverallAnalytics,
  hasSurveyResults,
  type AiTheme,
  type LessonAnalytics,
} from './lessonAnalytics';
import { getLessonSectionShell, type SectionTemplate } from './lessonTemplates';
import { TRAINING_TYPE_LABELS, type TrainingType } from './trainingTypes';
import { durationsFromExercises, DEFAULT_CLASS_DURATION } from '@/utils/lessonDuration';

export interface AiLessonDraftSection {
  id: string;
  title: string;
  duration: number;
  exerciseIds: string[];
}

export interface AiLessonDraft {
  title: string;
  description: string;
  duration: number;
  trainingType: TrainingType;
  focus?: string;
  coverVideo: string | null;
  albumImages: string[];
  exerciseIds: string[];
  sections: AiLessonDraftSection[];
}

export interface AiLessonSuggestion {
  draft: AiLessonDraft;
  /** Why AI chose this plan, in instructor-facing language */
  rationale: string;
  /** Short bullets shown on the suggest screen */
  signals: string[];
  focusThemes: string[];
  basedOn: {
    ratings: number;
    notes: number;
    lessonsAnalyzed: number;
  };
}

function aggregateClientSignals(lessons: Lesson[]): {
  analytics: LessonAnalytics[];
  themes: AiTheme[];
  bestType: TrainingType;
  avgRatingByType: Map<TrainingType, { sum: number; n: number }>;
  totalRatings: number;
  totalNotes: number;
} {
  const analytics = lessons
    .map((l) => resolveLessonAnalytics(l))
    .filter((a) => a.responseCount > 0);

  const overallRaw = resolveOverallAnalytics(lessons[0]?.trainingType ?? 'pilates');
  const overall = overallRaw.responseCount > 0 ? overallRaw : null;
  const themeMap = new Map<string, AiTheme>();
  const avgRatingByType = new Map<TrainingType, { sum: number; n: number }>();

  analytics.forEach((a, i) => {
    const lesson = lessons.find((l) => l.id === a.lessonId) ?? lessons[i];
    if (!lesson) return;
    const type = lesson.trainingType;
    const prev = avgRatingByType.get(type) ?? { sum: 0, n: 0 };
    avgRatingByType.set(type, { sum: prev.sum + a.avgRating, n: prev.n + 1 });

    a.aiThemes.forEach((t) => {
      const existing = themeMap.get(t.theme);
      if (existing) existing.mentions += t.mentions;
      else themeMap.set(t.theme, { ...t });
    });
  });

  overall?.aiThemes.forEach((t) => {
    const existing = themeMap.get(t.theme);
    if (existing) existing.mentions += t.mentions;
    else themeMap.set(t.theme, { ...t });
  });

  const themes = [...themeMap.values()].sort((a, b) => b.mentions - a.mentions);

  let bestType: TrainingType = lessons[0]?.trainingType ?? 'pilates';
  let bestAvg = -1;
  avgRatingByType.forEach((v, type) => {
    const avg = v.sum / v.n;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestType = type;
    }
  });

  const totalRatings =
    analytics.reduce((s, a) => s + a.responseCount, 0) || (overall?.responseCount ?? 0);
  const totalNotes =
    analytics.reduce((s, a) => s + a.comments.length, 0) || (overall?.comments.length ?? 0);

  return {
    analytics: analytics.length > 0 ? analytics : overall ? [overall] : [],
    themes,
    bestType,
    avgRatingByType,
    totalRatings,
    totalNotes,
  };
}

function planFromOwnLessons(lessons: Lesson[], type: TrainingType): SectionTemplate[] {
  const source = [...lessons]
    .filter((l) => l.trainingType === type && l.sections.some((s) => s.exercises.length > 0))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

  if (!source) return getLessonSectionShell(type);

  return source.sections.map((section, i) => ({
    id: section.id || `s${i + 1}`,
    title: section.title,
    duration: section.duration,
    exerciseIds: section.exercises.map((e) => e.id),
  }));
}

function adjustTemplate(
  type: TrainingType,
  themes: AiTheme[],
  lessons: Lesson[]
): { sections: SectionTemplate[]; titleFocus: string } {
  const base = planFromOwnLessons(lessons, type).map((s) => ({
    ...s,
    exerciseIds: [...s.exerciseIds],
  }));
  let titleFocus = 'Client favorites';

  const has = (part: string) =>
    themes.some((t) => t.theme.toLowerCase().includes(part.toLowerCase()));

  if (has('Cool-down') || has('recovery')) {
    titleFocus = 'Recovery-focused';
  }

  if (has('Pace') || has('timing') || has('Transitions')) {
    const warm = base[0];
    if (warm) {
      warm.title = warm.title.includes('Gentle') ? warm.title : `Gentle ${warm.title}`;
    }
    titleFocus = titleFocus === 'Client favorites' ? 'Steady pace' : titleFocus;
  }

  if (has('Difficulty')) {
    titleFocus = 'Accessible';
  }

  if (has('Cueing') || has('clarity')) {
    titleFocus = titleFocus === 'Client favorites' ? 'Clear & guided' : titleFocus;
  }

  return { sections: base, titleFocus };
}

/**
 * Build a lesson plan from client ratings + optional improvement notes.
 * Demo "AI" — uses the same signals as the Ratings hub.
 */
export function suggestLessonFromClientData(
  lessons: Lesson[],
  specialties: TrainingType[]
): AiLessonSuggestion | null {
  if (lessons.length === 0 || !hasSurveyResults()) return null;

  const pool =
    specialties.length > 0
      ? lessons.filter((l) => specialties.includes(l.trainingType))
      : lessons;
  const source = pool.length > 0 ? pool : lessons;

  const { analytics, themes, bestType, avgRatingByType, totalRatings, totalNotes } =
    aggregateClientSignals(source);

  if (totalRatings === 0) return null;

  const type =
    specialties.length > 0 && !specialties.includes(bestType)
      ? specialties[0]
      : bestType;

  const { sections, titleFocus } = adjustTemplate(type, themes, source);
  const exercisePool = source.flatMap((l) => l.sections.flatMap((s) => s.exercises));
  const timed = durationsFromExercises(
    sections.map((s) => ({
      id: s.id,
      title: s.title,
      duration: s.duration,
      exerciseIds: s.exerciseIds,
    })),
    exercisePool
  );

  const typeAvg = avgRatingByType.get(type);
  const avgForType = typeAvg ? Math.round((typeAvg.sum / typeAvg.n) * 10) / 10 : 0;
  const topThemes = themes.slice(0, 3).map((t) => t.theme);

  const draft: AiLessonDraft = {
    title: `${titleFocus} ${TRAINING_TYPE_LABELS[type]}`,
    description:
      topThemes.length > 0
        ? `Designed from client feedback — focuses on ${topThemes.join(', ').toLowerCase()}.`
        : `A ${TRAINING_TYPE_LABELS[type].toLowerCase()} class shaped from your clients' ratings.`,
    duration: DEFAULT_CLASS_DURATION,
    trainingType: type,
    focus: titleFocus,
    coverVideo: null,
    albumImages: [],
    exerciseIds: timed.exerciseIds,
    sections: timed.sections,
  };

  const signals: string[] = [
    `${totalRatings} client ratings across ${source.length} lessons`,
    `${totalNotes} optional improvement notes analyzed`,
  ];
  if (avgForType > 0) {
    signals.push(`${TRAINING_TYPE_LABELS[type]} averages ${avgForType} — strongest fit`);
  }
  topThemes.forEach((t) => signals.push(`Recurring note theme: ${t}`));

  const lowLessons = analytics.filter((a) => a.lowRatingRate >= 12).length;
  const rationaleParts = [
    `AI looked at how clients rated your classes and what they wrote in optional improvement notes.`,
    `They respond best to ${TRAINING_TYPE_LABELS[type].toLowerCase()} plans` +
      (avgForType ? ` (${avgForType} average)` : '') +
      `.`,
  ];
  if (topThemes.length > 0) {
    rationaleParts.push(
      `Notes most often mention ${topThemes.map((t) => `“${t}”`).join(', ')} — this plan is shaped around those requests.`
    );
  }
  if (lowLessons > 0) {
    rationaleParts.push(
      `${lowLessons} lesson${lowLessons > 1 ? 's have' : ' has'} elevated low scores; this draft avoids the patterns clients complained about.`
    );
  }

  return {
    draft,
    rationale: rationaleParts.join(' '),
    signals,
    focusThemes: topThemes,
    basedOn: {
      ratings: totalRatings,
      notes: totalNotes,
      lessonsAnalyzed: source.length,
    },
  };
}
