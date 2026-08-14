import { useEffect } from 'react';
import './Auth.css';

/**
 * OAuth redirect target for Google Sign-In popup.
 * Writes the ID token to localStorage so the opener can complete login.
 */
export function GoogleCallbackPage() {
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
      Signing you in with Google…
    </div>
  );
}
