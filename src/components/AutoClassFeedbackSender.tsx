import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  FEEDBACK_CHECK_EVENT,
  buildClassFeedbackMessage,
  findPendingFeedbackEvents,
  getAttendeesWithPhone,
} from '@/services/classFeedback';
import { dispatchClassFeedback } from '@/services/autoFeedbackDispatch';
import { isMobileDevice, openSms } from '@/utils/sms';
import './AutoClassFeedbackSender.css';

type Toast =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

interface NativeQueue {
  eventId: string;
  eventTitle: string;
  phones: string[];
  message: string;
  index: number;
}

/**
 * Sends feedback when a class ends.
 * - iPhone/Android: opens Messages automatically (tap Send in Messages — required by Apple).
 * - Mac/desktop: sends silently via the local SMS relay.
 */
export function AutoClassFeedbackSender() {
  const {
    scheduleEvents,
    autoClassFeedbackEnabled,
    arboxConnection,
    markEventFeedbackSent,
    isLoggedIn,
  } = useApp();
  const [toast, setToast] = useState<Toast | null>(null);
  const processingRef = useRef<Set<string>>(new Set());
  const nativeQueueRef = useRef<NativeQueue | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const useNativeSms = isMobileDevice();

  const showToast = useCallback((next: Toast) => {
    setToast(next);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const finishNative = useCallback(
    (q: NativeQueue) => {
      markEventFeedbackSent(q.eventId);
      processingRef.current.delete(q.eventId);
      nativeQueueRef.current = null;
      showToast({
        kind: 'success',
        text: `Feedback sent to ${q.phones.length} participant${q.phones.length === 1 ? '' : 's'} · ${q.eventTitle}`,
      });
    },
    [markEventFeedbackSent, showToast]
  );

  const openNativeSms = useCallback((q: NativeQueue) => {
    const phone = q.phones[q.index];
    if (!phone) return;
    openSms(phone, q.message);
  }, []);

  const continueNativeQueue = useCallback(() => {
    const q = nativeQueueRef.current;
    if (!q) return;

    if (q.index >= q.phones.length) {
      finishNative(q);
      return;
    }

    openNativeSms(q);
    q.index += 1;

    if (q.index >= q.phones.length) {
      // Last recipient — mark done after opening Messages
      window.setTimeout(() => finishNative(q), 400);
    }
  }, [finishNative, openNativeSms]);

  const startNativeSend = useCallback(
    (event: (typeof scheduleEvents)[0], phones: string[]) => {
      const message = buildClassFeedbackMessage(event);
      nativeQueueRef.current = {
        eventId: event.id,
        eventTitle: event.title,
        phones,
        message,
        index: 0,
      };
      showToast({
        kind: 'success',
        text: `Opening Messages for ${phones.length} participant${phones.length === 1 ? '' : 's'} · ${event.title}`,
      });
      openNativeSms(nativeQueueRef.current);
      nativeQueueRef.current.index = 1;
    },
    [openNativeSms, showToast]
  );

  const processQueue = useCallback(async () => {
    if (!isLoggedIn || !autoClassFeedbackEnabled) return;
    if (nativeQueueRef.current) return;

    const pending = findPendingFeedbackEvents(scheduleEvents, new Date(), {
      arboxConnection,
    }).filter((ev) => !processingRef.current.has(ev.id));

    for (const event of pending) {
      processingRef.current.add(event.id);
      let keepProcessing = false;
      try {
        const phones = getAttendeesWithPhone(event).map((a) => a.phone!);
        if (phones.length === 0) {
          showToast({
            kind: 'error',
            text: `No phone numbers for "${event.title}" — add clients in Clients`,
          });
          continue;
        }

        if (useNativeSms) {
          startNativeSend(event, phones);
          keepProcessing = true;
          break;
        }

        const result = await dispatchClassFeedback(event, arboxConnection);
        if (result.sent === 0) {
          showToast({
            kind: 'error',
            text: `Could not send feedback for "${event.title}"`,
          });
          continue;
        }

        markEventFeedbackSent(event.id);
        showToast({
          kind: 'success',
          text: `Feedback sent to ${result.sent} participant${result.sent === 1 ? '' : 's'} · ${event.title}`,
        });
      } catch (err) {
        showToast({
          kind: 'error',
          text: err instanceof Error ? err.message : 'Feedback send failed',
        });
      } finally {
        if (!keepProcessing) processingRef.current.delete(event.id);
      }
    }
  }, [
    isLoggedIn,
    autoClassFeedbackEnabled,
    scheduleEvents,
    arboxConnection,
    markEventFeedbackSent,
    showToast,
    useNativeSms,
    startNativeSend,
  ]);

  useEffect(() => {
    void processQueue();
  }, [scheduleEvents, processQueue]);

  useEffect(() => {
    void processQueue();
    const id = window.setInterval(() => void processQueue(), 10_000);

    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (nativeQueueRef.current) {
        continueNativeQueue();
      } else {
        void processQueue();
      }
    };

    const onCheck = () => void processQueue();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onCheck);
    window.addEventListener(FEEDBACK_CHECK_EVENT, onCheck);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onCheck);
      window.removeEventListener(FEEDBACK_CHECK_EVENT, onCheck);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [processQueue, continueNativeQueue]);

  if (!toast) return null;

  return (
    <div
      className={`auto-feedback-toast auto-feedback-toast--${toast.kind}`}
      role="status"
      aria-live="polite"
    >
      {toast.kind === 'success' ? (
        <CheckCircle2 size={18} aria-hidden />
      ) : (
        <AlertCircle size={18} aria-hidden />
      )}
      <span>{toast.text}</span>
    </div>
  );
}
