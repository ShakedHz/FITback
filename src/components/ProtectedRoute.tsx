import { Navigate, useLocation } from 'react-router-dom';
import { hasInstructorProfile, useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasInstructorProfile(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
