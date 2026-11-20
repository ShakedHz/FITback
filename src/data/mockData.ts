export type LessonLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export const LESSON_LEVELS: LessonLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

/** Teaching notes for one exercise inside a specific lesson plan. */
export interface ExercisePlanNotes {
  reps?: string;
  cue?: string;
  springs?: SpringSetup;
}

export interface Exercise {
  id: string;
  name: string;
  nameHe: string;
  duration: number;
  category: string;
  videoUrl: string;
  /** Primary muscle / area focus. */
  bodyPart?: import('./bodyParts').BodyPart;
  /** User-defined area tag (shown in filters). */
  customAreaId?: string;
  /** Built-in catalog only — which lesson types include this move. */
  trainingTypes?: import('./trainingTypes').TrainingType[];
  isCustom?: boolean;
  createdBy?: string;
  /** Reps / timing for this exercise in a plan (not the catalog). */
  reps?: string;
  /** Short cue or modification for this plan. */
  cue?: string;
  /** Reformer spring mix for this exercise in the plan. */
  springs?: SpringSetup;
}

export interface LessonSection {
  id: string;
  title: string;
  duration: number;
  exercises: Exercise[];
}

export interface Lesson {
  id: string;
  title: string;
  instructorId: string;
  instructorName: string;
  duration: number;
  level: LessonLevel;
  /** One-line class theme, e.g. "core + spinal mobility". */
  focus?: string;
  trainingType: TrainingType;
  equipment: EquipmentType;
  /** Yoga sub-style when trainingType is yoga. */
  yogaStyle?: import('./yogaStyles').YogaStyle;
  /** Reformer props to set up for the class (weight, circle, ball, jumpboard). */
  props?: PilatesPropId[];
  tags: string[];
  rating: number;
  reviews: number;
  price: number;
  likes: number;
  comments: number;
  description: string;
  sections: LessonSection[];
  isOwned?: boolean;
  isCreated?: boolean;
  /** Seeded starter plan, not yet customized by the instructor. */
  isStarter?: boolean;
  /** Cover image (legacy seed data) */
  coverImage?: string;
  /** Preview video uploaded by the instructor */
  coverVideo?: string;
  albumImages: string[];
  /** Studio this lesson belongs to (scoped when switching views). */
  clubId?: string;
}

export interface Instructor {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  specialties: TrainingType[];
  lessonsCount: number;
  studentsCount: number;
  retention: number;
  rating: number;
  coins: number;
}

import { getInstructorAvatar } from './instructorPhotos';
import { computeLessonPrice } from './instructorTiers';
import type { TrainingType } from './trainingTypes';
import { inferEquipment, type EquipmentType } from './equipmentTypes';
import type { PilatesPropId, SpringSetup } from './pilatesSetup';
import { BUILTIN_EXERCISES as exercises } from './exerciseCatalog';
import { getLessonTemplate } from './lessonTemplates';

export { exercises };

function sectionsForType(type: TrainingType): LessonSection[] {
  return getLessonTemplate(type).map((section) => ({
    id: section.id,
    title: section.title,
    duration: section.duration,
    exercises: section.exerciseIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is (typeof exercises)[number] => e != null),
  }));
}

export const currentInstructor: Instructor = {
  id: 'maya',
  name: 'Maya Cohen',
  avatar: getInstructorAvatar('maya'),
  bio: 'Certified fitness instructor | Pilates & yoga',
  specialties: ['pilates', 'yoga'],
  lessonsCount: 133,
  studentsCount: 340,
  retention: 87,
  rating: 4.8,
  coins: 1250,
};

const defaultSections = sectionsForType('pilates');

