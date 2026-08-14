import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, RefreshCw, LogOut, Camera } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/data/trainingTypes';
import { fileToAvatarDataUrl } from '@/utils/avatarImage';
import './Profile.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateAvatar } = useAuth();
  const { instructor, logout } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const stats = [
    { icon: BookOpen, value: instructor.lessonsCount, label: 'Lessons' },
    { icon: Users, value: instructor.studentsCount, label: 'Students' },
    { icon: RefreshCw, value: `${instructor.retention}%`, label: 'Retention' },
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
      setAvatarError(err instanceof Error ? err.message : 'Could not update photo');
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
            aria-label={instructor.avatar ? 'Change profile photo' : 'Add profile photo'}
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
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{user.email}</p>
        )}

        {instructor.bio && (
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>
            {instructor.bio}
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
                  {TRAINING_TYPE_LABELS[type]}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="stat-box">
            <Icon size={18} color="#a78bfa" style={{ marginBottom: 4 }} />
            <div className="stat-value" style={{ fontSize: 18 }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={() => { logout(); navigate('/'); }}
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}
