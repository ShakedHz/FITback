/**
 * Local Arbox API proxy — read-only (schedule, locations, users).
 * Never forwards message/SMS endpoints.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.ARBOX_API_PORT || 5201);
const ARBOX_BASE = 'https://arboxserver.arboxapp.com/api/public';

const READ_PATHS = ['v3/locations', 'v3/users', 'v3/users/allStaffMembers', 'v3/schedule'];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function arboxFetch(path, apiKey, query = {}) {
  const url = new URL(`${ARBOX_BASE}/${path.replace(/^\//, '')}`);
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url, {
    headers: {
      'api-key': apiKey,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  const bodyOk = res.ok && (!data?.error || data?.statusCode === 200 || data?.statusCode === 204);
  return { status: res.status, ok: bodyOk, data };
}

function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekRange(weekStartInput) {
  let start;

  if (typeof weekStartInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(weekStartInput)) {
    const [y, m, d] = weekStartInput.slice(0, 10).split('-').map(Number);
    start = new Date(y, m - 1, d);
  } else if (weekStartInput) {
    const parsed = new Date(weekStartInput);
    if (!Number.isNaN(parsed.getTime())) {
      start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  if (!start || Number.isNaN(start.getTime())) {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: localDateKey(start), to: localDateKey(end), weekStart: start };
}

/** Arbox allows max 31 days per request — never exceed that. */
function extendedFetchRange(weekStartInput) {
  const { weekStart, from: weekFrom, to: weekTo } = weekRange(weekStartInput);
  return {
    from: weekFrom,
    to: weekTo,
    weekStart,
    weekFrom,
    weekTo,
  };
}

function daysBetweenInclusive(fromKey, toKey) {
  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000) + 1;
}

function addDaysToDateKey(dateKey, offset) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offset);
  return localDateKey(dt);
}

function pickArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  // Arbox standard envelope: { statusCode, data: [...] }
  if (Array.isArray(payload.data)) return payload.data;

  const keys = ['data', 'items', 'schedule', 'results', 'users', 'schedules', 'classes', 'sessions'];
  for (const key of keys) {
    const val = payload[key];
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      const grouped = flattenGroupedSchedule(val);
      if (grouped.length) return grouped;
    }
  }

  if (typeof payload === 'object') {
    const grouped = flattenGroupedSchedule(payload);
    if (grouped.length) return grouped;
  }

  return [];
}

/** Arbox sometimes returns { "2026-07-05": [classes...] } */
function flattenGroupedSchedule(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const out = [];
  for (const [key, val] of Object.entries(obj)) {
    if (!Array.isArray(val)) continue;
    for (const item of val) {
      if (!item || typeof item !== 'object') continue;
      out.push(/^\d{4}-\d{2}-\d{2}/.test(key) ? { ...item, date: item.date ?? key } : item);
    }
  }
  return out;
}

function flattenSchedulePayload(data) {
  const rows = pickArray(data);
  if (rows.length) return rows;
  if (data && typeof data === 'object') return flattenGroupedSchedule(data);
  return [];
}

function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

function personName(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return str(
      value.name ??
        value.full_name ??
        value.staff_member ??
        `${value.first_name ?? ''} ${value.last_name ?? ''}`.trim()
    );
  }
  return String(value).trim();
}

function contactStr(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return str(value);
  if (typeof value === 'object') {
    return str(value.phone ?? value.mobile ?? value.cell_phone ?? value.phone_number);
  }
  return '';
}

function mapAttendee(row, index) {
  const first = str(row.first_name ?? row.firstName);
  const last = str(row.last_name ?? row.lastName);
  const name =
    personName(row.full_name ?? row.fullName ?? row.name) ||
    str(`${first} ${last}`.trim()) ||
    `Client ${index + 1}`;
  return {
    id: str(row.id ?? row.user_id ?? row.users_id ?? row.membership_user_id ?? `client-${index}`),
    name,
    phone:
      contactStr(
        row.phone ??
          row.mobile ??
          row.cell_phone ??
          row.phone_number ??
          row.phone_mobile
      ) || undefined,
    email: str(row.email) || undefined,
  };
}

