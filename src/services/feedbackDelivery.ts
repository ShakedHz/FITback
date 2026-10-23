import type { ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import type { FeedbackDeliveryChannel } from '@/services/classFeedback';
import { sendStudioEmailFeedbackToAttendees } from '@/services/emailCloud';
import { sendStudioFeedbackToAttendees } from '@/services/whatsappCloud';
import type { TranslateFn } from '@/i18n/LocaleContext';

export async function dispatchFeedbackToAttendees(
  channel: FeedbackDeliveryChannel,
  attendees: ScheduleAttendee[],
  event: ScheduleEvent,
  t: TranslateFn,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; lastError: string | null }> {
  if (channel === 'email') {
    return sendStudioEmailFeedbackToAttendees(attendees, event, t, onProgress);
  }
  return sendStudioFeedbackToAttendees(attendees, event, t, onProgress);
}
