import type { TrainingType } from './trainingTypes';

export interface SectionTemplate {
  id: string;
  title: string;
  duration: number;
  exerciseIds: string[];
}

export const LESSON_TEMPLATES: Record<TrainingType, SectionTemplate[]> = {
  pilates: [
    { id: 's1', title: 'Warm-up', duration: 10, exerciseIds: ['e1', 'e2', 'e3', 'e4'] },
    { id: 's2', title: 'Main section — Core', duration: 30, exerciseIds: ['e5', 'e6', 'e7'] },
    { id: 's3', title: 'Cool-down', duration: 10, exerciseIds: ['e9', 'e10'] },
  ],
  yoga: [
    { id: 's1', title: 'Breath & center', duration: 10, exerciseIds: ['e9', 'e10'] },
    { id: 's2', title: 'Vinyasa flow', duration: 35, exerciseIds: ['e1', 'e2', 'e6', 'e8'] },
    { id: 's3', title: 'Savasana', duration: 10, exerciseIds: ['e10'] },
  ],
  hiit: [
    { id: 's1', title: 'Dynamic warm-up', duration: 8, exerciseIds: ['e1', 'e2', 'e3'] },
    { id: 's2', title: 'Intervals', duration: 22, exerciseIds: ['e4', 'e5', 'e7'] },
    { id: 's3', title: 'Cool-down', duration: 5, exerciseIds: ['e9', 'e10'] },
  ],
  barre: [
    { id: 's1', title: 'Barre warm-up', duration: 10, exerciseIds: ['e2', 'e3', 'e4'] },
    { id: 's2', title: 'Strength & plyometrics', duration: 30, exerciseIds: ['e5', 'e6', 'e7'] },
    { id: 's3', title: 'Stretching', duration: 10, exerciseIds: ['e8', 'e9'] },
  ],
  cycle: [
    { id: 's1', title: 'Ride warm-up', duration: 10, exerciseIds: ['e1', 'e2'] },
    { id: 's2', title: 'Climbs & sprints', duration: 30, exerciseIds: ['e4', 'e5', 'e7'] },
    { id: 's3', title: 'Cool-down', duration: 5, exerciseIds: ['e9', 'e10'] },
  ],
  stretch: [
    { id: 's1', title: 'Gentle warm-up', duration: 8, exerciseIds: ['e1', 'e2'] },
    { id: 's2', title: 'Targeted stretches', duration: 25, exerciseIds: ['e8', 'e9', 'e6'] },
    { id: 's3', title: 'Relaxation', duration: 7, exerciseIds: ['e10'] },
  ],
};

export function getLessonTemplate(type: TrainingType): SectionTemplate[] {
  return LESSON_TEMPLATES[type];
}

export function getTemplateDuration(type: TrainingType): number {
  return LESSON_TEMPLATES[type].reduce((sum, s) => sum + s.duration, 0);
}
