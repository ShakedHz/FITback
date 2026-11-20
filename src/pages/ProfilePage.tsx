import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { ProfileSettings } from '@/components/ProfileSettings';
import type { StudioRole } from '@/data/scheduleTypes';
import { TRAINING_TYPE_COLORS } from '@/data/trainingTypes';
import { instructorBio, trainingLabel, useI18n } from '@/i18n';
import { fileToAvatarDataUrl } from '@/utils/avatarImage';
import './Profile.css';

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

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateAvatar, activeMembership } = useAuth();
  const { instructor, logout } = useApp();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const activeStudio = activeMembership ?? user?.memberships?.find((m) => m.clubId === user.activeStudioId);
  const bio = instructor.specialties.length > 0
    ? instructorBio(instructor.specialties, t)
    : instructor.bio;


  const openPicker = () => {
    setAvatarError(null);
    inputRef.current?.click();
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      updateAvatar(dataUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t('errors.photo'));
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="profile-avatar">
          <button
            type="button"
            className="profile-avatar__btn"
            onClick={openPicker}
            disabled={avatarBusy}
            aria-label={instructor.avatar ? t('profile.changePhoto') : t('profile.addPhoto')}
          >
            <InstructorAvatar src={instructor.avatar} name={instructor.name} size="xl" />
          </button>
          <span className="profile-avatar__edit" aria-hidden>
            <Camera size={14} strokeWidth={2.5} />
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPickFile}
          />
        </div>
        {avatarError && <p className="profile-avatar__error">{avatarError}</p>}

        <h1 className="page-title">{instructor.name}</h1>
        {user?.email && (
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, marginTop: 4 }}>{user.email}</p>
        )}
        {activeStudio && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            {activeStudio.clubName}
            {' · '}
            {roleLabel(activeStudio.role, t)}
          </p>
        )}

        {bio && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
            {bio}
          </p>
        )}

        {instructor.specialties.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            {instructor.specialties.map((type) => {
              const colors = TRAINING_TYPE_COLORS[type];
              return (
                <span
                  key={type}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  {trainingLabel(type, t)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <ProfileSettings />

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={() => { logout(); navigate('/'); }}
        >
          <LogOut size={18} /> {t('profile.logout')}
        </button>
      </div>
    </div>
  );
}
