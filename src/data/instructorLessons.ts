import { lessons, exercises, type Lesson } from './mockData';
import { getLessonTemplate } from './lessonTemplates';
import { TRAINING_TYPE_LABELS, type TrainingType } from './trainingTypes';
import { inferEquipment } from './equipmentTypes';
import { durationsFromExercises } from '@/utils/lessonDuration';

interface InstructorMeta {
  id: string;
  name: string;
}

type LessonSeed = Pick<
  Lesson,
  'id' | 'title' | 'duration' | 'level' | 'tags' | 'rating' | 'reviews' | 'likes' | 'comments' | 'description'
>;

/** Build a lesson plan whose section times come from its exercises. */
export function lessonFromTrainingType(
  type: TrainingType,
  instructor: InstructorMeta,
  seed?: Partial<LessonSeed> & { id: string; title: string }
): Lesson {
  const template = getLessonTemplate(type);
  const timed = durationsFromExercises(
    template.map((section) => ({
      id: `${type}_${section.id}`,
      title: section.title,
      exerciseIds: [...section.exerciseIds],
    })),
    exercises
  );

  const sections = timed.sections.map((section) => ({
    id: section.id,
    title: section.title,
    duration: section.duration,
    exercises: section.exerciseIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e)),
  }));

  return {
    id: seed?.id ?? `starter_${type}`,
    title: seed?.title ?? `${TRAINING_TYPE_LABELS[type]} Foundations`,
    instructorId: instructor.id,
    instructorName: instructor.name,
    duration: timed.duration,
    level: seed?.level ?? 'Beginner',
    trainingType: type,
    equipment: inferEquipment(type, seed?.tags ?? [TRAINING_TYPE_LABELS[type]]),
    tags: seed?.tags ?? [TRAINING_TYPE_LABELS[type], 'Foundations'],
    rating: seed?.rating ?? 0,
    reviews: seed?.reviews ?? 0,
    price: 0,
    likes: seed?.likes ?? 0,
    comments: seed?.comments ?? 0,
    description:
      seed?.description ??
      `A ${TRAINING_TYPE_LABELS[type].toLowerCase()} lesson plan for your library.`,
    sections,
    isCreated: true,
    isOwned: true,
    albumImages: [],
  };
}

/**
 * Seed library lessons for the instructor's selected class types.
 * Content and cover images always follow the training-type template.
 */
export function buildLessonsForSpecialties(
  specialties: TrainingType[],
  instructor: InstructorMeta
): Lesson[] {
  if (specialties.length === 0) return [];

  const specialtySet = new Set(specialties);
  const seeded = lessons
    .filter((l) => l.isCreated && specialtySet.has(l.trainingType))
    .map((l) =>
      lessonFromTrainingType(l.trainingType, instructor, {
        id: l.id,
        title: l.title,
        duration: l.duration,
        level: l.level,
        tags: l.tags,
        rating: l.rating,
        reviews: l.reviews,
        likes: l.likes,
        comments: l.comments,
        description: l.description,
      })
    );

  const covered = new Set(seeded.map((l) => l.trainingType));
  const starters = specialties
    .filter((type) => !covered.has(type))
    .map((type) => lessonFromTrainingType(type, instructor));

  return [...seeded, ...starters];
}
