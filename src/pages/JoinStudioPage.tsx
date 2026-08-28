import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { canAccessApp, useAuth } from '@/auth/AuthContext';
import {
  decodeInviteToken,
  peekPendingInvite,
  stashPendingInvite,
} from '@/auth/studioInvite';
import { BrandLogo } from '@/components/BrandLogo';
import type { StudioRole } from '@/data/scheduleTypes';
import { BRAND } from '@/data/brand';
import { useI18n } from '@/i18n';
import './Auth.css';

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

export function JoinStudioPage() {
  const { user, isAuthenticated, isReady, acceptStudioInvite } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const payload = useMemo(() => {
    const fromQuery = decodeInviteToken(params.get('t') ?? '');
    return fromQuery ?? peekPendingInvite();
  }, [params]);

  const alreadyMember = Boolean(
    payload && user?.memberships?.some((m) => m.clubId === payload.clubId)
  );
  const mismatch = Boolean(
    isAuthenticated &&
      user?.email &&
      payload &&
      user.email.trim().toLowerCase() !== payload.email &&
      !user.email.endsWith('@arbox.fitback.app')
  );

  useEffect(() => {
    if (!isReady || !payload || !isAuthenticated || mismatch || alreadyMember) return;
    try {
      stashPendingInvite(payload);
      const next = acceptStudioInvite(payload);
      navigate(canAccessApp(next) ? '/studio' : '/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.inviteInvalid'));
    }
  }, [
    acceptStudioInvite,
    alreadyMember,
    isAuthenticated,
    isReady,
    mismatch,
    navigate,
    payload,
    t,
  ]);

  useEffect(() => {
    if (isReady && alreadyMember) navigate('/studio', { replace: true });
  }, [alreadyMember, isReady, navigate]);

  if (!isReady) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="page auth-page fade-in">
        <BrandLogo size={64} className="auth-page__logo" />
        <p className="auth-error">{t('errors.inviteInvalid')}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
          {t('auth.login')}
        </button>
      </div>
    );
  }

  if (isAuthenticated && !mismatch && !error) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="page auth-page fade-in">
      <div className="auth-page__header">
        <BrandLogo size={64} className="auth-page__logo" />
        <h1 className="auth-page__brand-name">{BRAND.name}</h1>
        <p className="page-title" style={{ marginTop: 12 }}>
          {t('studio.joinTitle', { studio: payload.clubName })}
        </p>
        <p className="page-subtitle">
          {t('studio.joinAs', { role: roleLabel(payload.role, t) })}
        </p>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {mismatch && user && (
        <p className="auth-invite-banner">
          {t('studio.joinMismatch', { email: payload.email, current: user.email })}
        </p>
      )}

      {isAuthenticated ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            try {
              const next = acceptStudioInvite(payload, { allowEmailMismatch: true });
              navigate(canAccessApp(next) ? '/studio' : '/onboarding', { replace: true });
            } catch (err) {
              setError(err instanceof Error ? err.message : t('errors.inviteInvalid'));
            }
          }}
        >
          {t('studio.joinAnyway')}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              stashPendingInvite(payload);
              navigate('/register', { replace: true, state: { from: '/join' } });
            }}
          >
            {t('studio.joinRegister')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              stashPendingInvite(payload);
              navigate('/login', { replace: true, state: { from: '/join' } });
            }}
          >
            {t('studio.joinSignIn')}
          </button>
        </div>
      )}
    </div>
  );
}
