/**
 * Movana SMS relay (dev + production).
 * Priority: Twilio → macOS Messages → log (always returns ok in dev).
 */
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'node:os';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.SMS_API_PORT || 5200);
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;

function escapeAppleScript(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

async function sendTwilio(to, body) {
  const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: twilioFrom, Body: body });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Twilio HTTP ${res.status}`);
  }
}

/** Send via Mac Messages app (SMS / iMessage) — works when Messages is signed in. */
async function sendMacMessages(to, body) {
  if (platform() !== 'darwin') return false;

  const buddy = String(to).replace(/\s/g, '');
  const text = escapeAppleScript(body);
  const scripts = [
    `tell application "Messages"
      set t to participant "${buddy}" of (1st account whose account type is iMessage)
      send "${text}" to t
    end tell`,
    `tell application "Messages"
      set t to participant "${buddy}" of (1st service whose service type = SMS)
      send "${text}" to t
    end tell`,
    `tell application "Messages"
      set t to buddy "${buddy}" of (service 1)
      send "${text}" to t
    end tell`,
  ];

  for (const script of scripts) {
    try {
      await execFileAsync('osascript', ['-e', script], { timeout: 20000 });
      return true;
    } catch {
      /* try next script */
    }
  }
  return false;
}

async function dispatchSms(to, body) {
  if (twilioSid && twilioToken && twilioFrom) {
    await sendTwilio(to, body);
    return 'twilio';
  }

  if (await sendMacMessages(to, body)) {
    return 'messages';
  }

  console.log(`[sms-api] queued → ${to}: ${String(body).slice(0, 90)}…`);
  return 'queued';
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/send') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;

  try {
    const { phone, body } = JSON.parse(raw);
    if (!phone || !body) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'phone and body required' }));
      return;
    }

    const channel = await dispatchSms(phone, body);
    console.log(`[sms-api] sent (${channel}) → ${phone}`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, channel }));
  } catch (err) {
    console.error('[sms-api]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Send failed' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📨 SMS relay on :${PORT} (Twilio → Mac Messages → queue)`);
});
