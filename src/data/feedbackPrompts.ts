export const FEEDBACK_INTENSITIES = ['tooEasy', 'justRight', 'tooHard'] as const;
export type FeedbackIntensity = (typeof FEEDBACK_INTENSITIES)[number];

/** CSAT 1–3 is a low score — require a note so the instructor knows what to change. */
export const LOW_FEEDBACK_RATING = 3;

export function isLowFeedbackRating(rating: number): boolean {
  return rating >= 1 && rating <= LOW_FEEDBACK_RATING;
}

/** One readable line for ratings + AI — keeps the existing `improve` field. */
export function composeFeedbackImprove(parts: {
  intensityLabel?: string;
  note: string;
}): string {
  const chunks = [parts.intensityLabel, parts.note.trim() || undefined].filter(
    (part): part is string => Boolean(part)
  );
  return chunks.join(' · ');
}
