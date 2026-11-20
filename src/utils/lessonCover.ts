import type { Lesson } from '@/data/mockData';
import { trainingTypeColors, type TrainingType } from '@/data/trainingTypes';

export interface LessonMediaData {
  coverVideo?: string;
  coverImage?: string;
}

export function getLessonMediaData(
  lesson: Pick<Lesson, 'coverVideo' | 'coverImage'>
): LessonMediaData {
  return {
    coverVideo: lesson.coverVideo,
    coverImage: lesson.coverImage,
  };
}

export function lessonHasMedia(lesson: Pick<Lesson, 'coverVideo' | 'coverImage'>): boolean {
  return Boolean(lesson.coverVideo || lesson.coverImage);
}

export function trainingTypeColor(type: TrainingType): string {
  return trainingTypeColors(type).bg;
}

/** @deprecated use getLessonMediaData */
export function getLessonCoverData(lesson: Pick<Lesson, 'coverVideo' | 'coverImage'>) {
  return getLessonMediaData(lesson);
}
