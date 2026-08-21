import type { TranslateFn } from './LocaleContext';

const ERROR_KEYS: Record<string, string> = {
  'Please enter your name': 'errors.name',
  'Please enter your full name': 'errors.fullName',
  'Choose at least one class type': 'errors.classType',
  'Enter a valid email address': 'errors.email',
  'Password must be at least 8 characters': 'errors.password',
  'An account with this email already exists': 'errors.emailExists',
  'Registration failed': 'errors.registerFailed',
  'Invalid email or password': 'errors.invalidCredentials',
  'Login failed': 'errors.loginFailed',
  'Google sign-in failed': 'errors.googleFailed',
  'Google sign-in was cancelled': 'errors.googleCancelled',
  'Failed to load Google Sign-In': 'errors.googleLoad',
  'Popup blocked. Allow popups to sign in with Google.': 'errors.googlePopup',
  'Could not read Google account': 'errors.googleAccount',
  'Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.':
    'errors.googleConfig',
  'Apple sign-in failed': 'errors.appleFailed',
  'Arbox sign-in failed': 'errors.arboxFailed',
  'API key must be at least 8 characters': 'errors.arboxKey',
  'Could not connect to Arbox. Check your API key in Arbox → Settings → Club Information.':
    'errors.arboxConnect',
  'Arbox proxy is not running. Start the app with npm run dev.': 'errors.arboxProxy',
  'Invalid Arbox API key or service unavailable': 'errors.arboxInvalid',
  'Could not save profile': 'errors.saveProfile',
  'Could not update photo': 'errors.photo',
};

export function translateError(t: TranslateFn, message: string | null | undefined): string {
  if (!message) return '';
  const key = ERROR_KEYS[message];
  return key ? t(key) : message;
}
