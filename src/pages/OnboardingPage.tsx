import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { canAccessApp, useAuth } from '@/auth/AuthContext';
import { SpecialtyPicker } from '@/components/SpecialtyPicker';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { type TrainingType } from '@/data/trainingTypes';
import { instructorBio, translateError, useI18n } from '@/i18n';
import './Auth.css';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isReady, isAuthenticated, updateProfileDetails } = useAuth();
  const { t } = useI18n();
  const [specialties, setSpecialties] = useState<TrainingType[]>(user?.specialties ?? []);
  const [error, setError] = useState<string | null>(null);

  if (isReady && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isReady && canAccessApp(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const previewBio = instructorBio(specialties, t);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      updateProfileDetails({ specialties });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveProfile'));
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-lang">
        <LanguageSwitch />
      </div>
      <div className="auth-page__header">
        <h1 className="auth-page__brand-name" style={{ fontSize: 26 }}>{t('auth.teach')}</h1>
        <p className="auth-page__tagline">{t('auth.onboardingSubtitle')}</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {error && <p className="auth-error">{translateError(t, error)}</p>}

        <SpecialtyPicker value={specialties} onChange={setSpecialties} label={t('auth.iTeach')} />

        {previewBio && (
          <p className="auth-bio-preview">{previewBio}</p>
        )}

        <button type="submit" className="btn btn-primary auth-submit">
          {t('auth.continue')}
        </button>
      </form>
    </div>
  );
}
