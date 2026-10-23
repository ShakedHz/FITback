/** Basic email shape check — enough for roster / outbound send. */
export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!value || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
