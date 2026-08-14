import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { hasInstructorProfile, useAuth } from '@/auth/AuthContext';
import { SpecialtyPicker } from '@/components/SpecialtyPicker';
import { bioFromSpecialties, type TrainingType } from '@/data/trainingTypes';
import './Auth.css';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isReady, isAuthenticated, updateProfileDetails } = useAuth();
  const [specialties, setSpecialties] = useState<TrainingType[]>(user?.specialties ?? []);
  const [error, setError] = useState<string | null>(null);

  if (isReady && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isReady && hasInstructorProfile(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const previewBio = bioFromSpecialties(specialties);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      updateProfileDetails({ specialties });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    }
  };

  return (
    <div className="page auth-page fade-in">
      <div className="auth-page__header">
        <h1 className="auth-page__brand-name" style={{ fontSize: 26 }}>What do you teach?</h1>
        <p className="auth-page__tagline">Pick your class types — your profile bio is created for you</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {error && <p className="auth-error">{error}</p>}

        <SpecialtyPicker value={specialties} onChange={setSpecialties} label="I teach" />

        {previewBio && (
          <p className="auth-bio-preview">{previewBio}</p>
        )}

        <button type="submit" className="btn btn-primary auth-submit">
          Continue
        </button>
      </form>
    </div>
  );
}
