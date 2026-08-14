import type { Lesson, LessonSection } from '@/data/mockData';

export const PREVIEW_EXERCISE_COUNT = 3;

export interface PreviewExerciseItem {
  exercise: LessonSection['exercises'][number];
  sectionTitle: string;
}

export function getLessonPreview(lesson: Lesson) {
  const items: PreviewExerciseItem[] = [];
  for (const section of lesson.sections) {
    for (const exercise of section.exercises) {
      items.push({ exercise, sectionTitle: section.title });
    }
  }
  const total = items.length;
  const preview = items.slice(0, PREVIEW_EXERCISE_COUNT);
  const locked = total - preview.length;
  return { preview, locked, total, sectionCount: lesson.sections.length };
}