function parseStartFromRow(row, weekStartDate) {
  const dateStr = str(row.date ?? row.start_date ?? row.schedule_date ?? row.day).slice(0, 10);
  const timeRaw = str(row.time ?? row.hour ?? row.start_hour ?? row.start_time ?? row.session_time);
  const timeMatch = timeRaw.match(/(\d{1,2}):(\d{2})/);
  const timeStr = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '09:00';

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const local = new Date(`${dateStr}T${timeStr}:00`);
    if (!Number.isNaN(local.getTime())) {
      return { iso: local.toISOString(), dateKey: dateStr };
    }
  }

  for (const field of ['start', 'start_time', 'start_at', 'date_time', 'begin_time', 'datetime']) {
    const raw = str(row[field]);
    if (!raw) continue;
    const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) {
      return { iso: d.toISOString(), dateKey: localDateKey(d) };
    }
  }

  const fallback = weekStartDate.toISOString();
  return { iso: fallback, dateKey: localDateKey(weekStartDate) };
}

function registrationRowsFromScheduleRow(row) {
  const nested = row.registration_Details ?? row.registration_details;
  const fromNested = Array.isArray(nested)
    ? nested
    : nested && typeof nested === 'object'
      ? pickArray(nested)
      : [];

  return [
    ...fromNested,
    ...pickArray(row.registrations),
    ...pickArray(row.users),
    ...pickArray(row.participants),
    ...pickArray(row.schedule_users),
  ];
}

function scheduleIdFromRegistration(row) {
  return str(
    row.box_schedule_id ??
      row.schedule_id ??
      row.schedule_users_box_schedule_id ??
      row.boxScheduleId
  );
}

function durationFromTimes(startTime, endTime) {
  const sm = str(startTime).match(/(\d{1,2}):(\d{2})/);
  const em = str(endTime).match(/(\d{1,2}):(\d{2})/);
  if (!sm || !em) return 50;
  const mins = Number(em[1]) * 60 + Number(em[2]) - (Number(sm[1]) * 60 + Number(sm[2]));
  return mins > 0 ? mins : 50;
}

function mapScheduleRow(row, weekStartDate) {
  const arboxId = str(row.schedule_id ?? row.id ?? row.box_schedule_id ?? row.boxScheduleId);
  const title =
    str(
      row.session_name ??
        row.name ??
        row.title ??
        row.class_name ??
        row.box_category_name ??
        row.boxCategory?.name ??
        row.box_category?.name ??
        row.category_name
    ) || 'Class';

  const { iso: startIso, dateKey } = parseStartFromRow(row, weekStartDate);
  const duration =
    Number(row.duration ?? row.length ?? row.session_length) ||
    durationFromTimes(row.start_time, row.end_time);
  const instructorName = personName(
    row.staff_member ??
      row.coach_name ??
      row.instructor_name ??
      row.staff_name ??
      row.trainer_name ??
      row.coach
  );
  const staffMember = row.staff_member;
  const instructorId = str(
    (staffMember && typeof staffMember === 'object' ? staffMember.user_id : null) ??
      row.staff_id ??
      row.instructor_id ??
      row.trainer_id ??
      row.coach_id ??
      instructorName
  );
  const enrolled = Number(
    row.registration_count ??
      row.registrations_count ??
      row.enrolled ??
      row.booked ??
      row.participants_count
  );
  const capacity = Number(row.max_participants ?? row.capacity ?? row.max_users ?? row.spaces);

  const registrationRows = registrationRowsFromScheduleRow(row);
  const attendees = registrationRows.map(mapAttendee).filter((a) => a.name);

  return {
    id: `arbox-${arboxId || title}-${dateKey}`,
    arboxId,
    title,
    start: startIso,
    duration,
    source: 'arbox',
    location:
      str(row.location_name ?? row.location ?? row.room_name ?? row.space_name) || undefined,
    instructor: instructorName || undefined,
    instructorId: instructorId || undefined,
    enrolled: Number.isFinite(enrolled) ? enrolled : attendees.length || undefined,
    capacity: Number.isFinite(capacity) ? capacity : undefined,
    attendees,
    feedbackSentAt: null,
  };
}

