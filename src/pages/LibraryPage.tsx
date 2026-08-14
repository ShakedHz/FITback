import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { LessonCover } from '@/components/LessonCover';
import {
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_COLORS,
  type TrainingType,
} from '@/data/trainingTypes';
import { lessonHasMedia } from '@/utils/lessonCover';
import { Film } from 'lucide-react';
import './Library.css';

type TypeFilter = 'all' | TrainingType;

export function LibraryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const navigate = useNavigate();
  const { createdLessons, instructor } = useApp();

  const specialties = instructor.specialties;
  const items = createdLessons;

  const filterOptions = useMemo(() => {
    const options: { id: TypeFilter; label: string }[] = [{ id: 'all', label: 'All' }];
    specialties.forEach((type) => {
      options.push({ id: type, label: TRAINING_TYPE_LABELS[type] });
    });
    return options;
  }, [specialties]);

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
        <h1 className="page-title">My library</h1>
        <p className="page-subtitle">
          {specialties.length > 0
            ? `Plans for ${specialties.map((t) => TRAINING_TYPE_LABELS[t]).join(', ')}`
            : 'Lesson plans you document and attach to the schedule'}
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
          <p style={{ color: '#94a3b8' }}>No lessons for your class types yet</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/create')}
          >
            Create a lesson
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <p className="library-empty-filter">No lessons of this type — try another filter</p>
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
                      {TRAINING_TYPE_LABELS[lesson.trainingType]}
                    </span>
                    <InstructorAvatar
                      src={instructor.avatar}
                      name={instructor.name}
                      size="sm"
                    />
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>
                      {lesson.duration} min · {lesson.level}
                    </p>
                  </div>
                </div>
                <span style={{ color: '#a78bfa' }}>→</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
