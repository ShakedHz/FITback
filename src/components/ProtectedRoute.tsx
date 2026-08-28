import { Navigate, useLocation } from 'react-router-dom';
import { canAccessApp, useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessApp(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