function attachRegistrationsToEvents(events, registrationRows) {
  if (!registrationRows.length) return events;

  const bySchedule = new Map();
  for (const row of registrationRows) {
    const sid = scheduleIdFromRegistration(row);
    if (!sid) continue;
    if (!bySchedule.has(sid)) bySchedule.set(sid, []);
    bySchedule.get(sid).push(row);
  }

  return events.map((ev) => {
    if ((ev.attendees ?? []).length > 0) return ev;
    const rows = bySchedule.get(ev.arboxId) ?? [];
    if (!rows.length) return ev;
    const attendees = rows.map(mapAttendee).filter((a) => a.name);
    return {
      ...ev,
      attendees,
      enrolled: ev.enrolled ?? attendees.length,
    };
  });
}

function buildTeamFromEvents(events) {
  const byId = new Map();
  for (const ev of events) {
    const id = ev.instructorId || ev.instructor;
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, { id, name: ev.instructor || 'Instructor', role: 'instructor' });
    }
  }
  return [...byId.values()];
}

function parseArboxRoleTokens(userRole) {
  return String(userRole ?? '')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
}

function mapArboxStaffRole(userRole) {
  const roles = parseArboxRoleTokens(userRole);
  if (roles.includes('BOXADMIN')) return 'studio_manager';
  if (roles.includes('BASICMANAGER')) return 'studio_manager';
  if (roles.includes('SYSTEMADMIN')) return 'studio_manager';
  if (roles.includes('SUPERADMIN')) return 'studio_manager';
  if (roles.includes('COACH')) return 'instructor';
  if (roles.includes('INSTRUCTOR')) return 'instructor';
  return 'instructor';
}

function staffMemberName(row) {
  return (
    str(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()) ||
    str(row.email) ||
    (row.user_id != null ? `Staff ${row.user_id}` : '')
  );
}

function mapStaffRow(row) {
  const id = str(row.user_id);
  if (!id) return null;
  const name = staffMemberName(row);
  if (!name) return null;
  return {
    id,
    name,
    role: mapArboxStaffRole(row.user_role),
  };
}

function mergeTeams(staffTeam, scheduleTeam) {
  const byId = new Map(staffTeam.map((m) => [m.id, m]));
  for (const member of scheduleTeam) {
    if (!byId.has(member.id)) byId.set(member.id, member);
  }
  return [...byId.values()];
}

function pickPrimaryStaff(team, preferredId) {
  const preferred = preferredId
    ? team.find((m) => String(m.id) === String(preferredId))
    : undefined;
  if (preferred) {
    return { role: preferred.role, staffId: preferred.id, staffName: preferred.name };
  }
  if (team.length === 1) {
    const member = team[0];
    return { role: member.role, staffId: member.id, staffName: member.name };
  }
  return { role: 'instructor', staffId: '', staffName: 'Studio' };
}

async function fetchArboxStaffMembers(apiKey) {
  const byId = new Map();
  let page = 1;

  while (page <= 10) {
    const res = await arboxFetch('v3/users/allStaffMembers', apiKey, { limit: 500, page });
    if (!res.ok) break;

    const rows = pickArray(res.data);
    for (const row of rows) {
      const member = mapStaffRow(row);
      if (member) byId.set(member.id, member);
    }

    const pagination = res.data?.extra?.pagination;
    if (!pagination?.next_page_url || rows.length < 500) break;
    page += 1;
  }

  return [...byId.values()];
}

async function fetchAllSchedulePages(apiKey, query) {
  const span = daysBetweenInclusive(query.from_date, query.to_date);
  if (span > 31) {
    return {
      rows: [],
      error: `Date range is ${span} days — Arbox max is 31`,
    };
  }

  const all = [];
  let page = 1;
  let lastError = null;

  while (page <= 20) {
    const res = await arboxFetch('v3/schedule', apiKey, { ...query, limit: 500, page });
    const rows = flattenSchedulePayload(res.data);

    if (!res.ok) {
      lastError = res.data?.error?.message ?? res.data?.error ?? `HTTP ${res.status}`;
      break;
    }

    all.push(...rows);
    const pagination = res.data?.extra?.pagination;
    if (pagination?.next_page_url) {
      page += 1;
      continue;
    }
    if (rows.length < 500) break;
    page += 1;
  }

  return { rows: all, error: lastError };
}

