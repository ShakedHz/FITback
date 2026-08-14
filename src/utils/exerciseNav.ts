/** Query keys that identify how we entered the exercise library from the builder. */
const BUILDER_KEYS = ['blank', 'template', 'ai', 'lessonId'] as const;

export function exercisesPath(sectionId?: string | null, builderParams?: URLSearchParams | null): string {
  const params = new URLSearchParams();
  if (sectionId) params.set('section', sectionId);
  if (builderParams) {
    for (const key of BUILDER_KEYS) {
      const value = builderParams.get(key);
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/exercises?${qs}` : '/exercises';
}

export function newExercisePath(currentParams: URLSearchParams): string {
  const params = new URLSearchParams();
  const section = currentParams.get('section');
  if (section) params.set('section', section);
  for (const key of BUILDER_KEYS) {
    const value = currentParams.get(key);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/exercises/new?${qs}` : '/exercises/new';
}

export function builderPathFromParams(params: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of BUILDER_KEYS) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/builder?${qs}` : '/builder';
}
