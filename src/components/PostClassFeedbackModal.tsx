import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  buildClassFeedbackMessage,
  dismissClassFeedback,
  FEEDBACK_CHECK_EVENT,
  findPendingFeedbackEvents,
  getAttendeesWithPhone,
  hasLiveArboxMessaging,
  wasClassFeedbackDismissed,
} from '@/services/classFeedback';
import { openSms } from '@/utils/sms';
import type { ScheduleEvent } from '@/data/scheduleTypes';
import './PostClassFeedbackModal.css';

export function PostClassFeedbackModal() {
  const {
    scheduleEvents,
    autoClassFeedbackEnabled,
    arboxConnection,
    markEventFeedbackSent,
    isLoggedIn,
  } = useApp();
  const [event, setEvent] = useState<ScheduleEvent | null>(null);
  const [phones, setPhones] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const feedbackScope = useMemo(
    () => ({ arboxConnection }),
    [arboxConnection]
  );

  const refreshPending = useCallback(() => {
    if (!isLoggedIn || !autoClassFeedbackEnabled) {
      setEvent(null);
      return;
    }
    // Live Arbox API sends server-side — modal only drives native SMS in the app.
    if (arboxConnection.connected && hasLiveArboxMessaging()) {
      setEvent(null);
      return;
    }
    const pending = findPendingFeedbackEvents(scheduleEvents, new Date(), feedbackScope).filter(
      (ev) => !wasClassFeedbackDismissed(ev.id)
    );
    const next = pending[0] ?? null;
    setEvent((current) => {
      if (current && pending.some((ev) => ev.id === current.id)) return current;
      return next;
    });
  }, [isLoggedIn, autoClassFeedbackEnabled, scheduleEvents, feedbackScope, arboxConnection.connected]);

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
      setPhones([]);
      setIndex(0);
      return;
    }
    setPhones(getAttendeesWithPhone(event).map((a) => a.phone!));
    setIndex(0);
  }, [event?.id]);

  if (!event || phones.length === 0) return null;

  const message = buildClassFeedbackMessage(event);
  const remaining = phones.length - index;

  const finish = () => {
    markEventFeedbackSent(event.id);
    setEvent(null);
    setPhones([]);
    setIndex(0);
    // Pick up the next ended class on the next tick
    window.setTimeout(refreshPending, 300);
  };

  const sendCurrent = () => {
    const phone = phones[index];
    if (!phone) return;
    openSms(phone, message);
    if (index >= phones.length - 1) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  };

  const skip = () => {
    dismissClassFeedback(event.id);
    setEvent(null);
    window.setTimeout(refreshPending, 300);
  };

  return createPortal(
    <div className="post-feedback-overlay" role="dialog" aria-modal="true" aria-labelledby="post-feedback-title">
      <div className="post-feedback-modal">
        <button type="button" className="post-feedback-modal__close" onClick={skip} aria-label="Dismiss">
          <X size={18} />
        </button>
        <div className="post-feedback-modal__icon">
          <MessageSquare size={22} color="#a78bfa" />
        </div>
        <h2 id="post-feedback-title" className="post-feedback-modal__title">
          Class ended
        </h2>
        <p className="post-feedback-modal__class">{event.title}</p>
        <p className="post-feedback-modal__text">
          {event.source === 'arbox' ? (
            <>
              Send feedback SMS to <strong>{phones.length}</strong>{' '}
              {phones.length === 1 ? 'registered participant' : 'registered participants'} from
              Arbox.
            </>
          ) : (
            <>
              Send feedback SMS to <strong>{phones.length}</strong>{' '}
              {phones.length === 1 ? 'participant' : 'participants'} from this class.
            </>
          )}
        </p>
        {index > 0 && (
          <p className="post-feedback-modal__progress">
            SMS {index + 1} of {phones.length} — tap Send in Messages, then continue.
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={sendCurrent}>
          <Send size={16} />
          {index === 0
            ? `Send SMS to ${phones.length}`
            : `Send next (${remaining} left)`}
        </button>
        <button type="button" className="btn btn-ghost post-feedback-modal__later" onClick={skip}>
          Later
        </button>
      </div>
    </div>,
    document.body
  );
}