function locationIdsFromPayload(payload) {
  return pickArray(payload)
    .map((loc) => loc.location_id ?? loc.id ?? loc.locations_box_id ?? loc.box_id)
    .filter((id) => id != null && id !== '')
    .map((id) => String(id));
}

const SCHEDULE_WITH_ATTENDEES = {
  transparent: '1',
  registration_details: '1',
};

function scheduleIdFromRow(row) {
  return str(row.schedule_id ?? row.id ?? row.box_schedule_id ?? row.boxScheduleId);
}

function rowHasRegistration(row) {
  const nested = row.registration_Details ?? row.registration_details;
  return Array.isArray(nested) && nested.length > 0;
}

function mergeRegistrationDetails(baseRows, enrichedRows) {
  const byId = new Map();
  for (const row of enrichedRows) {
    const id = scheduleIdFromRow(row);
    if (id) byId.set(id, row);
  }

  return baseRows.map((row) => {
    if (rowHasRegistration(row)) return row;
    const enriched = byId.get(scheduleIdFromRow(row));
    if (!enriched) return row;
    const reg = enriched.registration_Details ?? enriched.registration_details;
    if (!reg) return row;
    return { ...row, registration_Details: reg, registration_details: reg };
  });
}

async function loadScheduleAttempt(apiKey, query, attempts) {
  const { rows, error } = await fetchAllSchedulePages(apiKey, query);
  attempts.push({
    query,
    rows: rows.length,
    withReg: rows.filter(rowHasRegistration).length,
    error,
  });
  return rows;
}

async function resolveScheduleRows(apiKey, from, to, extraQuery, attempts) {
  const dateQuery = { from_date: from, to_date: to, ...extraQuery };
  const queries = [
    { ...dateQuery, ...SCHEDULE_WITH_ATTENDEES },
    { ...dateQuery, transparent: '1', registration_details: '1' },
    { ...dateQuery, transparent: '1' },
    { ...dateQuery, registration_details: '1' },
    dateQuery,
  ];

  let fallback = null;

  for (const query of queries) {
    const rows = await loadScheduleAttempt(apiKey, query, attempts);
    if (!rows.length) continue;
    if (rows.some(rowHasRegistration)) {
      return { rows, query };
    }
    if (!fallback) fallback = { rows, query };
  }

  if (!fallback) return null;

  const enriched = await loadScheduleAttempt(
    apiKey,
    { ...dateQuery, ...SCHEDULE_WITH_ATTENDEES, merge: '1' },
    attempts
  );
  const rows = enriched.some(rowHasRegistration)
    ? mergeRegistrationDetails(fallback.rows, enriched)
    : fallback.rows;

  return { rows, query: fallback.query };
}

async function fetchScheduleRows(apiKey, from, to) {
  const attempts = [];

  const primary = await resolveScheduleRows(apiKey, from, to, {}, attempts);
  if (primary?.rows.length) {
    return { ok: true, rows: primary.rows, from, to, query: primary.query, attempts };
  }

  const locationsRes = await arboxFetch('v3/locations', apiKey);
  const locationIds = locationIdsFromPayload(locationsRes.data);
  attempts.push({ step: 'locations', locationIds });

  for (const locationId of locationIds) {
    const located = await resolveScheduleRows(apiKey, from, to, { location_id: locationId }, attempts);
    if (located?.rows.length) {
      return {
        ok: true,
        rows: located.rows,
        from,
        to,
        locationId,
        query: located.query,
        attempts,
      };
    }
  }

  const { rows, error } = await fetchAllSchedulePages(apiKey, { from_date: from, to_date: to });
  attempts.push({ query: { from_date: from, to_date: to }, rows: rows.length, error });

  return {
    ok: true,
    rows,
    from,
    to,
    message: error ?? 'No classes returned for this date range',
    attempts,
  };
}

