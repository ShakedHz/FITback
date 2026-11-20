import { useEffect, useMemo, useState } from 'react';
import { Download, Send, Watch } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';
import { BackButton } from '@/components/IconToolbar';
import { buildWatchPayload, todaysClasses, type LiveClass } from '@/utils/liveClasses';
import {
  notifyAvailability,
  onWatchSettingsChange,
  readWatchSettings,
  requestNotifyPermission,
  showWatchNotification,
  writeWatchSettings,
  type NotifyAvailability,
} from '@/utils/watchReminders';
import {
  forgetGarminDevice,
  getGarminStatus,
  isGarminSupported,
  onGarminStatusChanged,
  openGarminStore,
  selectGarminDevice,
  sendDayToWatch,
  type GarminStatus,
} from '@/services/garminWatch';
import './Settings.css';
import './Live.css';

/** Connection screen for the two watches FITback can talk to: Garmin and Apple Watch. */
export function LivePage() {
  const { scheduleEvents, arboxConnection } = useApp();
  const { t } = useI18n();

  const classes = useMemo(
    () => todaysClasses(scheduleEvents, arboxConnection, new Date()),
    [scheduleEvents, arboxConnection]
  );

  return (
    <div className="page fade-in live-page">
      <BackButton to="/settings" label={t('common.back')} />

      <header className="page-header">
        <h1 className="page-title">{t('watch.title')}</h1>
        <p className="page-subtitle">{t('watch.subtitle')}</p>
      </header>

      <GarminCard classes={classes} />
      <AppleWatchCard />
    </div>
  );
}

type Tone = 'ok' | 'warn' | 'off';

function WatchCard({
  name,
  state,
  tone,
  hint,
  steps,
  children,
  footer,
}: {
  name: string;
  state: string;
  tone: Tone;
  hint: string;
  steps?: string[];
  children?: React.ReactNode;
  footer?: string;
}) {
  return (
    <section className={`card live-watch is-${tone}`}>
      <div className="live-watch__head">
        <span className="live-watch__badge" aria-hidden>
          <Watch size={20} />
        </span>
        <div className="live-watch__id">
          <p className="live-watch__name">{name}</p>
          <p className="live-watch__state">
            <i className="live-watch__dot" aria-hidden />
            {state}
          </p>
        </div>
      </div>

      <p className="live-watch__hint">{hint}</p>

      {steps?.length ? (
        <ol className="live-watch__steps">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ) : null}

      {children ? <div className="live-watch__actions">{children}</div> : null}
      {footer ? <p className="live-watch__auto">{footer}</p> : null}
    </section>
  );
}

type GarminState = 'unavailable' | 'notConnected' | 'outOfRange' | 'appMissing' | 'ready';

const GARMIN_TONE: Record<GarminState, Tone> = {
  unavailable: 'off',
  notConnected: 'off',
  outOfRange: 'warn',
  appMissing: 'warn',
  ready: 'ok',
};

