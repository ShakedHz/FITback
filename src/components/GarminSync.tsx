import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import { buildWatchPayload, todaysClasses } from '@/utils/liveClasses';
import {
  isGarminSupported,
  onGarminStatusChanged,
  onGarminSyncRequested,
  sendDayToWatch,
} from '@/services/garminWatch';

/**
 * Keeps the Garmin app in step with the schedule: sends today's classes when the app
 * opens, when the schedule or a lesson plan changes, and whenever the watch asks.
 */
export function GarminSync() {
  const { scheduleEvents, arboxConnection, getLessonById, createdLessons } = useApp();
  const { t, locale } = useI18n();

  const latest = useRef({ scheduleEvents, arboxConnection, getLessonById, t, locale });
  latest.current = { scheduleEvents, arboxConnection, getLessonById, t, locale };

  const push = useCallback(() => {
    if (!isGarminSupported()) return;
    const now = new Date();
    const current = latest.current;
    const classes = todaysClasses(current.scheduleEvents, current.arboxConnection, now);
    const payload = buildWatchPayload(classes, current.getLessonById, current.t, current.locale);
    void sendDayToWatch(payload);
  }, []);

  // Data changes: the lesson count covers edits that change a plan's sections.
  useEffect(() => {
    if (!isGarminSupported()) return;
    push();
  }, [push, scheduleEvents, createdLessons, locale]);

  useEffect(() => {
    if (!isGarminSupported()) return;
    const stopSync = onGarminSyncRequested(push);
    const stopStatus = onGarminStatusChanged((status) => {
      if (status.connected && status.appInstalled) push();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') push();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopSync();
      stopStatus();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [push]);

  return null;
}