async function fetchScheduleRegistrationRows(apiKey, from, to) {
  const attempts = [
    ['v3/schedule/users', { from_date: from, to_date: to }],
    ['v3/schedule_users', { from_date: from, to_date: to }],
  ];

  for (const [path, query] of attempts) {
    const res = await arboxFetch(path, apiKey, query);
    if (res.ok) {
      const rows = pickArray(res.data);
      if (rows.length) return rows;
    }
  }
  return [];
}

function enrichAttendeesWithClients(attendees, clients) {
  if (!attendees.length || !clients.length) return attendees;
  const byId = new Map(clients.map((c) => [c.id, c]));
  return attendees.map((a) => {
    const client = byId.get(a.id);
    if (!client) return a;
    return {
      ...a,
      name: a.name || client.name,
      phone: a.phone || client.phone,
      email: a.email || client.email,
    };
  });
}

async function buildScheduleEvents(apiKey, weekStartInput) {
  const range = extendedFetchRange(weekStartInput);
  const scheduleRes = await fetchScheduleRows(apiKey, range.from, range.to);
  if (!scheduleRes.ok) {
    return { ok: false, events: [], message: scheduleRes.message ?? 'Could not load Arbox schedule' };
  }

  let events = scheduleRes.rows.map((row) => mapScheduleRow(row, range.weekStart));
  const registrationRows = await fetchScheduleRegistrationRows(apiKey, range.from, range.to);
  events = attachRegistrationsToEvents(events, registrationRows);
  const clients = await fetchArboxClients(apiKey);
  events = events.map((ev) => ({
    ...ev,
    attendees: enrichAttendeesWithClients(ev.attendees ?? [], clients),
  }));

  return {
    ok: true,
    events,
    clients,
    debug: {
      from: range.from,
      to: range.to,
      weekFrom: range.weekFrom,
      weekTo: range.weekTo,
      rowCount: scheduleRes.rows.length,
      message: scheduleRes.message,
      attempts: scheduleRes.attempts,
      mappedCount: events.length,
      sample: scheduleRes.rows[0]
        ? {
            keys: Object.keys(scheduleRes.rows[0]).slice(0, 14),
            session_name: scheduleRes.rows[0].session_name,
            date: scheduleRes.rows[0].date,
            start_time: scheduleRes.rows[0].start_time,
          }
        : null,
    },
  };
}

async function fetchArboxClients(apiKey) {
  const attempts = [
    { only_clients: '1', active: '1', limit: 500 },
    { only_clients: '1', limit: 500 },
    {},
  ];

  const byId = new Map();
  for (const query of attempts) {
    const res = await arboxFetch('v3/users', apiKey, query);
    if (!res.ok) continue;
    for (const row of pickArray(res.data)) {
      const client = mapAttendee(row);
      if (client.name) byId.set(client.id, client);
    }
    if (byId.size) break;
  }

  return [...byId.values()];
}

async function probeKey(apiKey) {
  const endpoints = [];
  for (const path of READ_PATHS) {
    const today = localDateKey(new Date());
    const query = path.includes('schedule') ? { from_date: today, to_date: today } : {};
    const result = await arboxFetch(path, apiKey, query);
    endpoints.push({ path, status: result.status, ok: result.ok });
    if (!result.ok && result.status === 401) {
      return {
        ok: false,
        mode: 'unavailable',
        message: 'Invalid Arbox API key — copy it from Settings → Club Information in Arbox',
        endpoints,
      };
    }
  }

  const schedule = await arboxFetch('v3/schedule', apiKey, {
    from_date: localDateKey(new Date()),
    to_date: localDateKey(new Date()),
    registration_details: '1',
    Registration_count: '1',
    limit: 500,
  });
  const rows = flattenSchedulePayload(schedule.data);
  const sampleKeys = rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).slice(0, 14) : [];

  return {
    ok: true,
    mode: 'live',
    message: 'Connected to Arbox API (read-only)',
    endpoints,
    sampleKeys,
    scheduleToday: rows.length,
    sampleClass: rows[0]
      ? {
          session_name: rows[0].session_name,
          date: rows[0].date,
          start_time: rows[0].start_time,
        }
      : null,
  };
}