function GarminCard({ classes }: { classes: LiveClass[] }) {
  const { getLessonById } = useApp();
  const { t, locale } = useI18n();
  const supported = isGarminSupported();
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [busy, setBusy] = useState<'connect' | 'sync' | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    void getGarminStatus().then(setStatus);
    return onGarminStatusChanged(setStatus);
  }, [supported]);

  const state: GarminState = !supported
    ? 'unavailable'
    : !status?.hasDevice
      ? 'notConnected'
      : !status.connected
        ? 'outOfRange'
        : !status.appInstalled
          ? 'appMissing'
          : 'ready';

  const connect = async () => {
    setBusy('connect');
    setResult(null);
    try {
      setStatus(await selectGarminDevice());
    } catch {
      setResult(t('garmin.selectFailed'));
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    setResult(null);
    const payload = buildWatchPayload(classes, getLessonById, t, locale);
    const sent = await sendDayToWatch(payload);
    setResult(
      sent.ok ? t('garmin.synced', { n: payload.c.length }) : t('garmin.syncFailed', { reason: sent.result })
    );
    setBusy(null);
  };

  const forget = async () => {
    const name = status?.deviceName || t('garmin.noDevice');
    if (!window.confirm(t('garmin.forgetConfirm', { name }))) return;
    setStatus(await forgetGarminDevice());
    setResult(null);
  };

  return (
    <WatchCard
      name={state === 'unavailable' ? t('garmin.title') : status?.deviceName || t('garmin.noDevice')}
      state={t(`garmin.${state}`)}
      tone={GARMIN_TONE[state]}
      hint={result ?? t(`garmin.${state}Hint`)}
      steps={state === 'notConnected' && supported ? [t('garmin.step1'), t('garmin.step2'), t('garmin.step3')] : undefined}
      footer={state === 'ready' ? t('garmin.autoNote') : undefined}
    >
      {supported ? (
        <>
          {state === 'notConnected' ? (
            <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={connect}>
              <Watch size={16} aria-hidden />
              {busy === 'connect' ? t('garmin.connecting') : t('garmin.connect')}
            </button>
          ) : null}
          {state === 'appMissing' ? (
            <button type="button" className="btn btn-primary" onClick={() => void openGarminStore()}>
              <Download size={16} aria-hidden />
              {t('garmin.install')}
            </button>
          ) : null}
          {state === 'ready' || state === 'outOfRange' ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null || state !== 'ready'}
              onClick={sync}
            >
              <Send size={16} aria-hidden />
              {busy === 'sync' ? t('garmin.sending') : t('garmin.syncNow')}
            </button>
          ) : null}
          {status?.hasDevice ? (
            <button type="button" className="btn btn-ghost live-watch__forget" onClick={forget}>
              {t('garmin.forget')}
            </button>
          ) : null}
        </>
      ) : null}
    </WatchCard>
  );
}

type AppleState = 'ready' | 'off' | 'denied' | 'needsInstall' | 'unsupported';

const APPLE_TONE: Record<AppleState, Tone> = {
  ready: 'ok',
  off: 'off',
  denied: 'warn',
  needsInstall: 'warn',
  unsupported: 'off',
};

/**
 * Apple Watch has no third-party pairing API, so "connecting" means allowing
 * notifications on the iPhone: watchOS mirrors them to the watch by itself.
 */
function AppleWatchCard() {
  const { t } = useI18n();
  const [availability, setAvailability] = useState<NotifyAvailability>(notifyAvailability);
  const [enabled, setEnabled] = useState(() => readWatchSettings().enabled);
  const [sent, setSent] = useState(false);

  useEffect(() => onWatchSettingsChange(() => setEnabled(readWatchSettings().enabled)), []);

  const state: AppleState =
    availability === 'unsupported'
      ? 'unsupported'
      : availability === 'needs-install'
        ? 'needsInstall'
        : availability === 'denied'
          ? 'denied'
          : enabled && availability === 'granted'
            ? 'ready'
            : 'off';

  const connect = async () => {
    const result = await requestNotifyPermission();
    setAvailability(result);
    if (result === 'granted') writeWatchSettings({ ...readWatchSettings(), enabled: true });
  };

  const disconnect = () => {
    if (!window.confirm(t('apple.disconnectConfirm'))) return;
    writeWatchSettings({ ...readWatchSettings(), enabled: false });
  };

  const test = async () => {
    const ok = await showWatchNotification(t('apple.testTitle'), t('apple.testBody'), 'fitback_test');
    if (!ok) return;
    setSent(true);
    window.setTimeout(() => setSent(false), 2500);
  };

  return (
    <WatchCard
      name={t('apple.title')}
      state={t(`apple.${state}`)}
      tone={APPLE_TONE[state]}
      hint={t(`apple.${state}Hint`)}
      footer={state === 'ready' ? t('apple.autoNote') : undefined}
    >
      {state === 'off' ? (
        <button type="button" className="btn btn-primary" onClick={connect}>
          <Watch size={16} aria-hidden />
          {t('apple.connect')}
        </button>
      ) : null}
      {state === 'ready' ? (
        <>
          <button type="button" className="btn btn-primary" onClick={test}>
            <Send size={16} aria-hidden />
            {sent ? t('apple.sent') : t('apple.test')}
          </button>
          <button type="button" className="btn btn-ghost live-watch__forget" onClick={disconnect}>
            {t('apple.disconnect')}
          </button>
        </>
      ) : null}
    </WatchCard>
  );
}
