import type { StudioRole } from '@/data/scheduleTypes';
import type { StudioMembership } from '@/data/studioOrg';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';
import './StudioSwitcher.css';

function roleLabel(role: StudioRole, t: (key: string) => string): string {
  switch (role) {
    case 'studio_manager':
      return t('auth.studioManager');
    case 'instructor':
      return t('auth.instructor');
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function StudioSwitcher({ memberships }: { memberships: StudioMembership[] }) {
  const { user, switchStudio } = useAuth();
  const { t } = useI18n();
  const activeId = user?.activeStudioId;

  if (memberships.length === 0) return null;

  return (
    <div className="studio-switcher">
      <p className="studio-switcher__label">{t('studio.current')}</p>
      <div className="studio-switcher__list">
        {memberships.map((studio) => {
          const active = studio.clubId === activeId;
          return (
            <button
              key={studio.clubId}
              type="button"
              className={`studio-switcher__btn${active ? ' active' : ''}`}
              onClick={() => switchStudio(studio.clubId)}
              disabled={active}
            >
              <span className="studio-switcher__name">{studio.clubName}</span>
              <span className="studio-switcher__role">{roleLabel(studio.role, t)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
