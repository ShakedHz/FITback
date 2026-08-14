export const INSTRUCTOR_PHOTOS: Record<string, string> = {
  maya: '/instructors/instructor-maya.png',
  dana: '/instructors/instructor-dana.png',
  shira: '/instructors/instructor-shira.png',
  noa: '/instructors/instructor-dana.png',
  yael: '/instructors/instructor-shira.png',
};

export function getInstructorAvatar(instructorId: string): string {
  return INSTRUCTOR_PHOTOS[instructorId] ?? INSTRUCTOR_PHOTOS.maya;
}
