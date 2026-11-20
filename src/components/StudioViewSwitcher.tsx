import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { StudioRole } from '@/data/scheduleTypes';
import type { StudioMembership } from '@/data/studioOrg';
import { homePathForMembership, useAuth } from '@/auth/AuthContext';
import { translateError, useI18n } from '@/i18n';
import { DEMO_INSTRUCTOR_API_KEY } from '@/services/arboxApi';
import './StudioViewSwitcher.css';

function roleLabel(role: StudioRole, t: (key: string) => string): string {
  switch (role) {
    case 'studio_manager':
      return t('auth.studioManager');
    case 'instructor':
      return t('auth.instructor');
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function viewSummary(role: StudioRole, t: (key: string) => string): string {
  switch (role) {
    case 'studio_manager':
      return t('settings.managerViewSummary');
    case 'instructor':
      return t('settings.instructorViewSummary');
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function StudioSetupActions({
  compact = false,
  stayOnPage = false,
}: {
  compact?: boolean;
  stayOnPage?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, createLocalStudio, addStudioWithArbox } = useAuth();
  const { t } = useI18n();
  const [studioName, setStudioName] = useState('');
  const [studioKey, setStudioKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const keepCurrentPage =
    stayOnPage || location.pathname === '/settings' || location.pathname === '/profile';

  const goHome = (membership: StudioMembership) => {
    if (keepCurrentPage) return;
    navigate(homePathForMembership(membership), { replace: true });
  };

  const onCreateStudio = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = studioName.trim() || user?.name || 'My Studio';
    void createLocalStudio(name)
      .then((next) => {
        const membership =
          next.memberships.find((m) => m.clubId === next.activeStudioId) ?? next.memberships[0];
        if (membership) goHome(membership);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.arboxFailed'));
      });
  };

  const onJoinInstructorDemo = () => {
    setError(null);
    void addStudioWithArbox(DEMO_INSTRUCTOR_API_KEY, 'staff-maya')
      .then((result) => {
        if (result.kind !== 'authenticated') return;
        const membership =
          result.user.memberships.find((m) => m.clubId === result.user.activeStudioId) ??
          result.user.memberships[result.user.memberships.length - 1];
        if (membership) goHome(membership);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.arboxFailed'));
      });
  };

  const onConnectStudio = () => {
    setError(null);
    const key = studioKey.trim();
    if (key.length < 8) return;
    void addStudioWithArbox(key)
      .then((result) => {
        if (result.kind === 'pick_instructor') {
          setError(t('settings.pickInstructorOnStudioPage'));
          return;
        }
        if (result.kind !== 'authenticated') return;
        const membership =
          result.user.memberships.find((m) => m.clubId === result.user.activeStudioId) ??
          result.user.memberships[result.user.memberships.length - 1];
        if (membership) goHome(membership);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.arboxFailed'));
      });
  };

  return (
    <div className={`studio-view-setup${compact ? ' studio-view-setup--compact' : ''}`}>
      <div className="studio-view-setup__block">
        <p className="studio-view-setup__title">{t('settings.createStudioTitle')}</p>
        <p className="studio-view-setup__hint">{t('studio.setupHint')}</p>
        <form className="studio-view-setup__form" onSubmit={onCreateStudio}>
          <input
            className="input"
            type="text"
            placeholder={t('studio.localNamePlaceholder')}
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {t('studio.createWithoutArbox')}
          </button>
        </form>
      </div>

      <div className="studio-view-setup__block">
        <p className="studio-view-setup__title">{t('settings.joinStudioTitle')}</p>
        <p className="studio-view-setup__hint">{t('settings.joinStudioHint')}</p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isLoading}
          onClick={onJoinInstructorDemo}
        >
          {t('settings.joinInstructorDemo')}
        </button>
        <button
          type="button"
          className="btn btn-ghost studio-view-setup__toggle"
          onClick={() => setShowConnect((v) => !v)}
        >
          {showConnect ? t('common.cancel') : t('settings.connectWithKey')}
        </button>
        {showConnect && (
          <div className="studio-view-setup__connect">
            <p className="studio-view-setup__hint">{t('studio.demoKeyHint')}</p>
            <input
              className="input"
              type="password"
              placeholder={t('auth.arboxKey')}
              value={studioKey}
              onChange={(e) => setStudioKey(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={isLoading || studioKey.trim().length < 8}
              onClick={onConnectStudio}
            >
              {isLoading ? t('auth.loadingStudio') : t('studio.addStudioAction')}
            </button>
          </div>
        )}
      </div>

      {error && <p className="studio-view-setup__error">{translateError(t, error)}</p>}
    </div>
  );
}

export function StudioViewSwitcher({
  memberships,
  stayOnPage = false,
  showSetup = true,
}: {
  memberships: StudioMembership[];
  stayOnPage?: boolean;
  showSetup?: boolean;
}) {
  const location = useLocation();
  const { user, switchStudioView } = useAuth();
  const { t } = useI18n();
  const activeId = user?.activeStudioId;
  const active = memberships.find((m) => m.clubId === activeId) ?? memberships[0];

  const keepCurrentPage =
    stayOnPage || location.pathname === '/settings' || location.pathname === '/profile';

  if (memberships.length === 0) {
    if (!showSetup) return null;
    return (
      <div className="studio-view-switcher">
        <p className="studio-view-switcher__lead">{t('settings.noStudioYet')}</p>
        <StudioSetupActions stayOnPage={keepCurrentPage} />
      </div>
    );
  }

  const pickView = (clubId: string) => {
    if (clubId === activeId) return;
    switchStudioView(clubId);
  };

  return (
    <div className="studio-view-switcher">
      <p className="studio-view-switcher__lead">{t('settings.switchViewHint')}</p>

      {memberships.length > 1 ? (
        <div className="studio-view-switcher__list" role="radiogroup" aria-label={t('settings.switchView')}>
          {memberships.map((studio) => {
            const isActive = studio.clubId === activeId;
            return (
              <button
                key={studio.clubId}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`studio-view-switcher__option${isActive ? ' is-active' : ''}`}
                onClick={() => pickView(studio.clubId)}
              >
                <span className="studio-view-switcher__option-top">
                  <span className="studio-view-switcher__name">{studio.clubName}</span>
                  {isActive && (
                    <span className="studio-view-switcher__badge">{t('settings.currentView')}</span>
                  )}
                </span>
                <span className="studio-view-switcher__role">{roleLabel(studio.role, t)}</span>
                <span className="studio-view-switcher__summary">{viewSummary(studio.role, t)}</span>
              </button>
            );
          })}
        </div>
      ) : active ? (
        <>
          <div className="studio-view-switcher__single card">
            <p className="studio-view-switcher__name">{active.clubName}</p>
            <p className="studio-view-switcher__role">{roleLabel(active.role, t)}</p>
            <p className="studio-view-switcher__summary">{viewSummary(active.role, t)}</p>
          </div>
          <p className="studio-view-switcher__single-hint">{t('settings.singleViewHint')}</p>
        </>
      ) : null}

      {showSetup && <StudioSetupActions compact stayOnPage={keepCurrentPage} />}
    </div>
  );
}
