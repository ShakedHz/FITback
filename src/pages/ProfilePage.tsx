import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, RefreshCw, LogOut, Camera, Building2, Settings } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { TRAINING_TYPE_COLORS } from '@/data/trainingTypes';
import { instructorBio, trainingLabel, useI18n } from '@/i18n';
import { fileToAvatarDataUrl } from '@/utils/avatarImage';
import './Profile.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateAvatar } = useAuth();
  const { instructor, logout } = useApp();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const activeStudio = user?.memberships?.find((m) => m.clubId === user.activeStudioId);
  const bio = instructor.specialties.length > 0
    ? instructorBio(instructor.specialties, t)
    : instructor.bio;

  const stats = [
    { icon: BookOpen, value: instructor.lessonsCount, label: t('profile.lessons') },
    { icon: Users, value: instructor.studentsCount, label: t('profile.students') },
    { icon: RefreshCw, value: `${instructor.retention}%`, label: t('profile.retention') },
  ];

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

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="stat-box">
            <Icon size={18} color="var(--color-primary-bright)" style={{ marginBottom: 4 }} />
            <div className="stat-value" style={{ fontSize: 18 }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} /> {t('profile.settings')}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/studio')}
        >
          <Building2 size={18} /> {t('profile.studios')}
        </button>
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
