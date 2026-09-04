import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import {
  dismissClassFeedback,
  FEEDBACK_CHECK_EVENT,
  findPendingFeedbackEvents,
  getAttendeesWithPhone,
  isFeedbackModalCooldownActive,
  isPublicSurveyOrigin,
  startFeedbackModalCooldown,
  wasClassFeedbackDismissed,
} from '@/services/classFeedback';
import { sendStudioFeedbackToAttendees } from '@/services/whatsappCloud';
import type { ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import { translateError, useI18n } from '@/i18n';
import './PostClassFeedbackModal.css';

export function PostClassFeedbackModal() {
  const { t } = useI18n();
  const {
    scheduleEvents,
    autoClassFeedbackEnabled,
    arboxConnection,
    markEventFeedbackSent,
    isLoggedIn,
  } = useApp();
  const [event, setEvent] = useState<ScheduleEvent | null>(null);
  const [recipients, setRecipients] = useState<ScheduleAttendee[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const feedbackRole = arboxConnection.role;
  const feedbackConnected = arboxConnection.connected;

  const refreshPending = useCallback(() => {
    if (!isLoggedIn || !autoClassFeedbackEnabled || isFeedbackModalCooldownActive()) {
      setEvent(null);
      return;
    }
    const scope = {
      arboxConnection: feedbackConnected
        ? { ...arboxConnection, role: feedbackRole, connected: feedbackConnected }
        : arboxConnection,
    };
    const pending = findPendingFeedbackEvents(scheduleEvents, new Date(), scope).filter(
      (ev) => !wasClassFeedbackDismissed(ev.id)
    );
    const next = pending[0] ?? null;
    setEvent((current) => {
      if (current && pending.some((ev) => ev.id === current.id)) return current;
      return next;
    });
  }, [
    isLoggedIn,
    autoClassFeedbackEnabled,
    scheduleEvents,
    feedbackConnected,
    feedbackRole,
    arboxConnection.clubId,
    arboxConnection.linkedInstructorId,
  ]);

  useEffect(() => {
    refreshPending();
    const id = window.setInterval(refreshPending, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshPending();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refreshPending);
    window.addEventListener(FEEDBACK_CHECK_EVENT, refreshPending);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refreshPending);
      window.removeEventListener(FEEDBACK_CHECK_EVENT, refreshPending);
    };
  }, [refreshPending]);

  useEffect(() => {
    if (!event) {
      setRecipients([]);
      setProgress(null);
      setError(null);
      return;
    }
    setRecipients(getAttendeesWithPhone(event));
    setProgress(null);
    setError(null);
  }, [event?.id]);

  const skip = useCallback(() => {
    if (!event) return;
    dismissClassFeedback(event.id);
    setEvent(null);
    setRecipients([]);
    startFeedbackModalCooldown();
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) skip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event, busy, skip]);

  if (!event || recipients.length === 0) return null;

  const publicOrigin = isPublicSurveyOrigin();

  const finish = () => {
    markEventFeedbackSent(event.id);
    setEvent(null);
    setRecipients([]);
    startFeedbackModalCooldown();
  };

  const sendAll = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setProgress({ sent: 0, total: recipients.length });
    const result = await sendStudioFeedbackToAttendees(recipients, event, t, (sent, total) => {
      setProgress({ sent, total });
    });
    setBusy(false);
    if (result.sent > 0 && result.failed === 0) {
      finish();
      return;
    }
    if (result.sent > 0) markEventFeedbackSent(event.id);
    setError(
      translateError(t, result.lastError) ||
        t('schedule.sentWhatsAppPartial', { sent: result.sent, failed: result.failed })
    );
  };

  const cta =
    busy && progress
      ? t('schedule.sendingWhatsApp', { current: progress.sent, total: progress.total })
      : t('schedule.sendWhatsAppToCount', { count: recipients.length });

  return createPortal(
    <div
      className="post-feedback-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-feedback-title"
      onClick={skip}
    >
      <div
        className="post-feedback-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="post-feedback-modal__close"
          onClick={skip}
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>
        <div className="post-feedback-modal__icon">
          <WhatsAppIcon size={22} />
        </div>
        <h2 id="post-feedback-title" className="post-feedback-modal__title">
          {t('schedule.classEnded')}
        </h2>
        <p className="post-feedback-modal__class">{event.title}</p>
        <p className="post-feedback-modal__text">
          {t('schedule.sendWhatsAppBody', { count: recipients.length, title: event.title })}
        </p>
        <p className="post-feedback-modal__progress">{t('schedule.sendWhatsAppHint')}</p>
        {!publicOrigin && (
          <p className="post-feedback-modal__warn">{t('schedule.whatsappPrivateOrigin')}</p>
        )}
        {error && <p className="post-feedback-modal__warn">{error}</p>}
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void sendAll()}>
          <Send size={16} />
          {cta}
        </button>
        <button type="button" className="btn btn-ghost post-feedback-modal__later" onClick={skip}>
          {t('schedule.later')}
        </button>
      </div>
    </div>,
    document.body
  );
}