function buildConnection(apiKey, locationsPayload, events, staffTeam, preferredStaffId) {
  const locations = pickArray(locationsPayload);
  const clubName =
    str(
      locations[0]?.location_name ??
        locations[0]?.box_name ??
        locations[0]?.name ??
        locations[0]?.club_name
    ) || 'Arbox Studio';
  const clubId = str(locations[0]?.location_id ?? locations[0]?.box_id ?? locations[0]?.id ?? 'arbox-live');
  const team = mergeTeams(staffTeam, buildTeamFromEvents(events));
  const primary = pickPrimaryStaff(team, preferredStaffId);

  return {
    connected: true,
    apiKey,
    lastSyncedAt: null,
    clubName,
    clubId,
    role: primary.role,
    staffId: primary.staffId,
    staffName: primary.staffName,
    team,
    autoFeedbackEnabled: false,
    dataSource: 'live',
  };
}

async function handleConnect(body) {
  const apiKey = str(body.apiKey);
  if (apiKey.length < 8) {
    return { status: 400, body: { message: 'API key must be at least 8 characters' } };
  }

  const probe = await probeKey(apiKey);
  if (!probe.ok) {
    return { status: 401, body: { message: probe.message, probe } };
  }

  const weekStartInput = body.weekStartDate ?? body.weekStart ?? localDateKey(new Date());
  const [locationsRes, scheduleResult, clients, staffTeam] = await Promise.all([
    arboxFetch('v3/locations', apiKey),
    buildScheduleEvents(apiKey, weekStartInput),
    fetchArboxClients(apiKey),
    fetchArboxStaffMembers(apiKey),
  ]);

  if (!scheduleResult.ok) {
    return { status: 502, body: { message: scheduleResult.message, probe } };
  }

  const connection = buildConnection(
    apiKey,
    locationsRes.data,
    scheduleResult.events,
    staffTeam,
    body.linkedInstructorId ?? body.staffId
  );

  return {
    status: 200,
    body: {
      connection,
      events: scheduleResult.events,
      clients,
      probe,
      debug: scheduleResult.debug,
    },
  };
}

async function handleSchedule(apiKey, weekStartIso) {
  if (!apiKey || apiKey.length < 8) {
    return { status: 401, body: { message: 'Missing Arbox API key' } };
  }

  const [scheduleResult, clients] = await Promise.all([
    buildScheduleEvents(apiKey, weekStartIso ?? localDateKey(new Date())),
    fetchArboxClients(apiKey),
  ]);

  if (!scheduleResult.ok) {
    return {
      status: 502,
      body: { message: scheduleResult.message },
    };
  }

  return {
    status: 200,
    body: {
      events: scheduleResult.events,
      clients,
      debug: scheduleResult.debug,
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-arbox-api-key',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, sms: false, readOnly: true });
    }

    if (req.method === 'POST' && url.pathname === '/probe') {
      const body = await readBody(req);
      const probe = await probeKey(str(body.apiKey));
      return json(res, probe.ok ? 200 : 401, probe);
    }

    if (req.method === 'POST' && url.pathname === '/connect') {
      const body = await readBody(req);
      const result = await handleConnect(body);
      return json(res, result.status, result.body);
    }

    if (req.method === 'GET' && url.pathname === '/schedule') {
      const apiKey = req.headers['x-arbox-api-key'] ?? url.searchParams.get('apiKey');
      const result = await handleSchedule(str(apiKey), url.searchParams.get('weekStart'));
      return json(res, result.status, result.body);
    }

    if (req.method === 'GET' && url.pathname === '/users') {
      const apiKey = req.headers['x-arbox-api-key'] ?? url.searchParams.get('apiKey');
      if (!apiKey || apiKey.length < 8) {
        return json(res, 401, { message: 'Missing Arbox API key' });
      }
      const clients = await fetchArboxClients(str(apiKey));
      return json(res, 200, { clients });
    }

    if (url.pathname.includes('message') || url.pathname.includes('sms')) {
      return json(res, 403, { message: 'Outbound messaging is disabled in FITback dev proxy' });
    }

    return json(res, 404, { message: 'Not found' });
  } catch (err) {
    return json(res, 500, { message: err instanceof Error ? err.message : 'Server error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Arbox read-only proxy on http://127.0.0.1:${PORT} (no SMS)`);
});
