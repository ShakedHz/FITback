export interface Exercise {
  id: string;
  name: string;
  nameHe: string;
  duration: number;
  category: string;
  videoUrl: string;
  posterUrl?: string;
  isCustom?: boolean;
  createdBy?: string;
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
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  trainingType: TrainingType;
  equipment: EquipmentType;
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
  /** Cover image (legacy seed data) */
  coverImage?: string;
  /** Preview video uploaded by the instructor */
  coverVideo?: string;
  /** Auto album from 4 workout images (Spotify-style) */
  albumImages: string[];
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

export interface FeedPost {
  id: string;
  lessonId: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar: string;
  instructorTier: InstructorTier;
  lessonTitle: string;
  level: Lesson['level'];
  trainingType: TrainingType;
  equipment: EquipmentType;
  duration: number;
  tags: string[];
  coverImage?: string;
  albumImages: string[];
  rating: number;
  likes: number;
  comments: number;
  price: number;
  trending?: boolean;
}

import { getAiAssets } from './aiExerciseVideos';
import { getInstructorAvatar } from './instructorPhotos';
import { buildAlbumFromExercises } from '@/utils/lessonCover';
import {
  computeLessonPrice,
  getInstructorTier,
  getInstructorSpecialties,
  INSTRUCTOR_PROFILES,
  TIER_LABELS,
  type InstructorTier,
} from './instructorTiers';
import type { TrainingType } from './trainingTypes';
import { inferEquipment, type EquipmentType } from './equipmentTypes';

export type { InstructorTier, TrainingType };
export { INSTRUCTOR_PROFILES, TIER_LABELS, computeLessonPrice, getInstructorTier, getInstructorSpecialties };

export const currentInstructor: Instructor = {
  id: 'maya',
  name: 'Maya Cohen',
  avatar: getInstructorAvatar('maya'),
  bio: 'Certified fitness instructor | Pilates, yoga & recovery',
  specialties: ['pilates', 'yoga', 'stretch'],
  lessonsCount: 133,
  studentsCount: 340,
  retention: 87,
  rating: 4.8,
  coins: 1250,
};

export const exercises: Exercise[] = [
  { id: 'e1', name: 'Hundred', nameHe: 'Hundred', duration: 2, category: 'Warm-up', videoUrl: '', posterUrl: getAiAssets('e1')?.poster },
  { id: 'e2', name: 'Roll Up', nameHe: 'Roll Up', duration: 2, category: 'Warm-up', videoUrl: '', posterUrl: getAiAssets('e2')?.poster },
  { id: 'e3', name: 'Single Leg Stretch', nameHe: 'Single Leg Stretch', duration: 2, category: 'Warm-up', videoUrl: '', posterUrl: getAiAssets('e3')?.poster },
  { id: 'e4', name: 'Double Leg Stretch', nameHe: 'Double Leg Stretch', duration: 2, category: 'Core', videoUrl: '', posterUrl: getAiAssets('e4')?.poster },
  { id: 'e5', name: 'Criss Cross', nameHe: 'Criss Cross', duration: 3, category: 'Core', videoUrl: '', posterUrl: getAiAssets('e5')?.poster },
  { id: 'e6', name: 'Swan Dive', nameHe: 'Swan Dive', duration: 3, category: 'Back', videoUrl: '', posterUrl: getAiAssets('e6')?.poster },
  { id: 'e7', name: 'Teaser', nameHe: 'Teaser', duration: 3, category: 'Core', videoUrl: '', posterUrl: getAiAssets('e7')?.poster },
  { id: 'e8', name: 'Saw', nameHe: 'Saw', duration: 2, category: 'Stretching', videoUrl: '', posterUrl: getAiAssets('e8')?.poster },
  { id: 'e9', name: 'Spine Stretch', nameHe: 'Spine Stretch', duration: 2, category: 'Stretching', videoUrl: '', posterUrl: getAiAssets('e9')?.poster },
  { id: 'e10', name: 'Child Pose', nameHe: 'Child Pose', duration: 2, category: 'Cool-down', videoUrl: '', posterUrl: getAiAssets('e10')?.poster },
];

const defaultSections: LessonSection[] = [
  {
    id: 's1',
    title: 'Warm-up',
    duration: 10,
    exercises: exercises.slice(0, 4),
  },
  {
    id: 's2',
    title: 'Main section',
    duration: 30,
    exercises: exercises.slice(4, 8),
  },
  {
    id: 's3',
    title: 'Cool-down',
    duration: 10,
    exercises: exercises.slice(8, 10),
  },
];

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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(2, 6)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(4, 8)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(6, 10)),
  },
  {
    id: 'l20',
    title: 'HIIT Burn 30',
    instructorId: 'dana',
    instructorName: 'Dana Levy',
    duration: 30,
    level: 'Advanced',
    trainingType: 'hiit',
    tags: ['Intense', 'Calorie burn', '30 min'],
    rating: 4.8,
    reviews: 63,
    price: computeLessonPrice('dana', 30, 'Advanced'),
    likes: 580,
    comments: 41,
    description: 'A short, powerful HIIT workout — intervals, strength, and endurance.',
    sections: defaultSections,
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(3, 7)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(5, 9)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(1, 5)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(6, 10)),
  },
  {
    id: 'l4',
    title: 'Morning Stretch',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 30,
    level: 'Beginner',
    trainingType: 'stretch',
    tags: ['Stretching', 'Morning', 'Calm'],
    rating: 4.7,
    reviews: 67,
    price: computeLessonPrice('shira', 30, 'Beginner'),
    likes: 345,
    comments: 29,
    description: 'A gentle morning class with stretches and breathwork.',
    sections: defaultSections,
    coverImage: '/instructors/feed-shira-morning.png',
    albumImages: buildAlbumFromExercises(exercises.slice(6, 10)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(8, 10).concat(exercises.slice(0, 2))),
  },
  {
    id: 'l13',
    title: 'Flexibility Flow',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 40,
    level: 'Intermediate',
    trainingType: 'stretch',
    tags: ['Flexibility', 'Stretching', 'Flow'],
    rating: 4.7,
    reviews: 55,
    price: computeLessonPrice('shira', 40, 'Intermediate'),
    likes: 310,
    comments: 21,
    description: 'Improve range of motion with a pleasant flow.',
    sections: defaultSections,
    albumImages: buildAlbumFromExercises(exercises.slice(7, 10)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
  },
  {
    id: 'l21',
    title: 'Barre Sculpt',
    instructorId: 'shira',
    instructorName: 'Shira Abraham',
    duration: 45,
    level: 'Intermediate',
    trainingType: 'barre',
    tags: ['Barre', 'Strength', 'Upper body'],
    rating: 4.8,
    reviews: 58,
    price: computeLessonPrice('shira', 45, 'Intermediate'),
    likes: 405,
    comments: 27,
    description: 'A blend of pilates, ballet, and strength — focus on posture and long muscles.',
    sections: defaultSections,
    albumImages: buildAlbumFromExercises(exercises.slice(2, 6)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(3, 7)),
  },
  {
    id: 'l16',
    title: 'Lunch Break Flow',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 30,
    level: 'Beginner',
    trainingType: 'stretch',
    tags: ['Short', 'Stretching', 'Morning'],
    rating: 4.5,
    reviews: 28,
    price: computeLessonPrice('yael', 30, 'Beginner'),
    likes: 145,
    comments: 9,
    description: 'A light midday class — stretches and a gentle wake-up.',
    sections: defaultSections,
    albumImages: buildAlbumFromExercises(exercises.slice(6, 10)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(2, 6)),
  },
  {
    id: 'l22',
    title: 'Spin Power 45',
    instructorId: 'yael',
    instructorName: 'Yael Friedman',
    duration: 45,
    level: 'Advanced',
    trainingType: 'cycle',
    tags: ['Bike', 'Endurance', 'Intense'],
    rating: 4.7,
    reviews: 52,
    price: computeLessonPrice('yael', 45, 'Advanced'),
    likes: 365,
    comments: 23,
    description: 'An intense ride workout — climbs, sprints, and cardio endurance.',
    sections: defaultSections,
    albumImages: buildAlbumFromExercises(exercises.slice(4, 8)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(4, 8)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(6, 10)),
  },
  {
    id: 'l24',
    title: 'Sunset Stretch',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 35,
    level: 'Beginner',
    trainingType: 'stretch',
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
    albumImages: buildAlbumFromExercises(exercises.slice(7, 10)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(0, 4)),
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
    albumImages: buildAlbumFromExercises(exercises.slice(3, 7)),
  },
  {
    id: 'l27',
    title: 'Weekend Restore',
    instructorId: 'maya',
    instructorName: 'Maya Cohen',
    duration: 50,
    level: 'Intermediate',
    trainingType: 'stretch',
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
    albumImages: buildAlbumFromExercises(exercises.slice(8, 10).concat(exercises.slice(0, 2))),
  },
];

