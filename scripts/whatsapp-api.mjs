/**
 * FITback WhatsApp Cloud API proxy.
 * One FITback number — credentials from env only, never from the browser.
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const PORT = Number(process.env.WHATSAPP_API_PORT || 5202);
const GRAPH = 'https://graph.facebook.com/v22.0';
const ALLOWED_VARS = ['none', 'title_url', 'title_instructor_url'];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function credentials() {
  return {
    token: String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
    phoneId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    templateName: String(process.env.WHATSAPP_TEMPLATE_NAME || 'class_feedback').trim(),
    templateLanguage: String(process.env.WHATSAPP_TEMPLATE_LANG || 'he').trim() || 'he',
    templateVars: ALLOWED_VARS.includes(process.env.WHATSAPP_TEMPLATE_VARS)
      ? process.env.WHATSAPP_TEMPLATE_VARS
      : 'title_url',
  };
}

function isConfigured() {
  const { token, phoneId } = credentials();
  return Boolean(token && phoneId);
}

function graphErrorMessage(data, fallback) {
  const err = data?.error;
  if (!err) return fallback;
  return err.error_data?.details || err.error_user_msg || err.message || fallback;
}

function buildGraphPayload(input, cfg) {
  const to = String(input.to ?? '').replace(/\D/g, '');
  if (!to) throw new Error('Recipient phone is required');

  if (!cfg.templateName) {
    const text = String(input.text ?? '').trim();
    if (!text) throw new Error('Message text is required');
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body: text },
    };
  }

  const template = {
    name: cfg.templateName,
    language: { code: cfg.templateLanguage },
  };

  if (cfg.templateVars !== 'none') {
    const title = String(input.title || '-').slice(0, 1024);
    const instructor = String(input.instructor || title).slice(0, 1024);
    const url = String(input.url || '-').slice(0, 1024);
    const texts =
      cfg.templateVars === 'title_instructor_url' ? [title, instructor, url] : [title, url];
    template.components = [
      {
        type: 'body',
        parameters: texts.map((text) => ({ type: 'text', text })),
      },
    ];
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template,
  };
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  return JSON.parse(raw);
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
      json(res, 200, { ok: true, configured: isConfigured() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/send') {
      const cfg = credentials();
      if (!cfg.token || !cfg.phoneId) {
        json(res, 503, {
          ok: false,
          message: 'WhatsApp is not configured',
        });
        return;
      }
      const body = await readBody(req);
      const payload = buildGraphPayload(body, cfg);
      const graphRes = await fetch(`${GRAPH}/${encodeURIComponent(cfg.phoneId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await graphRes.json();
      if (!graphRes.ok) {
        console.error('[whatsapp-api] send failed', graphRes.status, data?.error?.code);
        json(res, graphRes.status, {
          ok: false,
          message: graphErrorMessage(data, 'WhatsApp send failed'),
        });
        return;
      }
      const messageId = data?.messages?.[0]?.id ?? '';
      console.log(`[whatsapp-api] sent → ${payload.to}`);
      json(res, 200, { ok: true, id: messageId });
      return;
    }

    json(res, 404, { ok: false, message: 'Not found' });
  } catch (err) {
    console.error('[whatsapp-api]', err instanceof Error ? err.message : err);
    json(res, 500, {
      ok: false,
      message: err instanceof Error ? err.message : 'WhatsApp proxy error',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const state = isConfigured() ? 'FITback number configured' : 'not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env';
  console.log(`WhatsApp Cloud API proxy on http://127.0.0.1:${PORT} (${state})`);
});
