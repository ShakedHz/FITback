/** AI video assets for known pilates exercises */
export interface AiExerciseAssets {
  poster: string;
  frame2: string;
}

export const AI_EXERCISE_VIDEOS: Record<string, AiExerciseAssets> = {
  e1: { poster: '/exercises/e1-hundred.png', frame2: '/exercises/e1-hundred-f2.png' },
  e2: { poster: '/exercises/e2-roll-up.png', frame2: '/exercises/e2-roll-up-f2.png' },
  e3: { poster: '/exercises/e3-single-leg.png', frame2: '/exercises/e3-single-leg-f2.png' },
  e4: { poster: '/exercises/e4-double-leg.png', frame2: '/exercises/e4-double-leg-f2.png' },
  e5: { poster: '/exercises/e5-criss-cross.png', frame2: '/exercises/e5-criss-cross-f2.png' },
  e6: { poster: '/exercises/e6-swan-dive.png', frame2: '/exercises/e6-swan-dive-f2.png' },
  e7: { poster: '/exercises/e7-teaser.png', frame2: '/exercises/e7-teaser-f2.png' },
  e8: { poster: '/exercises/e8-saw.png', frame2: '/exercises/e8-saw-f2.png' },
  e9: { poster: '/exercises/e9-spine-stretch.png', frame2: '/exercises/e9-spine-stretch-f2.png' },
  e10: { poster: '/exercises/e10-child-pose.png', frame2: '/exercises/e10-child-pose-f2.png' },
};

export function getAiAssets(exerciseId: string): AiExerciseAssets | undefined {
  return AI_EXERCISE_VIDEOS[exerciseId];
}

export function isAiExercise(exerciseId: string): boolean {
  return exerciseId in AI_EXERCISE_VIDEOS;
}
