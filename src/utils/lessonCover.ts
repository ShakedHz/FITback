import type { Exercise, Lesson } from '@/data/mockData';
import { getAiAssets } from '@/data/aiExerciseVideos';
import { TRAINING_TYPE_COLORS, type TrainingType } from '@/data/trainingTypes';

export function exercisePoster(exercise: Exercise): string {
  return exercise.posterUrl ?? getAiAssets(exercise.id)?.poster ?? '/exercises/e1-hundred.png';
}

export function buildAlbumFromExercises(exerciseList: Exercise[]): string[] {
  const images = exerciseList.map(exercisePoster);
  if (images.length === 0) {
    return [
      '/exercises/e1-hundred.png',
      '/exercises/e2-roll-up.png',
      '/exercises/e3-single-leg.png',
      '/exercises/e4-double-leg.png',
    ];
  }
  const album: string[] = [];
  for (let i = 0; i < 4; i++) album.push(images[i % images.length]);
  return album;
}

export function getLessonAlbumImages(lesson: Lesson): string[] {
  if (lesson.albumImages?.length === 4) return lesson.albumImages;
  const exs = lesson.sections.flatMap((s) => s.exercises);
  return buildAlbumFromExercises(exs);
}

export interface LessonMediaData {
  coverVideo?: string;
  /** Legacy seed lessons may still have a cover image */
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
  return TRAINING_TYPE_COLORS[type].bg;
}

/** @deprecated use getLessonMediaData */
export function getLessonCoverData(lesson: Pick<Lesson, 'coverVideo' | 'coverImage'>) {
  return getLessonMediaData(lesson);
}
