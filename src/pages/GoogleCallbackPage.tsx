import { useEffect } from 'react';
import { useI18n } from '@/i18n';
import './Auth.css';

/**
 * OAuth redirect target for Google Sign-In popup.
 * Writes the ID token to localStorage so the opener can complete login.
 */
export function GoogleCallbackPage() {
  const { t } = useI18n();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const credential = params.get('id_token');
    const error = params.get('error');

    localStorage.setItem(
      'movana_google_auth_result',
      JSON.stringify(
        error
          ? { error: error === 'access_denied' ? 'Google sign-in was cancelled' : error }
          : { credential }
      )
    );

    window.setTimeout(() => window.close(), 100);
  }, []);

  return (
    <div className="page auth-callback">
      {t('auth.googleSigningIn')}
    </div>
  );
}
