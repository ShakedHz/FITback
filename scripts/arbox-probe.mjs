#!/usr/bin/env node
/**
 * Probe Arbox API with your key (read-only, no messages sent).
 * Usage: ARBOX_API_KEY=your-key npm run arbox:probe
 */
const apiKey = process.env.ARBOX_API_KEY?.trim();
if (!apiKey || apiKey.length < 8) {
  console.error('Set ARBOX_API_KEY (from Arbox → Settings → Club Information)');
  process.exit(1);
}

const base = process.env.ARBOX_PROBE_URL ?? 'http://127.0.0.1:5201';

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error(`Arbox proxy not running at ${base}. Run: npm run arbox:api`);
    process.exit(1);
  }

  console.log('Proxy:', health);
  const probe = await fetch(`${base}/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  }).then((r) => r.json());

  console.log('\nProbe result:');
  console.log(JSON.stringify(probe, null, 2));
  if (probe.scheduleToday != null) {
    console.log('\nClasses today from Arbox:', probe.scheduleToday);
  }

  if (!probe.ok) process.exit(1);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const connect = await fetch(`${base}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, role: 'instructor', weekStart: weekStart.toISOString() }),
  }).then((r) => r.json());

  console.log('\nConnect:');
  console.log('  Club:', connect.connection?.clubName);
  console.log('  Classes this week:', connect.events?.length ?? 0);
  console.log('  Clients:', connect.clients?.length ?? 0);
  if (connect.events?.[0]) {
    console.log('  Sample class:', connect.events[0].title, '@', connect.events[0].start);
    console.log('  Attendees:', connect.events[0].attendees?.length ?? 0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
