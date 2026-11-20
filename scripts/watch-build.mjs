#!/usr/bin/env node
/**
 * Builds the Garmin watch app in watch-garmin/ with the Connect IQ SDK.
 *
 *   node scripts/watch-build.mjs                 build for the default device
 *   node scripts/watch-build.mjs --device=vivoactive4
 *   node scripts/watch-build.mjs --run           build and launch the simulator
 *   node scripts/watch-build.mjs --release       signed build for sideloading
 *
 * The SDK, the JDK it needs and the device files all live outside the repo, so
 * everything here is discovered at runtime and reported with a fixable message
 * instead of a stack trace.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = join(ROOT, 'watch-garmin');
const CIQ_HOME = join(homedir(), 'Library', 'Application Support', 'Garmin', 'ConnectIQ');
const KEY = join(PROJECT, 'developer_key');
const PREFERRED_DEVICES = ['vivoactive5', 'vivoactive6', 'vivoactive4', 'vivoactive3'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Newest-versioned subdirectory, so a fresh SDK or JDK is picked up automatically. */
function newestDir(dir, filter = () => true) {
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir)
    .filter((n) => !n.startsWith('.') && filter(n))
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return names.length ? join(dir, names[names.length - 1]) : null;
}

function findJavaHome() {
  if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, 'bin', 'java'))) {
    return process.env.JAVA_HOME;
  }
  const bundled = newestDir(join(homedir(), '.jdks'));
  if (bundled && existsSync(join(bundled, 'Contents', 'Home', 'bin', 'java'))) {
    return join(bundled, 'Contents', 'Home');
  }
  if (bundled && existsSync(join(bundled, 'bin', 'java'))) return bundled;
  try {
    return execFileSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const javaHome = findJavaHome();
if (!javaHome) {
  fail(
    'No Java 17 runtime found. The Connect IQ compiler needs one:\n' +
      '  curl -L -o /tmp/jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse"\n' +
      '  mkdir -p ~/.jdks && tar -xzf /tmp/jdk17.tar.gz -C ~/.jdks'
  );
}

const sdk = newestDir(join(CIQ_HOME, 'Sdks'));
if (!sdk) {
  fail(
    `No Connect IQ SDK in ${join(CIQ_HOME, 'Sdks')}.\n` +
      'Open the Connect IQ SDK Manager (in /Applications) and download the latest SDK.'
  );
}

const devicesDir = join(CIQ_HOME, 'Devices');
const installedDevices = existsSync(devicesDir)
  ? readdirSync(devicesDir).filter((n) => !n.startsWith('.'))
  : [];

if (installedDevices.length === 0) {
  fail(
    'No Garmin device files installed, so nothing can be compiled yet.\n\n' +
      'Open the Connect IQ SDK Manager (in /Applications), sign in with your Garmin\n' +
      'account, go to the Devices tab and download your vivoactive model.\n' +
      'The device list is only downloadable while signed in, which is why this step is manual.'
  );
}

const device =
  option('device') ??
  PREFERRED_DEVICES.find((d) => installedDevices.includes(d)) ??
  installedDevices.find((d) => d.startsWith('vivoactive')) ??
  installedDevices[0];

if (!installedDevices.includes(device)) {
  fail(
    `Device "${device}" is not installed. Available:\n  ${installedDevices.join(', ')}\n\n` +
      'Download more in the Connect IQ SDK Manager, Devices tab.'
  );
}

if (!existsSync(KEY)) {
  console.log('Generating a developer key (one-time, not committed)…');
  const pem = join(PROJECT, 'developer_key.pem');
  execFileSync('openssl', ['genrsa', '-out', pem, '4096'], { stdio: 'ignore' });
  execFileSync('openssl', [
    'pkcs8', '-topk8', '-inform', 'PEM', '-outform', 'DER', '-in', pem, '-out', KEY, '-nocrypt',
  ]);
}

const outDir = join(PROJECT, 'bin');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'fitback.prg');

const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')}:${process.env.PATH}` };
const sdkBin = join(sdk, 'bin');

const monkeycArgs = [
  '-f', join(PROJECT, 'monkey.jungle'),
  '-d', device,
  '-o', out,
  '-y', KEY,
  '-w',
];
if (flag('release')) monkeycArgs.push('-r', '-e');

console.log(`SDK    ${sdk.split('/').pop()}`);
console.log(`Java   ${javaHome}`);
console.log(`Device ${device}\n`);

const build = spawnSync(join(sdkBin, 'monkeyc'), monkeycArgs, { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\nBuilt ${out}`);

if (!flag('run')) {
  console.log('Copy this file to GARMIN/APPS/ on the watch to sideload it.');
  process.exit(0);
}

console.log('\nStarting the simulator…');
spawnSync(join(sdkBin, 'connectiq'), [], { stdio: 'ignore', env, detached: true });
// The simulator needs a moment to open its socket before monkeydo can talk to it.
await new Promise((r) => setTimeout(r, 6000));
const run = spawnSync(join(sdkBin, 'monkeydo'), [out, device], { stdio: 'inherit', env });
process.exit(run.status ?? 0);
