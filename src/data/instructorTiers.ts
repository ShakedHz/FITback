import type { TrainingType } from './trainingTypes';

export type InstructorTier = 'leading' | 'established' | 'rising';

export interface InstructorProfile {
  id: string;
  name: string;
  tier: InstructorTier;
  rating: number;
  studentsCount: number;
  lessonsSold: number;
  avatar: string;
  specialties: TrainingType[];
}

export const INSTRUCTOR_PROFILES: Record<string, InstructorProfile> = {
  dana: {
    id: 'dana',
    name: 'Dana Levy',
    tier: 'leading',
    rating: 4.9,
    studentsCount: 520,
    lessonsSold: 890,
    avatar: '/instructors/instructor-dana.png',
    specialties: ['pilates', 'yoga'],
  },
  noa: {
    id: 'noa',
    name: 'Noa Barak',
    tier: 'established',
    rating: 4.8,
    studentsCount: 340,
    lessonsSold: 520,
    avatar: '/instructors/instructor-dana.png',
    specialties: ['pilates', 'yoga'],
  },
  shira: {
    id: 'shira',
    name: 'Shira Abraham',
    tier: 'established',
    rating: 4.7,
    studentsCount: 280,
    lessonsSold: 410,
    avatar: '/instructors/instructor-shira.png',
    specialties: ['pilates', 'yoga'],
  },
  yael: {
    id: 'yael',
    name: 'Yael Friedman',
    tier: 'rising',
    rating: 4.6,
    studentsCount: 95,
    lessonsSold: 120,
    avatar: '/instructors/instructor-shira.png',
    specialties: ['pilates', 'yoga'],
  },
};

export const TIER_LABELS: Record<InstructorTier, string> = {
  leading: 'Leading instructor',
  established: 'Established instructor',
  rising: 'Rising instructor',
};

const TIER_BASE_PRICE: Record<InstructorTier, number> = {
  leading: 360,
  established: 195,
  rising: 115,
};

export function getInstructorTier(instructorId: string): InstructorTier {
  return INSTRUCTOR_PROFILES[instructorId]?.tier ?? 'rising';
}

export function getInstructorSpecialties(instructorId: string): TrainingType[] {
  return INSTRUCTOR_PROFILES[instructorId]?.specialties ?? ['pilates'];
}

export function computeLessonPrice(
  instructorId: string,
  duration: number,
  level: 'Beginner' | 'Intermediate' | 'Advanced'
): number {
  const tier = getInstructorTier(instructorId);
  let price = TIER_BASE_PRICE[tier];
  if (duration >= 50) price += 45;
  else if (duration >= 40) price += 25;
  if (level === 'Advanced') price += 35;
  if (level === 'Beginner') price -= 25;
  return Math.max(80, Math.round(price / 5) * 5);
}

export function getLeadingInstructor(): InstructorProfile {
  return Object.values(INSTRUCTOR_PROFILES).find((p) => p.tier === 'leading')!;
}
