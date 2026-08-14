import type { Exercise } from '@/data/mockData';

export interface TimedSection {
  id: string;
  title: string;
  duration: number;
  exerciseIds: string[];
}

/** Section + total lesson duration from the exercises the instructor added. */
export function durationsFromExercises(
  sections: { id: string; title: string; exerciseIds: string[] }[],
  allExercises: Exercise[]
): { sections: TimedSection[]; duration: number; exerciseIds: string[] } {
  const byId = new Map(allExercises.map((e) => [e.id, e]));

  const nextSections: TimedSection[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    exerciseIds: [...section.exerciseIds],
    duration: section.exerciseIds.reduce((sum, id) => sum + (byId.get(id)?.duration ?? 0), 0),
  }));

  const exerciseIds = nextSections.flatMap((s) => s.exerciseIds);
  const duration = nextSections.reduce((sum, s) => sum + s.duration, 0);

  return { sections: nextSections, duration, exerciseIds };
}
