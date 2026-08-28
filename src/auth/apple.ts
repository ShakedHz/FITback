import { createOAuthNonce, verifyAppleIdToken } from './verifyIdToken';

export interface AppleProfile {
  email: string;
  name: string;
  sub: string;
  emailFromApple: boolean;
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: (config?: Record<string, unknown>) => Promise<{
          authorization: { id_token: string; code: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const SCRIPT_ID = 'apple-auth-script';

export function getAppleClientId(): string | undefined {
  const id = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  return id?.trim() || undefined;
}

export function isAppleConfigured(): boolean {
  return Boolean(getAppleClientId());
}

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Apple Sign-In')));
      if (window.AppleID?.auth) resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Apple Sign-In'));
    document.head.appendChild(script);
  });
}

/**
 * Real Sign in with Apple (popup).
 * Requires VITE_APPLE_CLIENT_ID (Services ID) configured in Apple Developer,
 * with the current origin as Return URL.
 *
 * Name and email are only returned on the first authorize. Later logins
 * must be matched by `sub`.
 */
export async function signInWithApple(): Promise<AppleProfile> {
  const clientId = getAppleClientId();
  if (!clientId) {
    throw new Error('Apple Sign-In is not configured. Add VITE_APPLE_CLIENT_ID to your .env file.');
  }

  await loadAppleScript();

  const redirectURI =
    (import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined)?.trim() ||
    window.location.origin;
  const nonce = createOAuthNonce();

  window.AppleID!.auth.init({
    clientId,
    scope: 'name email',
    redirectURI,
    nonce,
    usePopup: true,
  });

  try {
    const response = await window.AppleID!.auth.signIn();
    const claims = await verifyAppleIdToken(response.authorization.id_token, clientId, nonce);
    const emailFromResponse = response.user?.email || claims.email;
    const nameFromApple = response.user?.name
      ? [response.user.name.firstName, response.user.name.lastName].filter(Boolean).join(' ')
      : '';

    return {
      email: emailFromResponse || '',
      name: nameFromApple,
      sub: claims.sub,
      emailFromApple: Boolean(emailFromResponse),
    };
  } catch (err) {
    if (err instanceof Error && /nonce|Apple sign-in failed|Could not read/.test(err.message)) {
      throw err;
    }
    throw new Error('Apple sign-in was cancelled or failed');
  }
}
