import type { AuthProvider, StoredAccount } from './types';

export interface AccountLookupQuery {
  provider: AuthProvider;
  email?: string;
  googleSub?: string;
  appleSub?: string;
  arboxClubId?: string;
  arboxStaffId?: string;
}

/**
 * Resolve an existing local account. Provider subject wins; email is a
 * fallback for Google/Apple/email only — never merge those with Arbox.
 */
export function findStoredAccount(
  users: StoredAccount[],
  query: AccountLookupQuery
): StoredAccount | undefined {
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
    default: {
      const _exhaustive: never = query.provider;
      return _exhaustive;
    }
  }
}

function findByEmailExcludingArbox(
  users: StoredAccount[],
  email: string | undefined
): StoredAccount | undefined {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return undefined;
  return users.find((u) => u.provider !== 'arbox' && u.email === normalized);
}
