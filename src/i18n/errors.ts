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
  'This invite link is invalid or expired': 'errors.inviteInvalid',
  'This invite is for a different email': 'errors.inviteEmailMismatch',
  'Sign in to join this studio': 'errors.inviteSignIn',
  'Sign in first to add a studio': 'errors.addStudioFirst',
  'Arbox did not return a studio': 'errors.arboxNoStudio',
  'WhatsApp proxy is not running. Start the app with npm run dev.': 'errors.whatsappProxy',
  'Connect studio WhatsApp in Settings': 'errors.whatsappConnect',
  'WhatsApp is not configured': 'errors.whatsappConnect',
  'WhatsApp send failed': 'errors.whatsappSend',
  'Email proxy is not running. Start the app with npm run dev.': 'errors.emailProxy',
  'Email is not configured': 'errors.emailConnect',
  'Email send failed': 'errors.emailSend',
  'Only studio managers can remove instructors': 'errors.removeInstructorForbidden',
  'Cannot remove yourself': 'errors.removeYourself',
};

export function translateError(t: TranslateFn, message: string | null | undefined): string {
  if (!message) return '';
  const key = ERROR_KEYS[message];
  return key ? t(key) : message;
}
