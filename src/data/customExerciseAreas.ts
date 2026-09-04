export interface CustomExerciseArea {
  id: string;
  name: string;
  nameHe: string;
}

export const CUSTOM_EXERCISE_AREAS_KEY = 'movana_custom_exercise_areas_v1';

export function loadCustomExerciseAreas(): CustomExerciseArea[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISE_AREAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomExerciseArea[];
    return Array.isArray(parsed)
      ? parsed.filter((a) => a?.id && a?.name && a?.nameHe)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomExerciseAreas(items: CustomExerciseArea[]): void {
  localStorage.setItem(CUSTOM_EXERCISE_AREAS_KEY, JSON.stringify(items));
}

export function slugFromAreaName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `area-${Date.now()}`;
}