const lessonsData: Omit<Lesson, 'equipment'>[] = [
  {
    id: 'l1',
    title: 'Power Flow — 45 min',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Strength', 'Dynamic', 'Core'],
    rating: 4.9,
    reviews: 124,
    price: computeLessonPrice('dana', 45, 'Intermediate'),
    likes: 842,
    comments: 68,
    description: 'A dynamic class combining core strength, flexibility, and control. Perfect for intermediate students seeking a balanced challenge.',
    sections: defaultSections,
    coverImage: '/instructors/feed-dana-power-flow.png',
    albumImages: [],
  },
  {
    id: 'l5',
    title: 'Reformer Burn',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 50,
    level: 'Advanced',
    trainingType: 'pilates',
    tags: ['Reformer', 'Strength', 'Advanced'],
    rating: 4.9,
    reviews: 98,
    price: computeLessonPrice('dana', 50, 'Advanced'),
    likes: 620,
    comments: 45,
    description: 'An intense reformer workout for full-body strength.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l6',
    title: 'Core Power 40',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 40,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Core', 'Strength', '40 min'],
    rating: 4.8,
    reviews: 76,
    price: computeLessonPrice('dana', 40, 'Intermediate'),
    likes: 510,
    comments: 32,
    description: 'Core-focused work with advanced exercises for intermediate students.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l7',
    title: 'Athletes Pilates',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 55,
    level: 'Advanced',
    trainingType: 'pilates',
    tags: ['Athletes', 'Power', 'Advanced'],
    rating: 4.9,
    reviews: 112,
    price: computeLessonPrice('dana', 55, 'Advanced'),
    likes: 730,
    comments: 54,
    description: 'A professional lesson plan for athletes and instructors seeking high intensity.',
    sections: defaultSections,
    coverImage: '/instructors/feed-dana-power-flow.png',
    albumImages: [],
  },
  {
    id: 'l8',
    title: 'Evening Flow',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Evening', 'Flow', 'Flexibility'],
    rating: 4.8,
    reviews: 67,
    price: computeLessonPrice('dana', 45, 'Intermediate'),
    likes: 445,
    comments: 28,
    description: 'A balanced evening class — strength and stretching to close the day.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l20',
    title: 'HIIT Burn 30',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 30,
    level: 'Advanced',
    trainingType: 'pilates',
    tags: ['Intense', 'Calorie burn', '30 min'],
    rating: 4.8,
    reviews: 63,
    price: computeLessonPrice('dana', 30, 'Advanced'),
    likes: 580,
    comments: 41,
    description: 'A short, powerful HIIT workout — intervals, strength, and endurance.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l9',
    title: 'Balance & Control',
    instructorId: 'noa',
    instructorName: 'Noa Barak',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Balance', 'Control', 'Intermediate'],
    rating: 4.8,
    reviews: 89,
    price: computeLessonPrice('noa', 45, 'Intermediate'),
    likes: 380,
    comments: 24,
    description: 'Improve balance and body control with precise exercises.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l10',
    title: 'Spine Health',
    instructorId: 'noa',
    instructorName: 'Noa Barak',
    duration: 40,
    level: 'Beginner',
    trainingType: 'pilates',
    tags: ['Back', 'Recovery', 'Beginner'],
    rating: 4.7,
    reviews: 54,
    price: computeLessonPrice('noa', 40, 'Beginner'),
    likes: 290,
    comments: 18,
    description: 'A lesson plan for spine health — gentle and effective.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l11',
    title: 'Intermediate Challenge',
    instructorId: 'noa',
    instructorName: 'Noa Barak',
    duration: 50,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Challenge', 'Intermediate', '50 min'],
    rating: 4.8,
    reviews: 71,
    price: computeLessonPrice('noa', 50, 'Intermediate'),
    likes: 340,
    comments: 22,
    description: 'An intermediate class with progressive challenges.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l19',
    title: 'Vinyasa Sunrise',
    instructorId: 'noa',
    instructorName: 'Noa Barak',
    duration: 50,
    level: 'Intermediate',
    trainingType: 'yoga',
    tags: ['Vinyasa', 'Morning', 'Flow'],
    rating: 4.9,
    reviews: 95,
    price: computeLessonPrice('noa', 50, 'Intermediate'),
    likes: 490,
    comments: 36,
    description: 'Morning vinyasa flow — breath, movement, and gradual warm-up.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l4',
    title: 'Morning Stretch',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 30,
    level: 'Beginner',
    trainingType: 'yoga',
    tags: ['Stretching', 'Morning', 'Calm'],
    rating: 4.7,
    reviews: 67,
    price: computeLessonPrice('shira', 30, 'Beginner'),
    likes: 345,
    comments: 29,
    description: 'A gentle morning class with stretches and breathwork.',
    sections: defaultSections,
    coverImage: '/instructors/feed-shira-morning.png',
    albumImages: [],
  },
  {
    id: 'l12',
    title: 'Prenatal Gentle',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 35,
    level: 'Beginner',
    trainingType: 'pilates',
    tags: ['Pregnancy', 'Gentle', 'Safe'],
    rating: 4.8,
    reviews: 48,
    price: computeLessonPrice('shira', 35, 'Beginner'),
    likes: 260,
    comments: 19,
    description: 'A lesson plan adapted for pregnancy — safe and strengthening.',
    sections: defaultSections,
    coverImage: '/instructors/feed-shira-morning.png',
    albumImages: [],
  },
  {
    id: 'l13',
    title: 'Flexibility Flow',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 40,
    level: 'Intermediate',
    trainingType: 'yoga',
    tags: ['Flexibility', 'Stretching', 'Flow'],
    rating: 4.7,
    reviews: 55,
    price: computeLessonPrice('shira', 40, 'Intermediate'),
    likes: 310,
    comments: 21,
    description: 'Improve range of motion with a pleasant flow.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l14',
    title: 'Beginner Basics',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 35,
    level: 'Beginner',
    trainingType: 'pilates',
    tags: ['Beginner', 'Foundations', 'Guided'],
    rating: 4.6,
    reviews: 82,
    price: computeLessonPrice('shira', 35, 'Beginner'),
    likes: 420,
    comments: 35,
    description: 'A foundations lesson plan perfect for beginners — step by step.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l21',
    title: 'Barre Sculpt',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Barre', 'Strength', 'Upper body'],
    rating: 4.8,
    reviews: 58,
    price: computeLessonPrice('shira', 45, 'Intermediate'),
    likes: 405,
    comments: 27,
    description: 'A blend of pilates, ballet, and strength — focus on posture and long muscles.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l15',
    title: 'Quick Core 25',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 25,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Core', 'Short', 'Midday'],
    rating: 4.6,
    reviews: 34,
    price: computeLessonPrice('yael', 25, 'Intermediate'),
    likes: 180,
    comments: 12,
    description: 'A short, focused core workout — perfect for a lunch break.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l16',
    title: 'Lunch Break Flow',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 30,
    level: 'Beginner',
    trainingType: 'yoga',
    tags: ['Short', 'Stretching', 'Morning'],
    rating: 4.5,
    reviews: 28,
    price: computeLessonPrice('yael', 30, 'Beginner'),
    likes: 145,
    comments: 9,
    description: 'A light midday class — stretches and a gentle wake-up.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l17',
    title: 'Starter Mat',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 35,
    level: 'Beginner',
    trainingType: 'pilates',
    tags: ['Mat', 'Beginner', 'Foundations'],
    rating: 4.6,
    reviews: 41,
    price: computeLessonPrice('yael', 35, 'Beginner'),
    likes: 195,
    comments: 14,
    description: 'An introduction to mat pilates — accessible and clear.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l18',
    title: 'Glutes & Legs',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 40,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Legs', 'Glutes', 'Strength'],
    rating: 4.6,
    reviews: 38,
    price: computeLessonPrice('yael', 40, 'Intermediate'),
    likes: 210,
    comments: 16,
    description: 'Focus on legs and glutes with effective exercises.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l22',
    title: 'Spin Power 45',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 45,
    level: 'Advanced',
    trainingType: 'pilates',
    tags: ['Bike', 'Endurance', 'Intense'],
    rating: 4.7,
    reviews: 52,
    price: computeLessonPrice('yael', 45, 'Advanced'),
    likes: 365,
    comments: 23,
    description: 'An intense ride workout — climbs, sprints, and cardio endurance.',
    sections: defaultSections,
    albumImages: [],
  },
  {
    id: 'l2',
    title: 'Full Body Flow',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 50,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Full body', '50 min'],
    rating: 4.8,
    reviews: 89,
    price: 0,
    likes: 210,
    comments: 15,
    description: 'A balanced full-body class with emphasis on posture and strength.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l3',
    title: 'Core & Balance',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 35,
    level: 'Advanced',
    trainingType: 'pilates',
    tags: ['Core', 'Balance'],
    rating: 4.7,
    reviews: 56,
    price: 0,
    likes: 178,
    comments: 12,
    description: 'An advanced class focused on core and dynamic balance.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l23',
    title: 'Morning Yoga Flow',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'yoga',
    tags: ['Yoga', 'Morning', 'Vinyasa'],
    rating: 4.8,
    reviews: 42,
    price: 0,
    likes: 156,
    comments: 11,
    description: 'Morning yoga flow — breath, gradual warm-up, and fluid movement.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l24',
    title: 'Sunset Stretch',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 35,
    level: 'Beginner',
    trainingType: 'yoga',
    tags: ['Stretching', 'Evening', 'Relaxation'],
    rating: 4.7,
    reviews: 38,
    price: 0,
    likes: 132,
    comments: 9,
    description: 'A gentle evening class — stretches, breathwork, and muscle relaxation.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l25',
    title: 'Mat Foundations',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 40,
    level: 'Beginner',
    trainingType: 'pilates',
    tags: ['Mat', 'Foundations', 'Beginner'],
    rating: 4.9,
    reviews: 67,
    price: 0,
    likes: 198,
    comments: 14,
    description: 'A mat foundations lesson plan — perfect for new clients and intro classes.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l26',
    title: 'Core Express 30',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 30,
    level: 'Intermediate',
    trainingType: 'pilates',
    tags: ['Core', 'Short', 'Focused'],
    rating: 4.6,
    reviews: 29,
    price: 0,
    likes: 94,
    comments: 7,
    description: 'A short, precise core workout — ideal for a lunch break.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  },
  {
    id: 'l27',
    title: 'Weekend Restore',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 50,
    level: 'Intermediate',
    trainingType: 'yoga',
    tags: ['Weekend', 'Recovery', 'Flexibility'],
    rating: 4.8,
    reviews: 51,
    price: 0,
    likes: 167,
    comments: 12,
    description: 'A weekend recovery class — deep stretches and full relaxation.',
    sections: defaultSections,
    isCreated: true,
    isOwned: true,
    coverImage: '/instructors/feed-shira-morning.png',
    albumImages: [],
  },
];

export const lessons: Lesson[] = lessonsData.map((l) => ({
  ...l,
  equipment: inferEquipment(l.trainingType, l.tags),
  sections: sectionsForType(l.trainingType),
}));

