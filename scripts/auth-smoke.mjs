/**
 * Smoke checks for SSO account lookup (no browser, no Google/Apple network).
 * Mirrors src/auth/accountLookup.ts — keep in sync.
 */
function findStoredAccount(users, query) {
  switch (query.provider) {
    case 'google': {
      if (query.googleSub) {
        const bySub = users.find((u) => u.googleSub === query.googleSub);
        if (bySub) return bySub;
      }
      return findByEmailExcludingArbox(users, query.email);
    }
    case 'apple': {
      if (query.appleSub) {
        const bySub = users.find((u) => u.appleSub === query.appleSub);
        if (bySub) return bySub;
      }
      return findByEmailExcludingArbox(users, query.email);
    }
    case 'arbox': {
      const club = query.arboxClubId?.trim();
      const staff = query.arboxStaffId?.trim();
      if (!club && !staff) return undefined;
      return users.find((u) => {
        if (u.provider !== 'arbox') return false;
        if (club && u.arboxClubId === club) return true;
        if (staff && u.arboxStaffId === staff) return true;
        return false;
      });
    }
    case 'email':
      return findByEmailExcludingArbox(users, query.email);
    default:
      throw new Error(`unhandled provider ${query.provider}`);
  }
}

function findByEmailExcludingArbox(users, email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return undefined;
  return users.find((u) => u.provider !== 'arbox' && u.email === normalized);
}

const appleFirst = {
  id: 'apple_1',
  email: 'real@example.com',
  provider: 'apple',
  appleSub: 'apple-sub-99',
};
const arbox = {
  id: 'arbox_1',
  email: 'club@arbox.fitback.app',
  provider: 'arbox',
  arboxClubId: 'club-1',
  arboxStaffId: 'staff-9',
};
const google = {
  id: 'google_1',
  email: 'g@example.com',
  provider: 'google',
  googleSub: 'g-sub',
};
const users = [appleFirst, arbox, google];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(
  findStoredAccount(users, { provider: 'apple', appleSub: 'apple-sub-99' })?.id === 'apple_1',
  'Apple second login (sub only, no email) must reuse the first account'
);
assert(
  findStoredAccount(users, { provider: 'apple', email: 'real@example.com' })?.id === 'apple_1',
  'Apple email fallback'
);
assert(
  findStoredAccount(users, { provider: 'google', googleSub: 'g-sub' })?.id === 'google_1',
  'Google lookup by sub'
);
assert(
  findStoredAccount(users, { provider: 'google', email: 'club@arbox.fitback.app' }) === undefined,
  'Google must not merge onto an Arbox account'
);
assert(
  findStoredAccount(users, { provider: 'arbox', arboxClubId: 'club-1' })?.id === 'arbox_1',
  'Arbox lookup by club id'
);

console.log('auth-smoke: account lookup ok');
