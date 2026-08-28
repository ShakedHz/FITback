import { FormEvent, useState } from 'react';
import { Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { canAccessApp, useAuth } from '@/auth/AuthContext';
import { peekPendingInvite } from '@/auth/studioInvite';
import type { AuthUser } from '@/auth/types';
import type { StudioRole } from '@/data/scheduleTypes';
import { BrandLogo } from '@/components/BrandLogo';
import { SpecialtyPicker } from '@/components/SpecialtyPicker';
import { type TrainingType } from '@/data/trainingTypes';
import { instructorBio, translateError, useI18n } from '@/i18n';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import './Auth.css';

type Mode = 'login' | 'register';

function safeReturnPath(from: string | undefined): string | undefined {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return undefined;
  if (
    from === '/login' ||
    from === '/register' ||
    from === '/' ||
    from.startsWith('/auth/')
  ) {
    return undefined;
  }
  return from;
}

function staffRoleLabel(role: StudioRole, t: (key: string) => string): string {
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

function destinationFor(user: AuthUser | null | undefined, from?: string): string {
  if (!canAccessApp(user)) return '/onboarding';
  const path = safeReturnPath(from);
  if (path) return path;
  if (
    user?.role === 'studio_manager' &&
    !user.arboxLinked &&
    (user.memberships?.length ?? 0) === 0
  ) {
    return '/studio';
  }
  return '/dashboard';
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.3 5.3C39.5 36.1 44 30.7 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8s-1.6-.7-2.7-.7c-1.4 0-2.6.8-3.3 2-1.4 2.5-.4 6.1 1 8.1.7 1 1.5 2 2.6 2 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7 1.8-1 2.5-1.9c.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.1zM14.7 6.5c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
    </svg>
  );
}

export function AuthPage({
  initialMode = 'login',
  initialSignupRole = 'instructor',
}: {
  initialMode?: Mode;
  initialSignupRole?: StudioRole;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const mode: Mode =
    location.pathname === '/register' ? 'register' : initialMode;

  const {
    user,
    isAuthenticated,
    isReady,
    isLoading,
    error,
    googleEnabled,
    appleEnabled,
    clearError,
    register,
    loginWithEmail,
    loginWithGoogle,
    loginWithApple,
    loginWithArbox,
  } = useAuth();
  const { t } = useI18n();

  const pendingInvite = peekPendingInvite();
  const [name, setName] = useState(pendingInvite?.name ?? '');
  const [email, setEmail] = useState(pendingInvite?.email ?? '');
  const [password, setPassword] = useState('');
  const [specialties, setSpecialties] = useState<TrainingType[]>([]);
  const [showArbox, setShowArbox] = useState(false);
  const [arboxKey, setArboxKey] = useState('');
  const [arboxTeam, setArboxTeam] = useState<
    { id: string; name: string; role: StudioRole }[] | null
  >(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [signupRole, setSignupRole] = useState<StudioRole>(
    pendingInvite?.role ?? initialSignupRole
  );

  const fromPath = (location.state as { from?: string } | null)?.from;
  const isManagerSignup = signupRole === 'studio_manager';

  if (isReady && isAuthenticated) {
    return <Navigate to={destinationFor(user, fromPath)} replace />;
  }

  const go = (next: Mode) => {
    clearError();
    setLocalError(null);
    if (next === 'register' && !pendingInvite) {
      setSignupRole(initialSignupRole);
    }
    navigate(next === 'login' ? '/login' : '/register', { replace: true });
  };

  const afterAuth = (authUser: AuthUser) => {
    navigate(destinationFor(authUser, fromPath), { replace: true });
  };

  const onArboxLogin = async (instructorId?: string) => {
    setLocalError(null);
    try {
      const result = await loginWithArbox(arboxKey, instructorId);
      switch (result.kind) {
        case 'pick_instructor':
          setArboxTeam(result.team);
          return;
        case 'authenticated':
          setArboxTeam(null);
          afterAuth(result.user);
          return;
        default: {
          const _exhaustive: never = result;
          return _exhaustive;
        }
      }
    } catch {
      // context error
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      if (mode === 'register') {
        if (name.trim().length < 2) {
          setLocalError(t('errors.name'));
          return;
        }
        if (specialties.length === 0 && !pendingInvite && signupRole !== 'studio_manager') {
          setLocalError(t('errors.classType'));
          return;
        }
        const authUser = await register({
          name,
          email,
          password,
          specialties,
          role: signupRole,
        });
        afterAuth(authUser);
      } else {
        const authUser = await loginWithEmail({ email, password });
        afterAuth(authUser);
      }
    } catch {
      // context error
    }
  };

  const run = async (fn: () => Promise<AuthUser>) => {
    setLocalError(null);
    try {
      const authUser = await fn();
      afterAuth(authUser);
    } catch {
      // context error
    }
  };

  const displayError = localError || error;

  const scrollFieldIntoView = (el: HTMLElement) => {
    // Wait for keyboard / viewport settle, then keep the field above the keyboard
    window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 320);
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-lang">
        <LanguageSwitch />
      </div>
      <div className="auth-page__header">
        <BrandLogo size={72} className="auth-page__logo" />
        <h1 className="auth-page__brand-name">
          <span className="auth-page__brand-fit">FIT</span>
          <span className="auth-page__brand-back">back</span>
        </h1>
        <p className="auth-page__tagline">{t('auth.tagline')}</p>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => go('login')}
        >
          {t('auth.login')}
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => go('register')}
        >
          {t('auth.signup')}
        </button>
      </div>

      {pendingInvite && (
        <p className="auth-invite-banner">
          {t('studio.joiningBanner', { studio: pendingInvite.clubName })}
        </p>
      )}

      <div className="auth-social">
        {googleEnabled && (
          <button
            type="button"
            className="auth-social__btn auth-social__btn--google"
            onClick={() => run(loginWithGoogle)}
            disabled={isLoading}
          >
            <GoogleIcon />
            {t('auth.google')}
          </button>
        )}
        {appleEnabled && (
          <button
            type="button"
            className="auth-social__btn auth-social__btn--apple"
            onClick={() => run(loginWithApple)}
            disabled={isLoading}
          >
            <AppleIcon />
            {t('auth.apple')}
          </button>
        )}
        <button
          type="button"
          className="auth-social__btn auth-social__btn--arbox"
          onClick={() => {
            clearError();
            setArboxTeam(null);
            setShowArbox((v) => !v);
          }}
          disabled={isLoading}
        >
          {t('auth.arbox')}
        </button>
      </div>

      {showArbox && (
        <div className="auth-arbox-panel">
          {arboxTeam && arboxTeam.length > 1 ? (
            <>
              <p className="auth-arbox-panel__hint">{t('auth.whichInstructor')}</p>
              <div className="auth-instructor-pick">
                {arboxTeam.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="auth-instructor-pick__btn"
                    onClick={() => void onArboxLogin(member.id)}
                    disabled={isLoading}
                  >
                    {member.name.trim() || member.id}
                    <span className="auth-instructor-pick__role">
                      {staffRoleLabel(member.role, t)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="auth-arbox-panel__hint">{t('auth.arboxHint')}</p>
              {import.meta.env.DEV && (
                <p className="auth-arbox-panel__hint">{t('auth.arboxDemoHint')}</p>
              )}
              <input
                className="input"
                type="password"
                placeholder={t('auth.arboxKey')}
                value={arboxKey}
                onChange={(e) => setArboxKey(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn-primary auth-submit"
                onClick={() => void onArboxLogin()}
                disabled={isLoading || arboxKey.trim().length < 8}
              >
                {isLoading ? t('auth.loadingStudio') : t('auth.loginArbox')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="auth-divider">{t('common.or')}</div>

      <form className="auth-form" onSubmit={onSubmit}>
        {displayError && <p className="auth-error">{translateError(t, displayError)}</p>}

        {mode === 'register' && (
          <input
            className="input"
            type="text"
            placeholder={t('auth.fullName')}
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => {
              clearError();
              setLocalError(null);
              setName(e.target.value);
            }}
            onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
          />
        )}

        {mode === 'register' && !pendingInvite && (
          <div className="auth-role-pick">
            <span className="auth-role-pick__label">{t('auth.signupAs')}</span>
            <div className="auth-role-pick__options">
              <button
                type="button"
                className={`auth-role-pick__btn ${signupRole === 'instructor' ? 'active' : ''}`}
                onClick={() => setSignupRole('instructor')}
              >
                {t('auth.instructor')}
              </button>
              <button
                type="button"
                className={`auth-role-pick__btn ${signupRole === 'studio_manager' ? 'active' : ''}`}
                onClick={() => setSignupRole('studio_manager')}
              >
                {t('auth.studioManager')}
              </button>
            </div>
            {isManagerSignup && (
              <p className="auth-role-pick__hint">{t('auth.managerSignupHint')}</p>
            )}
          </div>
        )}

        <input
          className="input"
          type="email"
          placeholder={t('auth.email')}
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => {
            clearError();
            setLocalError(null);
            setEmail(e.target.value);
          }}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
        />

        <input
          className="input"
          type="password"
          placeholder={t('auth.password')}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => {
            clearError();
            setLocalError(null);
            setPassword(e.target.value);
          }}
          onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
        />

        {mode === 'register' && !isManagerSignup && (
          <>
            <SpecialtyPicker
              value={specialties}
              onChange={(next) => {
                clearError();
                setLocalError(null);
                setSpecialties(next);
              }}
            />
            {specialties.length > 0 && (
              <p className="auth-bio-preview">{instructorBio(specialties, t)}</p>
            )}
          </>
        )}

        <button type="submit" className="btn btn-primary auth-submit" disabled={isLoading}>
          {isLoading
            ? mode === 'login'
              ? t('auth.signingIn')
              : t('auth.creating')
            : mode === 'login'
              ? t('auth.login')
              : t('auth.createAccount')}
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          className="auth-client-link"
          onClick={() => navigate('/register/manager')}
        >
          {t('auth.signupAsManager')}
        </button>
      )}

      <button
        type="button"
        className="auth-client-link"
        onClick={() => navigate('/feedback/demo')}
      >
        {t('auth.clientFeedback')}
      </button>
    </div>
  );
}

export function LoginPage() {
  return <AuthPage initialMode="login" />;
}

export function RegisterPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const initialSignupRole: StudioRole =
    location.pathname === '/register/manager' || params.get('as') === 'manager'
      ? 'studio_manager'
      : 'instructor';
  return <AuthPage initialMode="register" initialSignupRole={initialSignupRole} />;
}
