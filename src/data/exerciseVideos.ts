/** Free demo videos (Mixkit) — pilates / yoga / stretch */
export const DEMO_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-pilates-on-a-mat-32896-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-stretching-her-legs-on-a-yoga-mat-32895-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-on-the-floor-32897-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-fit-woman-doing-plank-exercise-32898-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-stretching-on-the-floor-32894-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-abs-exercises-on-the-floor-32899-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-woman-stretching-on-a-yoga-mat-32900-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-lunges-at-home-32901-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-sit-ups-on-a-mat-32902-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-woman-stretching-her-back-on-a-mat-32903-large.mp4',
];

export function getDemoVideo(index: number): string {
  return DEMO_VIDEOS[index % DEMO_VIDEOS.length];
}
