import { normalizePhone } from '@/utils/sms';

export interface SmsSendResult {
  ok: boolean;
  phone: string;
  error?: string;
}

function smsApiUrl(): string | null {
  const env = import.meta.env.VITE_SMS_API_URL as string | undefined;
  if (env) return `${env.replace(/\/$/, '')}/send`;
  // Dev: Vite proxies /api/sms → local relay (started by npm run dev)
  if (import.meta.env.DEV) return '/api/sms/send';
  return null;
}

import { isOutboundSmsEnabled } from '@/config/outboundMessaging';

export async function sendSmsViaApi(phone: string, body: string): Promise<SmsSendResult> {
  const to = normalizePhone(phone);

  if (!isOutboundSmsEnabled()) {
    return { ok: false, phone: to, error: 'SMS sending is disabled' };
  }
  const url = smsApiUrl();

  if (!url) {
    await delay(80);
    return { ok: true, phone: to };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: to, body }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return { ok: false, phone: to, error: err || `HTTP ${res.status}` };
    }
    return { ok: true, phone: to };
  } catch (err) {
    return {
      ok: false,
      phone: to,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export async function sendSmsBatch(
  phones: string[],
  body: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const phone of phones) {
    const result = await sendSmsViaApi(phone, body);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
