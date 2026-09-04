import type { ScheduleEvent } from '@/data/scheduleTypes';
import { useI18n } from '@/i18n';

interface ClassFeedbackAttendeesProps {
  event: ScheduleEvent;
}

export function ClassFeedbackAttendees({ event }: ClassFeedbackAttendeesProps) {
  const { t } = useI18n();
  const attendees = event.attendees ?? [];
  const emptyLabel =
    event.source === 'arbox' ? t('schedule.noEnrolled') : t('schedule.noneOnClass');

  return (
    <div className="schedule-attendees">
      <p className="schedule-sheet__label">{t('schedule.participants')}</p>

      {attendees.length > 0 ? (
        <ul className="client-picker__list">
          {attendees.map((attendee) => (
            <li key={attendee.id} className="client-row client-row--on">
              <span className="client-row__main client-row__main--static">
                <span className="client-row__text">
                  <span className="client-row__name">{attendee.name}</span>
                  <span className="client-row__phone">
                    {attendee.phone || t('schedule.noPhone')}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="schedule-attendees__empty">{emptyLabel}</p>
      )}
    </div>
  );
}
