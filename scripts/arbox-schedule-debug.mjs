#!/usr/bin/env node
/**
 * Debug Arbox schedule loading. Usage:
 *   ARBOX_API_KEY=your-key npm run arbox:schedule-debug
 */
const apiKey = process.env.ARBOX_API_KEY?.trim();
if (!apiKey || apiKey.length < 8) {
  console.error('Set ARBOX_API_KEY');
  process.exit(1);
}

const base = process.env.ARBOX_PROBE_URL ?? 'http://127.0.0.1:5201';

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  const health = await fetch(`${base}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error(`Proxy not running at ${base}. Run: npm run dev`);
    process.exit(1);
  }

  const today = localDateKey();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartKey = localDateKey(weekStart);

  console.log('Connecting with weekStartDate:', weekStartKey);
  const connect = await fetch(`${base}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, role: 'studio_manager', weekStartDate: weekStartKey }),
  }).then((r) => r.json());

  if (connect.message && !connect.events) {
    console.error('Connect failed:', connect.message);
    process.exit(1);
  }

  console.log('\nClub:', connect.connection?.clubName);
  console.log('Clients:', connect.clients?.length ?? 0);
  console.log('Events mapped:', connect.events?.length ?? 0);
  console.log('Debug:', JSON.stringify(connect.debug, null, 2));

  if (connect.events?.length) {
    console.log('\nFirst 3 classes:');
    for (const ev of connect.events.slice(0, 3)) {
      const names = (ev.attendees ?? []).map((a) => a.name).join(', ') || 'none';
      console.log(
        `  - ${ev.title} @ ${ev.start} (${ev.instructor ?? 'no instructor'}) · attendees: ${names}`
      );
    }
  } else {
    console.log('\nNo classes mapped. Probe today:', connect.probe?.scheduleToday);
    console.log('Sample from probe:', connect.probe?.sampleClass);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
