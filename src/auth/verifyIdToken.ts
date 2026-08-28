import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'] as const;
const APPLE_ISSUER = 'https://appleid.apple.com';

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface GoogleIdClaims {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

export interface AppleIdClaims {
  email?: string;
  sub: string;
}

export function createOAuthNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isEmailVerified(value: unknown): boolean {
  return value === true || value === 'true';
}

export async function verifyGoogleIdToken(
  credential: string,
  audience: string,
  nonce: string
): Promise<GoogleIdClaims> {
  const { payload } = await jwtVerify(credential, googleJwks, {
    audience,
    issuer: [...GOOGLE_ISSUERS],
  });

  if (payload.nonce !== nonce) {
    throw new Error('Google sign-in failed (nonce mismatch)');
  }
  if (!isEmailVerified(payload.email_verified)) {
    throw new Error('Google account email is not verified');
  }

  const email = typeof payload.email === 'string' ? payload.email : '';
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!email || !sub) {
    throw new Error('Could not read Google account');
  }

  const given = typeof payload.given_name === 'string' ? payload.given_name : '';
  const family = typeof payload.family_name === 'string' ? payload.family_name : '';
  const nameClaim = typeof payload.name === 'string' ? payload.name : '';
  const name = nameClaim || [given, family].filter(Boolean).join(' ') || email;
  const picture = typeof payload.picture === 'string' ? payload.picture : undefined;

  return { email, name, picture, sub };
}

export async function verifyAppleIdToken(
  credential: string,
  audience: string,
  nonce: string
): Promise<AppleIdClaims> {
  const { payload } = await jwtVerify(credential, appleJwks, {
    audience,
    issuer: APPLE_ISSUER,
  });

  if (payload.nonce !== nonce) {
    throw new Error('Apple sign-in failed (nonce mismatch)');
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) {
    throw new Error('Could not read Apple account');
  }

  const email = typeof payload.email === 'string' ? payload.email : undefined;
  return { email, sub };
}
