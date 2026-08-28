/**
 * Install / uninstall the always-on local FITback service.
 *
 *   node scripts/always-on-setup.mjs install
 *   node scripts/always-on-setup.mjs uninstall
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = homedir();
const uid = process.getuid?.() ?? execSync('id -u', { encoding: 'utf8' }).trim();
const label = 'com.fitback.always-on';
const plistPath = join(home, 'Library', 'LaunchAgents', `${label}.plist`);
const logsDir = join(home, 'Library', 'Logs');
const desktopFile = join(home, 'Desktop', 'FITback-phone.txt');
const urlFile = join(home, 'Library', 'Application Support', 'FITback', 'phone-url.txt');

const action = process.argv[2] || 'install';

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

function launchctl(args) {
  const result = spawnSync('launchctl', args, { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function adminShell(command) {
  const result = spawnSync(
    'osascript',
    ['-e', `do shell script ${JSON.stringify(command)} with administrator privileges`],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'admin command failed').trim());
  }
  return result.stdout;
}

function enableLidClosedAwake() {
  console.log('\nAsking for your Mac password so FITback can stay on when the lid is closed…');
  console.log('Do not put the closed Mac in a bag — it can overheat.\n');
  adminShell(
    [
      'pmset -a disablesleep 1',
      'pmset -c sleep 0',
      'pmset -c disksleep 0',
      'pmset -c tcpkeepalive 1',
    ].join(' && '),
  );
}

function restoreSleep() {
  console.log('\nRestoring normal Mac sleep (needs your password)…\n');
  adminShell('pmset -a disablesleep 0 && pmset -c sleep 1 && pmset -c disksleep 10');
}

function writePlist(nodeBin) {
  mkdirSync(dirname(plistPath), { recursive: true });
  mkdirSync(logsDir, { recursive: true });
  const script = join(root, 'scripts', 'always-on.mjs');
  const pathEnv = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodeBin)}</string>
    <string>${xmlEscape(script)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(root)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(join(logsDir, 'fitback-always-on.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(join(logsDir, 'fitback-always-on.err.log'))}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${pathEnv}</string>
    <key>HOME</key>
    <string>${xmlEscape(home)}</string>
  </dict>
</dict>
</plist>
`;
  writeFileSync(plistPath, plist);
  console.log(`Wrote ${plistPath}`);
}

function startAgent() {
  launchctl(['bootout', `gui/${uid}`, plistPath]);
  const status = launchctl(['bootstrap', `gui/${uid}`, plistPath]);
  if (status !== 0) {
    throw new Error('Failed to start the always-on service');
  }
  launchctl(['enable', `gui/${uid}/${label}`]);
  launchctl(['kickstart', '-k', `gui/${uid}/${label}`]);
}

function stopAgent() {
  launchctl(['bootout', `gui/${uid}`, plistPath]);
  launchctl(['bootout', `gui/${uid}/${label}`]);
}

function waitForUrl(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (!existsSync(urlFile)) {
        execSync('sleep 1');
        continue;
      }
      const text = execSync(`cat ${JSON.stringify(urlFile)} 2>/dev/null`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const match = text.match(/http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/?/);
      if (match) return match[0].endsWith('/') ? match[0] : `${match[0]}/`;
    } catch {
      /* not written yet */
    }
    execSync('sleep 1');
  }
  return null;
}

if (action === 'uninstall') {
  stopAgent();
  try {
    unlinkSync(plistPath);
  } catch {
    /* missing */
  }
  try {
    restoreSleep();
  } catch (err) {
    console.warn(`Could not restore sleep settings: ${err.message}`);
  }
  console.log('\nFITback always-on is off. The Mac can sleep normally again.\n');
  process.exit(0);
}

if (action !== 'install') {
  console.error('Usage: node scripts/always-on-setup.mjs [install|uninstall]');
  process.exit(1);
}

const nodeBin = which('node');
if (!nodeBin) {
  throw new Error('node is not installed');
}

writePlist(nodeBin);

try {
  enableLidClosedAwake();
  console.log('Lid-closed keep-awake is on (charger + battery).');
} catch (err) {
  console.warn(`\nCould not change sleep settings: ${err.message}`);
  console.warn('The app can still run, but closing the lid may put the Mac to sleep.\n');
}

startAgent();
console.log('\nWaiting for the local phone URL…');
const url = waitForUrl();
if (url) {
  console.log(`\nOpen on your phone (same WiFi as the Mac):\n  ${url}\n`);
  console.log(`Also saved to:\n  ${desktopFile}\n`);
} else {
  console.log('\nService started. Check ~/Desktop/FITback-phone.txt in a minute,');
  console.log(`or the log: ${join(logsDir, 'fitback-always-on.log')}\n`);
}