export const lessons: Lesson[] = lessonsData.map((l) => ({
  ...l,
  equipment: inferEquipment(l.trainingType, l.tags),
}));


export const feedPosts: FeedPost[] = lessons
  .filter((l) => l.price > 0 && l.instructorId !== 'maya')
  .map((l) => ({
    id: `fp-${l.id}`,
    lessonId: l.id,
    instructorId: l.instructorId,
    instructorName: l.instructorName,
    instructorAvatar: getInstructorAvatar(l.instructorId),
    instructorTier: getInstructorTier(l.instructorId),
    lessonTitle: l.title,
    level: l.level,
    trainingType: l.trainingType,
    equipment: l.equipment,
    duration: l.duration,
    tags: l.tags,
    coverImage: l.coverImage,
    albumImages: l.albumImages,
    rating: l.rating,
    likes: l.likes,
    comments: l.comments,
    price: l.price,
    trending: l.likes >= 400,
  }))
  .sort((a, b) => b.likes - a.likes);

export const dashboardInsights = [
  { text: '40-min strength-focused classes → higher ratings', type: 'positive' as const },
  { text: 'New clients prefer intermediate difficulty', type: 'neutral' as const },
  { text: 'Satisfaction drops when there is no calm cool-down', type: 'warning' as const },
];

export const lessonTags = [
  { label: 'Too hard', count: 12 },
  { label: 'Loved the core', count: 34 },
  { label: 'Wanted more stretching', count: 28 },
  { label: 'Perfect!', count: 45 },
];
