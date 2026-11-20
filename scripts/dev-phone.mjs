import { spawn, execSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PHONE_HTTPS_PORT, startPhoneHttps } from './phone-https.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPort = 5199;
const arboxPort = 5201;
const whatsappPort = 5202;
const emailPort = 5203;

function getLanIps() {
  const ips = new Set();
  try {
    for (const addrs of Object.values(networkInterfaces())) {
      for (const addr of addrs ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) ips.add(addr.address);
      }
    }
  } catch {
    /* sandbox */
  }
  if (ips.size === 0) {
    for (const iface of ['en0', 'bridge100', 'en1']) {
      try {
        const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: 'utf8' }).trim();
        if (ip) ips.add(ip);
      } catch {
        /* inactive */
      }
    }
  }
  return [...ips];
}

const ips = getLanIps();

console.log('\n📱 FITback — app + Arbox (read-only) + WhatsApp + Email\n');
if (ips.length === 0) {
  console.log('Open: http://localhost:5199/\n');
} else {
  console.log('Open on your phone:\n');
  for (const ip of ips) console.log(`   → http://${ip}:${appPort}/`);
  console.log('');
}

function freePort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (!pids) return;
    for (const pid of pids.split('\n')) {
      if (pid) execSync(`kill -9 ${pid}`);
    }
    console.log(`Freed port ${port}`);
  } catch {
    /* port already free */
  }
}

freePort(appPort);
freePort(arboxPort);
freePort(whatsappPort);
freePort(emailPort);
freePort(PHONE_HTTPS_PORT);

const children = [];

function start(name, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${name}] exited ${code}`);
  });
  children.push(child);
  return child;
}

start('arbox-api', 'node', ['scripts/arbox-api.mjs'], { ARBOX_API_PORT: String(arboxPort) });
start('whatsapp-api', 'node', ['scripts/whatsapp-api.mjs'], {
  WHATSAPP_API_PORT: String(whatsappPort),
});
start('email-api', 'node', ['scripts/email-api.mjs'], {
  EMAIL_API_PORT: String(emailPort),
});
start('vite', 'npx', ['vite', '--host', '0.0.0.0', '--port', String(appPort)]);

try {
  const phone = startPhoneHttps({ targetPort: appPort, ips });
  if (phone.urls.length) {
    console.log('On iPhone, open the secure link so Share uses the system sheet:\n');
    for (const url of phone.urls) console.log(`   → ${url}`);
    console.log('\nSafari will warn about the certificate the first time — continue to the site.\n');
  }
} catch (err) {
  console.error(`Phone HTTPS proxy did not start: ${err instanceof Error ? err.message : err}`);
}

function shutdown() {
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
