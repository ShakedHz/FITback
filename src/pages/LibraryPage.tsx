import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { LessonCover } from '@/components/LessonCover';
import {
  TRAINING_TYPE_COLORS,
  type TrainingType,
} from '@/data/trainingTypes';
import { levelLabel, trainingLabel, useI18n } from '@/i18n';
import { lessonHasMedia } from '@/utils/lessonCover';
import { Film } from 'lucide-react';
import './Library.css';

type TypeFilter = 'all' | TrainingType;

export function LibraryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const navigate = useNavigate();
  const { createdLessons, instructor } = useApp();
  const { t } = useI18n();

  const specialties = instructor.specialties;
  const items = createdLessons;

  const filterOptions = useMemo(() => {
    const options: { id: TypeFilter; label: string }[] = [{ id: 'all', label: t('common.all') }];
    specialties.forEach((type) => {
      options.push({ id: type, label: trainingLabel(type, t) });
    });
    return options;
  }, [specialties, t]);

  useEffect(() => {
    if (typeFilter !== 'all' && !specialties.includes(typeFilter)) {
      setTypeFilter('all');
    }
  }, [specialties, typeFilter]);

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((l) => l.trainingType === typeFilter);
  }, [items, typeFilter]);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('library.title')}</h1>
        <p className="page-subtitle">
          {specialties.length > 0
            ? t('library.plansFor', { types: specialties.map((type) => trainingLabel(type, t)).join(', ') })
            : t('library.subtitle')}
        </p>
      </div>

      {items.length > 0 && filterOptions.length > 2 && (
        <div className="library-filters">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`library-filter ${typeFilter === opt.id ? 'library-filter--active' : ''}`}
              onClick={() => setTypeFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: '#94a3b8' }}>{t('library.empty')}</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/create')}
          >
            {t('library.create')}
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="library-empty-filter">{t('library.emptyFilter')}</p>
      ) : (
        filteredItems.map((lesson) => {
          const typeStyle = TRAINING_TYPE_COLORS[lesson.trainingType];
          return (
            <div
              key={lesson.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/lesson/${lesson.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {lessonHasMedia(lesson) ? (
                  <LessonCover lesson={lesson} alt={lesson.title} size="sm" />
                ) : (
                  <div className="library-card__no-media" aria-hidden>
                    <Film size={20} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600 }}>{lesson.title}</p>
                  <div className="library-card__meta">
                    <span
                      className="library-type-badge"
                      style={{
                        background: typeStyle.bg,
                        borderColor: typeStyle.border,
                        color: typeStyle.text,
                      }}
                    >
                      {trainingLabel(lesson.trainingType, t)}
                    </span>
                    <InstructorAvatar
                      src={instructor.avatar}
                      name={instructor.name}
                      size="sm"
                    />
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>
                      {t('library.meta', { duration: lesson.duration, level: levelLabel(lesson.level, t) })}
                    </p>
                  </div>
                </div>
                <span className="rtl-flip" style={{ color: '#a78bfa' }}>→</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
