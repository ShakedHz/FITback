/** Balanced Body–style colors — studios differ, instructors pick by the machine in front of them. */
export type SpringColor = 'yellow' | 'blue' | 'red' | 'green';

export const SPRING_COLORS: SpringColor[] = ['yellow', 'blue', 'red', 'green'];

export const SPRING_HEX: Record<SpringColor, string> = {
  yellow: '#e8c547',
  blue: '#5b8def',
  red: '#e05656',
  green: '#3dba7a',
};

/** Most reformers have 1 of each color; two reds (or two blues) is the usual extra. */
export const MAX_SPRINGS_PER_COLOR = 2;
/** 4- and 5-spring bars — never 4 of the same color. */
export const MAX_SPRINGS_TOTAL = 5;

export type SpringSetup = Partial<Record<SpringColor, number>>;

export function isSpringSetupEmpty(setup?: SpringSetup | null) {
  if (!setup) return true;
  return SPRING_COLORS.every((color) => !setup[color]);
}

export function springTotal(setup?: SpringSetup | null) {
  return springDotList(setup).length;
}

export function springDotList(setup?: SpringSetup | null): SpringColor[] {
  if (!setup) return [];
  const dots: SpringColor[] = [];
  for (const color of SPRING_COLORS) {
    const count = Math.min(MAX_SPRINGS_PER_COLOR, Math.max(0, setup[color] ?? 0));
    for (let i = 0; i < count; i++) dots.push(color);
  }
  return dots.slice(0, MAX_SPRINGS_TOTAL);
}

export function bumpSpring(setup: SpringSetup | undefined, color: SpringColor): SpringSetup | undefined {
  const current = Math.min(MAX_SPRINGS_PER_COLOR, setup?.[color] ?? 0);
  const others = SPRING_COLORS.reduce(
    (sum, c) => sum + (c === color ? 0 : Math.min(MAX_SPRINGS_PER_COLOR, setup?.[c] ?? 0)),
    0
  );
  const total = others + current;
  let nextCount: number;

  if (current >= MAX_SPRINGS_PER_COLOR) {
    nextCount = 0;
  } else if (current === 0 && total >= MAX_SPRINGS_TOTAL) {
    return isSpringSetupEmpty(setup) ? undefined : { ...setup };
  } else if (total >= MAX_SPRINGS_TOTAL) {
    nextCount = 0;
  } else {
    nextCount = current + 1;
  }

  const next: SpringSetup = { ...setup, [color]: nextCount };
  if (nextCount === 0) delete next[color];
  return isSpringSetupEmpty(next) ? undefined : next;
}

export type PilatesPropId = 'weight' | 'circle' | 'ball' | 'jumpboard';

export const PILATES_PROPS: PilatesPropId[] = ['weight', 'circle', 'ball', 'jumpboard'];

export function toggleProp(selected: PilatesPropId[] | undefined, id: PilatesPropId): PilatesPropId[] {
  const current = selected ?? [];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}
