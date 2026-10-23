/**
 * FITback email proxy.
 * Prefers Gmail SMTP (any recipient) when GMAIL_* is set; else Resend.
 * Credentials from env only — never exposed to the browser.
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
  let text = '';
  try {
    text = readFileSync(join(root, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] != null) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.EMAIL_API_PORT || 5203);
const RESEND = 'https://api.resend.com/emails';

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function gmailCredentials() {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').trim().replace(/\s+/g, '');
  const from =
    String(process.env.EMAIL_FROM || '').trim() ||
    (user ? `FITback <${user}>` : '');
  return { user, pass, from };
}

function resendCredentials() {
  return {
    apiKey: String(process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '').trim(),
    from: String(process.env.EMAIL_FROM || '').trim(),
  };
}

function activeProvider() {
  const gmail = gmailCredentials();
  if (gmail.user && gmail.pass && gmail.from) return 'gmail';
  const resend = resendCredentials();
  if (resend.apiKey && resend.from) return 'resend';
  return null;
}

function isConfigured() {
  return activeProvider() != null;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
}

async function sendViaGmail({ to, subject, text, html }) {
  const { user, pass, from } = gmailCredentials();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  });
  return { id: info.messageId || '' };
}

async function sendViaResend({ to, subject, text, html }) {
  const { apiKey, from } = resendCredentials();
  const sendRes = await fetch(RESEND, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: text || undefined,
      html: html || undefined,
    }),
  });
  const data = await sendRes.json().catch(() => ({}));
  if (!sendRes.ok) {
    const message =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      'Email send failed';
    const err = new Error(message);
    err.status = sendRes.status;
    throw err;
  }
  return { id: typeof data?.id === 'string' ? data.id : '' };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === 'GET' && (url.pathname === '/status' || url.pathname === '/')) {
      const provider = activeProvider();
      json(res, 200, { ok: true, configured: Boolean(provider), provider });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/send') {
      const provider = activeProvider();
      if (!provider) {
        json(res, 503, {
          ok: false,
          message:
            'Email is not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD (or Resend keys) in .env',
        });
        return;
      }

      const body = await readBody(req);
      const to = String(body.to ?? '').trim();
      const subject = String(body.subject ?? '').trim();
      const text = String(body.text ?? '').trim();
      const html = String(body.html ?? '').trim() || undefined;

      if (!isValidEmail(to)) {
        json(res, 400, { ok: false, message: 'Enter a valid email address' });
        return;
      }
      if (!subject) {
        json(res, 400, { ok: false, message: 'Email subject is required' });
        return;
      }
      if (!text && !html) {
        json(res, 400, { ok: false, message: 'Email body is required' });
        return;
      }

      try {
        const result =
          provider === 'gmail'
            ? await sendViaGmail({ to, subject, text, html })
            : await sendViaResend({ to, subject, text, html });
        console.log(`[email-api] sent via ${provider} → ${to}`);
        json(res, 200, { ok: true, id: result.id, provider });
      } catch (err) {
        const status = typeof err?.status === 'number' ? err.status : 500;
        const message = err instanceof Error ? err.message : 'Email send failed';
        console.error('[email-api] send failed', provider, message);
        json(res, status, { ok: false, message });
      }
      return;
    }

    json(res, 404, { ok: false, message: 'Not found' });
  } catch (err) {
    console.error('[email-api]', err instanceof Error ? err.message : err);
    json(res, 500, {
      ok: false,
      message: err instanceof Error ? err.message : 'Email proxy error',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const provider = activeProvider();
  const state = provider
    ? `${provider} configured`
    : 'not configured — set GMAIL_USER + GMAIL_APP_PASSWORD (recommended for POC) or Resend keys';
  console.log(`Email API proxy on http://127.0.0.1:${PORT} (${state})`);
});
