import type { StoredFeedback } from '@/data/feedbackStore';
import type { BuiltinTrainingType, TrainingType } from '@/data/trainingTypes';

type LessonRef = { id: string; title: string; trainingType: TrainingType };

const DEMO_OWNERS = [/shaked[\s._-]*horo?vitz/i, /שקד\s*הורוביץ/];

export function hasBuiltInRatings(name?: string | null): boolean {
  if (!name) return false;
  return DEMO_OWNERS.some((re) => re.test(name.trim()));
}

const FALLBACK_LESSONS: LessonRef[] = [
  { id: 'demo-pilates-mat', title: 'פילאטיס מזרן בוקר', trainingType: 'pilates' },
  { id: 'demo-reformer', title: 'רפורמר מתקדמות', trainingType: 'pilates' },
  { id: 'demo-core', title: 'פילאטיס ליבה ויציבה', trainingType: 'pilates' },
  { id: 'demo-vinyasa', title: 'יוגה ויניאסה ערב', trainingType: 'yoga' },
  { id: 'demo-gentle-yoga', title: 'יוגה עדינה ונשימה', trainingType: 'yoga' },
];

const INTENSITY = ['מדויק', 'מדויק', 'מדויק', 'קל מדי', 'קשה מדי'];

const NOTES: Record<BuiltinTrainingType, string[]> = {
  pilates: [
    'הקצב היה נעים',
    'רוצה יותר תרגילי בטן',
    'אהבתי את העבודה על הרפורמר',
    'היה קצת מהר במעברים',
    'הסברים מאוד ברורים',
    'אפשר יותר עבודה על הישבן',
    'יצאתי עם גב משוחרר',
    '',
    '',
  ],
  yoga: [
    'הנשימות בסוף היו מושלמות',
    'אפשר להחזיק יותר זמן בתנוחות',
    'מוזיקה מעולה',
    'רוצה יותר פתיחות אגן',
    'השיעור הרגיע אותי מאוד',
    'קצת קשה לי עם הבלאנסים',
    '',
    '',
  ],
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRating(rand: () => number, bias: number): number {
  const r = rand() + bias;
  if (r > 0.62) return 5;
  if (r > 0.3) return 4;
  if (r > 0.12) return 3;
  if (r > 0.04) return 2;
  return 1;
}

/**
 * Stable sample of ~70 responses over the last 60 days, linked to the instructor's own
 * lessons when she has them so the per-lesson drill-down works.
 */
export function buildDemoFeedback(lessons: LessonRef[], instructor: string): StoredFeedback[] {
  const byType: Record<BuiltinTrainingType, LessonRef[]> = {
    pilates: lessons.filter((l) => l.trainingType === 'pilates'),
    yoga: lessons.filter((l) => l.trainingType === 'yoga'),
  };
  (['pilates', 'yoga'] as const).forEach((type) => {
    if (byType[type].length === 0) {
      byType[type] = FALLBACK_LESSONS.filter((l) => l.trainingType === type);
    }
  });

  const rand = mulberry32(20260928);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: StoredFeedback[] = [];

  const push = (id: string, day: Date, bias: number) => {
    const type: BuiltinTrainingType = rand() < 0.62 ? 'pilates' : 'yoga';
    const pool = byType[type];
    const lesson = pool[Math.floor(rand() * pool.length)];
    const rating = pickRating(rand, bias);
    const intensity = INTENSITY[Math.floor(rand() * INTENSITY.length)];
    const notes = NOTES[type];
    const note = notes[Math.floor(rand() * notes.length)];
    const hour = type === 'yoga' ? 18 + Math.floor(rand() * 3) : 7 + Math.floor(rand() * 4);
    const at = new Date(day);
    at.setHours(hour, Math.floor(rand() * 60));
    out.push({
      id,
      sourceId: `${id}_event`,
      lessonId: lesson.id.startsWith('demo-') ? undefined : lesson.id,
      trainingType: type,
      rating,
      improve: [intensity, note].filter(Boolean).join(' · '),
      title: lesson.title,
      instructor,
      createdAt: at.toISOString(),
    });
    return at;
  };

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 72; i++) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.4) * 60);
    const day = new Date(today.getTime() - daysAgo * 86400000);
    if (day >= weekStart) continue;
    // Recent weeks trend slightly better, so the month-over-month pill has a story.
    push(`demo_fb_${i}`, day, daysAgo < 20 ? 0.08 : 0);
  }

  // Every day of the current week (including days still ahead) gets ratings so the week chart is full.
  for (let d = 0; d < 7; d++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + d);
    const perDay = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < perDay; k++) push(`demo_week_${d}_${k}`, day, 0.08);
  }

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
