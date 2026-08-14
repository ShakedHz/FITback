import type { ArboxConnection, ScheduleEvent } from '@/data/scheduleTypes';
import {
  getAttendeesWithPhone,
  hasLiveArboxMessaging,
} from '@/services/classFeedback';
import { isOutboundSmsEnabled } from '@/config/outboundMessaging';
import { sendPostClassFeedback } from '@/services/arboxApi';

export interface ClassFeedbackDispatchResult {
  eventId: string;
  recipientCount: number;
  sent: number;
  failed: number;
}

/** Send feedback SMS — disabled unless VITE_ENABLE_SMS=true */
export async function dispatchClassFeedback(
  event: ScheduleEvent,
  arboxConnection?: ArboxConnection | null
): Promise<ClassFeedbackDispatchResult> {
  if (!isOutboundSmsEnabled()) {
    return {
      eventId: event.id,
      recipientCount: 0,
      sent: 0,
      failed: 0,
    };
  }

  const recipients = getAttendeesWithPhone(event);
  const phones = recipients.map((a) => a.phone!);

  if (phones.length === 0) {
    return {
      eventId: event.id,
      recipientCount: 0,
      sent: 0,
      failed: 0,
    };
  }

  if (
    event.source === 'arbox' &&
    arboxConnection?.connected &&
    hasLiveArboxMessaging()
  ) {
    await sendPostClassFeedback(event, arboxConnection);
    return {
      eventId: event.id,
      recipientCount: phones.length,
      sent: phones.length,
      failed: 0,
    };
  }

  return {
    eventId: event.id,
    recipientCount: phones.length,
    sent: 0,
    failed: phones.length,
  };
}
