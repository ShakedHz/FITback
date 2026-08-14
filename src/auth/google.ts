export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getNotDisplayedReason?: () => string;
          }) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const SCRIPT_ID = 'google-gsi-script';
const RESULT_KEY = 'movana_google_auth_result';

export function getGoogleClientId(): string | undefined {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  return id?.trim() || undefined;
}

export function isGoogleConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')));
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export function decodeGoogleCredential(credential: string): GoogleProfile {
  const payload = credential.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const data = JSON.parse(json) as {
    email: string;
    name?: string;
    picture?: string;
    sub: string;
    given_name?: string;
    family_name?: string;
  };

  return {
    email: data.email,
    name: data.name || [data.given_name, data.family_name].filter(Boolean).join(' ') || data.email,
    picture: data.picture,
    sub: data.sub,
  };
}

function oauthPopup(clientId: string): Promise<GoogleProfile> {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = [...nonceBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.removeItem(RESULT_KEY);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
    prompt: 'select_account',
  });

  const popup = window.open(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    'movana_google_auth',
    'width=480,height=700,menubar=no,toolbar=no'
  );

  if (!popup) {
    return Promise.reject(new Error('Popup blocked. Allow popups to sign in with Google.'));
  }

  return new Promise((resolve, reject) => {
    const timer = window.setInterval(() => {
      const raw = localStorage.getItem(RESULT_KEY);
      if (raw) {
        localStorage.removeItem(RESULT_KEY);
        window.clearInterval(timer);
        try {
          const data = JSON.parse(raw) as { credential?: string; error?: string };
          if (data.error) {
            reject(new Error(data.error));
            return;
          }
          if (!data.credential) {
            reject(new Error('Google sign-in failed'));
            return;
          }
          resolve(decodeGoogleCredential(data.credential));
        } catch {
          reject(new Error('Google sign-in failed'));
        }
        return;
      }

      if (popup.closed) {
        window.clearInterval(timer);
        reject(new Error('Google sign-in was cancelled'));
      }
    }, 300);
  });
}

/**
 * Real Google Sign-In via Google Identity Services + OAuth popup fallback.
 * Requires VITE_GOOGLE_CLIENT_ID and authorized JavaScript origins in Google Cloud Console.
 */
export async function signInWithGoogle(): Promise<GoogleProfile> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (profile: GoogleProfile) => {
      if (settled) return;
      settled = true;
      resolve(profile);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          fail('Google sign-in was cancelled');
          return;
        }
        try {
          done(decodeGoogleCredential(response.credential));
        } catch {
          fail('Could not read Google account');
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        oauthPopup(clientId).then(done).catch((err: Error) => fail(err.message));
      }
    });

    window.setTimeout(() => {
      if (!settled) {
        oauthPopup(clientId).then(done).catch((err: Error) => fail(err.message));
      }
    }, 1500);
  });
}
