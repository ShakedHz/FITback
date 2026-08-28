import { createOAuthNonce, verifyGoogleIdToken, type GoogleIdClaims } from './verifyIdToken';

export type GoogleProfile = GoogleIdClaims;

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

async function profileFromCredential(
  credential: string,
  clientId: string,
  nonce: string
): Promise<GoogleProfile> {
  return verifyGoogleIdToken(credential, clientId, nonce);
}

function oauthPopup(clientId: string, nonce: string): Promise<GoogleProfile> {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
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
        void (async () => {
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
            resolve(await profileFromCredential(data.credential, clientId, nonce));
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Google sign-in failed'));
          }
        })();
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
function tryGisPrompt(clientId: string, nonce: string): Promise<GoogleProfile | null> {
  return new Promise((resolve) => {
    let finished = false;
    const finish = (profile: GoogleProfile | null) => {
      if (finished) return;
      finished = true;
      resolve(profile);
    };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      nonce,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          finish(null);
          return;
        }
        void profileFromCredential(response.credential, clientId, nonce)
          .then(finish)
          .catch(() => finish(null));
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        finish(null);
      }
    });

    window.setTimeout(() => finish(null), 2500);
  });
}

export async function signInWithGoogle(): Promise<GoogleProfile> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
  }

  await loadGoogleScript();
  const promptNonce = createOAuthNonce();
  const fromPrompt = await tryGisPrompt(clientId, promptNonce);
  if (fromPrompt) return fromPrompt;

  window.google?.accounts.id.cancel();
  return oauthPopup(clientId, createOAuthNonce());
}
