import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Check, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { BackButton } from '@/components/IconToolbar';
import { exercisesPath } from '@/utils/exerciseNav';
import { categoryLabel, useI18n } from '@/i18n';

const CATEGORIES = ['Warm-up', 'Core', 'Back', 'Stretching', 'Cool-down', 'Other'];

export function AddExercisePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addCustomExercise } = useApp();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameHe, setNameHe] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [duration, setDuration] = useState(2);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const libraryPath = exercisesPath(searchParams.get('section'), searchParams);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError(t('errors.videoFile'));
      return;
    }
    if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name);
    setError(null);
  };

  const removeVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setVideoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!nameHe.trim()) {
      setError(t('errors.exerciseName'));
      return;
    }
    setError(null);
    addCustomExercise({
      nameHe: nameHe.trim(),
      name: name.trim() || nameHe.trim(),
      category,
      duration,
      videoUrl: videoUrl || '',
    });
    setSaved(true);
    setTimeout(() => navigate(libraryPath), 1200);
  };

  const previewExercise = videoUrl
    ? {
        id: 'preview',
        nameHe: nameHe || t('exercises.previewName'),
        name: name || 'New Exercise',
        duration,
        category,
        videoUrl,
        isCustom: true,
      }
    : null;

  return (
    <div className="page fade-in">
      <BackButton to={libraryPath} label={t('common.back')} />
      <h1 className="page-title">{t('exercises.addPageTitle')}</h1>
      <p className="page-subtitle">{t('exercises.addSubtitle')}</p>

      {error && (
        <p
          role="alert"
          style={{
            margin: '0 0 12px',
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            color: '#fca5a5',
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}

      <div className="card" style={{ marginTop: 8 }}>
        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
          {t('exercises.nameRequired')}
        </label>
        <input
          className="input"
          placeholder={t('exercises.namePlaceholder')}
          value={nameHe}
          onChange={(e) => {
            setNameHe(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error && !nameHe.trim())}
        />

        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', margin: '12px 0 6px' }}>
          {t('exercises.englishOptional')}
        </label>
        <input
          className="input"
          placeholder="Side Plank"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', margin: '12px 0 6px' }}>
          {t('exercises.category')}
        </label>
        <div className="chip-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip ${category === cat ? 'selected' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {categoryLabel(cat, t)}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', margin: '12px 0 6px' }}>
          {t('exercises.duration')}
        </label>
        <input
          className="input"
          type="number"
          min={1}
          max={10}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p className="section-title">
          {t('exercises.video')} <span style={{ color: '#64748b', fontWeight: 400 }}>({t('common.optional')})</span>
        </p>
        <div
          className={`add-exercise-upload ${videoUrl ? 'has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleFileChange}
          />
          {videoUrl ? (
            <>
              <p style={{ fontWeight: 600, color: '#a78bfa' }}>{t('exercises.uploaded')}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{videoFileName}</p>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{t('exercises.tapReplace')}</p>
            </>
          ) : (
            <>
              <Upload size={28} color="#8b5cf6" style={{ marginBottom: 8 }} />
              <p style={{ fontWeight: 600 }}>{t('exercises.addVideo')}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {t('exercises.videoHint')}
              </p>
            </>
          )}
        </div>
        {videoUrl && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8, width: '100%' }}
            onClick={removeVideo}
          >
            <X size={16} /> {t('exercises.removeVideo')}
          </button>
        )}
      </div>

      {previewExercise && (
        <div className="add-exercise-preview">
          <ExerciseVideo exercise={previewExercise} size="hero" showPlayButton />
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: 20 }}
        onClick={handleSubmit}
        disabled={saved}
      >
        {saved ? (
          <><Check size={18} /> {t('exercises.saved')}</>
        ) : (
          t('exercises.save')
        )}
      </button>
    </div>
  );
}
