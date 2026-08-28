import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ClientPicker } from '@/components/ClientPicker';
import type { ScheduleEvent } from '@/data/scheduleTypes';
import { loadSurveyClients, type SurveyClient } from '@/services/surveyClients';
import { useI18n } from '@/i18n';
import { isValidPhone } from '@/utils/sms';

function isClientOnEvent(event: ScheduleEvent, client: SurveyClient): boolean {
  const phoneDigits = client.phone.replace(/\D/g, '');
  return (event.attendees ?? []).some(
    (a) => a.id === client.id || (a.phone && a.phone.replace(/\D/g, '') === phoneDigits)
  );
}

interface ClassFeedbackAttendeesProps {
  event: ScheduleEvent;
  readOnly?: boolean;
}

/** Participants on the class detail sheet — attendance only; WhatsApp lives in PostClassFeedbackModal. */
export function ClassFeedbackAttendees({ event, readOnly = false }: ClassFeedbackAttendeesProps) {
  const { t } = useI18n();
  const { toggleEventAttendee } = useApp();
  const [rosterClients, setRosterClients] = useState<SurveyClient[]>(() => loadSurveyClients());
  const isArbox = event.source === 'arbox';

  useEffect(() => {
    setRosterClients(loadSurveyClients());
  }, [event.id]);

  if (isArbox || readOnly) {
    const attendees = event.attendees ?? [];
    return (
      <div className="schedule-attendees">
        <p className="schedule-sheet__label">{t('schedule.participants')}</p>
        <p className="schedule-attendees__hint">
          {isArbox ? t('schedule.arboxEnrolledHint') : t('schedule.selectAttended')}
        </p>
        {attendees.length > 0 ? (
          <ul className="schedule-attendees__roster">
            {attendees.map((attendee) => {
              const phoneOk = Boolean(attendee.phone && isValidPhone(attendee.phone));
              return (
                <li key={attendee.id} className="schedule-attendees__row">
                  <div className="schedule-attendees__readonly">
                    <span className="schedule-attendees__name">{attendee.name}</span>
                    <span className="schedule-attendees__phone">
                      {phoneOk ? attendee.phone : t('schedule.noPhone')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="schedule-attendees__empty">{t('schedule.noEnrolled')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="schedule-attendees">
      <p className="schedule-sheet__label">{t('schedule.participants')}</p>
      <p className="schedule-attendees__hint">{t('schedule.selectAttended')}</p>
      {rosterClients.length === 0 ? (
        <ClientPicker
          clients={[]}
          isSelected={() => false}
          onToggle={() => {}}
          onAdded={(client) => {
            setRosterClients(loadSurveyClients());
            toggleEventAttendee(event.id, client);
          }}
          emptyLabel={t('schedule.noClientsYet')}
        />
      ) : (
        <ul className="schedule-attendees__pick">
          {rosterClients.map((client) => {
            const on = isClientOnEvent(event, client);
            return (
              <li key={client.id} className="schedule-attendees__row">
                <button
                  type="button"
                  className={`schedule-attendees__pick-btn${on ? ' schedule-attendees__pick-btn--on' : ''}`}
                  onClick={() => toggleEventAttendee(event.id, client)}
                >
                  <span className="schedule-attendees__pick-check" aria-hidden>
                    {on ? <Check size={14} /> : null}
                  </span>
                  <span className="schedule-attendees__pick-body">
                    <span className="schedule-attendees__name">{client.name}</span>
                    <span className="schedule-attendees__phone">{client.phone}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {(event.attendees ?? []).length > 0 && (
        <p className="schedule-attendees__selected">
          {t('schedule.selectedCount', { count: (event.attendees ?? []).length })}
        </p>
      )}
    </div>
  );
}
