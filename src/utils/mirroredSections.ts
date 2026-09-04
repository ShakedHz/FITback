import type { TrainingType } from '@/data/trainingTypes';

interface SectionWithExercises {
  id: string;
  exerciseIds: string[];
}

function isRightSideTitle(title: string) {
  return /right/i.test(title) || title.includes('ימין');
}

function isLeftSideTitle(title: string) {
  return /left/i.test(title) || title.includes('שמאל');
}

/** Paired right/left main blocks stay in sync (pilates & yoga). */
export function syncPilatesMainSides<T extends SectionWithExercises>(
  sections: T[],
  changedSectionId: string,
  trainingType: TrainingType
): T[] {
  if (trainingType !== 'pilates') return sections;

  const changedIdx = sections.findIndex((s) => s.id === changedSectionId);
  if (changedIdx < 0) return sections;

  const titles = sections as Array<T & { title?: string }>;
  const changedTitle = titles[changedIdx]?.title ?? '';
  const isRight = isRightSideTitle(changedTitle);
  const isLeft = isLeftSideTitle(changedTitle);
  if (!isRight && !isLeft) return sections;

  const mirrorIdx = sections.findIndex((s, i) => {
    if (i === changedIdx) return false;
    const title = (s as T & { title?: string }).title ?? '';
    return isRight ? isLeftSideTitle(title) : isRightSideTitle(title);
  });
  if (mirrorIdx < 0) return sections;

  const sourceIds = sections[changedIdx].exerciseIds;
  if (sections[mirrorIdx].exerciseIds.join(',') === sourceIds.join(',')) return sections;

  return sections.map((s, i) =>
    i === mirrorIdx ? { ...s, exerciseIds: [...sourceIds] } : s
  );
}
