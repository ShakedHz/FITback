/** Outbound SMS is off unless explicitly enabled (prevents accidental sends). */
export function isOutboundSmsEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_SMS === 'true';
}
