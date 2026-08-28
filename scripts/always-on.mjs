/**
 * Keep FITback running locally in the background (including lid closed).
 * Phone access is on the same Wi‑Fi via the computer's LAN address.
 *
 * Start once:  npm run always-on:install
 * Run now:     npm run always-on
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPort = 5199;
const arboxPort = 5201;
const supportDir = join(homedir(), 'Library', 'Application Support', 'FITback');
const urlFile = join(supportDir, 'phone-url.txt');
const desktopFile = join(homedir(), 'Desktop', 'FITback-phone.txt');
const logFile = join(homedir(), 'Library', 'Logs', 'fitback-always-on.log');

process.env.PATH = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
  process.env.PATH || '',
].join(':');

function which(cmd) {
  const extra = ['/opt/homebrew/bin', '/usr/local/bin'];
  for (const dir of extra) {
    const full = join(dir, cmd);
    if (existsSync(full)) return full;
  }
  try {
    return execSync(`command -v ${cmd}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(msg);
  try {
    mkdirSync(dirname(logFile), { recursive: true });
    writeFileSync(logFile, `${line}\n`, { flag: 'a' });
  } catch {
    /* ignore */
  }
}

function getLanIps() {
  const ips = new Set();
  for (const iface of ['en0', 'en1', 'bridge100']) {
    try {
      const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: 'utf8' }).trim();
      if (ip) ips.add(ip);
    } catch {
      /* inactive */
    }
  }
  return [...ips];
}

function freePort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (!pids) return;
    for (const pid of pids.split('\n')) {
      if (pid && pid !== String(process.pid)) execSync(`kill -9 ${pid}`);
    }
    log(`Freed port ${port}`);
  } catch {
    /* already free */
  }
}

function writePhoneUrl(lanUrls) {
  mkdirSync(supportDir, { recursive: true });
  const lanBlock = lanUrls.length
    ? lanUrls.map((u) => `  ${u}`).join('\n')
    : '  (no WiFi IP — connect the Mac to WiFi and restart always-on)';
  const text = `FITback — פתיחה בטלפון

המחשב והטלפון על אותו WiFi:
${lanBlock}

ב-Safari: שתף → הוסף למסך הבית

האפליקציה רצה רק על המחשב הזה (אין כתובת לאינטרנט).
עודכן: ${new Date().toLocaleString('he-IL')}
`;
  writeFileSync(urlFile, text);
  try {
    writeFileSync(desktopFile, text);
  } catch {
    /* Desktop may be locked */
  }
}

function notify(title, body) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  try {
    execSync(`osascript -e 'display notification "${esc(body)}" with title "${esc(title)}"'`);
  } catch {
    /* no GUI */
  }
}

function waitForHttp(url, timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        await fetch(url, { signal: AbortSignal.timeout(1500) });
        resolve();
        return;
      } catch {
        /* not up yet */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

const children = [];

function start(name, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: opts.stdio ?? 'inherit',
    env: { ...process.env, ...opts.env },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) log(`[${name}] exited ${code}`);
  });
  children.push(child);
  return child;
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(0), 400);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const nodeBin = which('node') || process.execPath;
const caffeinate = which('caffeinate');

log('\nFITback always-on — local app + same-WiFi phone\n');

if (caffeinate) {
  start('caffeinate', caffeinate, ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore' });
  log('Keeping the Mac from idle-sleep while this process runs.');
}

freePort(appPort);
freePort(arboxPort);

start('arbox-api', nodeBin, ['scripts/arbox-api.mjs'], {
  env: { ARBOX_API_PORT: String(arboxPort) },
});

const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
start('vite', nodeBin, [viteBin, '--host', '0.0.0.0', '--port', String(appPort)], {
  env: { FITBACK_ALWAYS_ON: '1' },
});

await waitForHttp(`http://127.0.0.1:${appPort}/`);
log(`App is up on port ${appPort}`);

const lanUrls = getLanIps().map((ip) => `http://${ip}:${appPort}/`);
writePhoneUrl(lanUrls);
if (lanUrls.length) {
  log('Open on your phone (same WiFi):');
  for (const u of lanUrls) log(`  ${u}`);
  notify('FITback מוכן בטלפון', lanUrls[0]);
} else {
  log('No LAN IP yet — connect the Mac to WiFi.');
  notify('FITback רץ במחשב', 'אין כתובת WiFi כרגע');
}

await new Promise(() => {});
