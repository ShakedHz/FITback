import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import { toDateKey } from '@/data/scheduleTypes';
import { classNotificationBody, planIdOf, summaryBody, todaysClasses } from '@/utils/liveClasses';
import {
  markReminderSent,
  onWatchSettingsChange,
  readWatchSettings,
  showWatchNotification,
} from '@/utils/watchReminders';

const TICK_MS = 20_000;
/** A reminder older than this is skipped instead of firing late. */
const GRACE_MS = 5 * 60_000;
const SUMMARY_FROM_HOUR = 6;

/**
 * Fires class reminders as system notifications, which the phone mirrors to a paired watch.
 * Runs only while the app is alive; there is no push server.
 */
export function LiveReminders() {
  const { scheduleEvents, arboxConnection, getLessonById } = useApp();
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState(readWatchSettings);

  useEffect(() => onWatchSettingsChange(() => setSettings(readWatchSettings())), []);

  useEffect(() => {
    if (!settings.enabled) return;

    const check = () => {
      const now = new Date();
      const dayKey = toDateKey(now);
      const classes = todaysClasses(scheduleEvents, arboxConnection, now);

      if (
        settings.dailySummary &&
        now.getHours() >= SUMMARY_FROM_HOUR &&
        classes.some((c) => c.status !== 'done') &&
        markReminderSent('summary', dayKey)
      ) {
        void showWatchNotification(
          t('live.summaryTitle', { n: classes.length }),
          summaryBody(classes),
          `summary_${dayKey}`
        );
      }

      classes
        .filter((c) => c.status !== 'done')
        .forEach((c) => {
          const planId = planIdOf(c.event);
          const lesson = planId ? getLessonById(planId) : undefined;
          const body = classNotificationBody(c, lesson, t, locale);
          const url = planId ? `/lesson/${planId}` : '/live';
          const triggers = [
            {
              tag: `lead_${c.event.id}_${settings.leadMinutes}`,
              at: c.start.getTime() - settings.leadMinutes * 60_000,
              title: t('live.reminderTitle', { title: c.title, n: settings.leadMinutes }),
            },
            ...(settings.atStart
              ? [{ tag: `start_${c.event.id}`, at: c.start.getTime(), title: t('live.startTitle', { title: c.title }) }]
              : []),
          ];
          triggers.forEach((trigger) => {
            const diff = now.getTime() - trigger.at;
            if (diff < 0 || diff > GRACE_MS) return;
            if (!markReminderSent(trigger.tag, dayKey)) return;
            void showWatchNotification(trigger.title, body, trigger.tag, url);
          });
        });
    };

    check();
    const id = window.setInterval(check, TICK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [settings, scheduleEvents, arboxConnection, getLessonById, t, locale]);

  return null;
}
