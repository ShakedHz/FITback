import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageSquare, Plus, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import { buildClassSurveyUrl, isClassStarted, isPublicSurveyOrigin } from '@/services/classFeedback';
import {
  sendStudioFeedbackToAttendees,
  sendStudioWhatsAppMessage,
} from '@/services/whatsappCloud';
import { loadSurveyClients, type SurveyClient } from '@/services/surveyClients';
import { translateError, useI18n } from '@/i18n';
import { isValidPhone } from '@/utils/sms';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

function isClientOnEvent(event: ScheduleEvent, client: SurveyClient): boolean {
  const phoneDigits = client.phone.replace(/\D/g, '');
  return (event.attendees ?? []).some(
    (a) => a.id === client.id || (a.phone && a.phone.replace(/\D/g, '') === phoneDigits)
  );
}

function withValidPhone(list: ScheduleAttendee[]): ScheduleAttendee[] {
  return list.filter((a) => a.phone && isValidPhone(a.phone));
}

interface ClassFeedbackAttendeesProps {
  event: ScheduleEvent;
  onCloseSheet: () => void;
}

export function ClassFeedbackAttendees({ event, onCloseSheet }: ClassFeedbackAttendeesProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toggleEventAttendee, markEventFeedbackSent } = useApp();
  const [rosterClients, setRosterClients] = useState<SurveyClient[]>(() => loadSurveyClients());
  const [trainedIds, setTrainedIds] = useState<Set<string>>(
    () => new Set((event.attendees ?? []).map((a) => a.id))
  );
  const [sessionSent, setSessionSent] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  useEffect(() => {
    setRosterClients(loadSurveyClients());
  }, [event.id]);

  useEffect(() => {
    setTrainedIds(new Set((event.attendees ?? []).map((a) => a.id)));
    setSessionSent(new Set());
    setProgress(null);
    setSendError(null);
    setSendStatus(null);
  }, [event.id]);

  const classStarted = isClassStarted(event);
  const publicOrigin = isPublicSurveyOrigin();
  const isArbox = event.source === 'arbox';

  const trainedAttendees = useMemo(() => {
    if (isArbox) {
      return (event.attendees ?? []).filter((a) => trainedIds.has(a.id));
    }
    return event.attendees ?? [];
  }, [event.attendees, isArbox, trainedIds]);

  const recipients = useMemo(() => withValidPhone(trainedAttendees), [trainedAttendees]);

  const markIfComplete = (sent: Set<string>, list: ScheduleAttendee[]) => {
    if (list.length > 0 && list.every((a) => sent.has(a.id))) {
      markEventFeedbackSent(event.id);
    }
  };

  const sendOne = async (attendee: ScheduleAttendee) => {
    if (!attendee.phone || busy) return;
    setBusy(true);
    setSendError(null);
    try {
      await sendStudioWhatsAppMessage(attendee.phone, event, t);
      setSessionSent((prev) => {
        const next = new Set(prev);
        next.add(attendee.id);
        markIfComplete(next, recipients);
        return next;
      });
      setSendStatus(t('schedule.sentWhatsAppCount', { sent: 1, total: 1 }));
    } catch (err) {
      setSendError(translateError(t, err instanceof Error ? err.message : 'WhatsApp send failed'));
    } finally {
      setBusy(false);
    }
  };

  const sendAll = async () => {
    const pending = recipients.filter((a) => !sessionSent.has(a.id));
    const list = pending.length > 0 ? pending : recipients;
    if (list.length === 0 || busy) return;
    setBusy(true);
    setSendError(null);
    setSendStatus(null);
    setProgress({ sent: 0, total: list.length });
    const result = await sendStudioFeedbackToAttendees(list, event, t, (sent, total) => {
      setProgress({ sent, total });
    });
    if (result.sent > 0) {
      markEventFeedbackSent(event.id);
    }
    if (result.failed > 0) {
      setSendError(
        translateError(t, result.lastError) ||
          t('schedule.sentWhatsAppPartial', { sent: result.sent, failed: result.failed })
      );
    } else {
      setSendStatus(t('schedule.sentWhatsAppCount', { sent: result.sent, total: list.length }));
    }
    setBusy(false);
  };

  const toggleTrained = (id: string) => {
    setTrainedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPreview = () => {
    const url = new URL(buildClassSurveyUrl(event));
    onCloseSheet();
    navigate(`${url.pathname}${url.search}`);
  };

  const sendLabel =
    busy && progress
      ? t('schedule.sendingWhatsApp', { current: progress.sent, total: progress.total })
      : event.feedbackSentAt
        ? t('schedule.sendWhatsAppAgain')
        : t('schedule.sendWhatsApp');

  const sendDisabled = busy || recipients.length === 0;
  const showSend = classStarted;

  const rowWhatsApp = (attendee: ScheduleAttendee, trained: boolean) => {
    const phoneOk = Boolean(attendee.phone && isValidPhone(attendee.phone));
    if (!classStarted || !trained || !phoneOk) return null;
    return (
      <button
        type="button"
        className="schedule-attendees__wa"
        disabled={busy}
        aria-label={t('schedule.whatsappAria', { name: attendee.name })}
        onClick={() => void sendOne(attendee)}
      >
        <WhatsAppIcon />
      </button>
    );
  };

  return (
    <div className="schedule-attendees">
      <p className="schedule-sheet__label">{t('schedule.participants')}</p>

      {isArbox ? (
        <>
          <p className="schedule-attendees__hint">
            {t('schedule.arboxEnrolledHint')}{' '}
            {(event.attendees ?? []).length > 0 ? t('schedule.selectWhoTrained') : null}
          </p>
          {(event.attendees ?? []).length > 0 ? (
            <ul className="schedule-attendees__roster">
              {(event.attendees ?? []).map((attendee) => {
                const on = trainedIds.has(attendee.id);
                const phoneOk = Boolean(attendee.phone && isValidPhone(attendee.phone));
                return (
                  <li key={attendee.id} className="schedule-attendees__row">
                    <button
                      type="button"
                      className={`schedule-attendees__pick-btn${on ? ' schedule-attendees__pick-btn--on' : ''}`}
                      onClick={() => toggleTrained(attendee.id)}
                    >
                      <span className="schedule-attendees__pick-check" aria-hidden>
                        {on ? <Check size={14} /> : null}
                      </span>
                      <span className="schedule-attendees__pick-body">
                        <span className="schedule-attendees__name">{attendee.name}</span>
                        <span className="schedule-attendees__phone">
                          {phoneOk ? attendee.phone : t('schedule.noPhone')}
                        </span>
                      </span>
                    </button>
                    {rowWhatsApp(attendee, on)}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="schedule-attendees__empty">{t('schedule.noEnrolled')}</p>
          )}
        </>
      ) : (
        <>
          <p className="schedule-attendees__hint">{t('schedule.selectAttended')}</p>
          {rosterClients.length === 0 ? (
            <div className="schedule-attendees__empty-block">
              <p className="schedule-attendees__empty">{t('schedule.noClientsYet')}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onCloseSheet();
                  navigate('/survey');
                }}
              >
                <Plus size={14} /> {t('schedule.addInClients')}
              </button>
            </div>
          ) : (
            <ul className="schedule-attendees__pick">
              {rosterClients.map((client) => {
                const on = isClientOnEvent(event, client);
                const attendee: ScheduleAttendee = {
                  id: client.id,
                  name: client.name,
                  phone: client.phone,
                };
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
                    {rowWhatsApp(attendee, on)}
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
        </>
      )}

      {event.feedbackSentAt && (
        <p className="schedule-attendees__selected">{t('schedule.feedbackAlready')}</p>
      )}

      <div className="schedule-attendees__actions">
        {!classStarted && (event.attendees ?? []).length > 0 && (
          <p className="schedule-attendees__warn">{t('schedule.classNotStarted')}</p>
        )}
        {showSend && !publicOrigin && recipients.length > 0 && (
          <p className="schedule-attendees__warn">{t('schedule.whatsappPrivateOrigin')}</p>
        )}
        {showSend && (
          <p className="schedule-attendees__queue">{t('schedule.sendWhatsAppHint')}</p>
        )}
        {sendStatus && <p className="schedule-attendees__queue">{sendStatus}</p>}
        {sendError && (
          <p className="schedule-attendees__warn" role="alert">
            {sendError}
          </p>
        )}
        {showSend && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={sendDisabled}
            onClick={() => void sendAll()}
          >
            <Send size={14} /> {sendLabel}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={openPreview}>
          <MessageSquare size={14} /> {t('schedule.previewForm')}
        </button>
      </div>
    </div>
  );
}
