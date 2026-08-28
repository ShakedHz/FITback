import { createPortal } from 'react-dom';
import { X, Clock, BarChart3, Star, Lock } from 'lucide-react';
import type { Lesson } from '@/data/mockData';
import { getLessonPreview } from '@/utils/lessonPreview';
import { CoinBadge } from '@/components/ui';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import './LessonPreviewSheet.css';

interface LessonPreviewSheetProps {
  lesson: Lesson;
  instructorAvatar: string;
  coins: number;
  onClose: () => void;
  onPurchase: () => void;
}

function SheetOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const shell = document.getElementById('app-shell');
  if (!shell) return null;
  return createPortal(
    <div className="preview-overlay" onClick={onClose} role="presentation">
      {children}
    </div>,
    shell
  );
}

export function LessonPreviewSheet({
  lesson,
  instructorAvatar,
  coins,
  onClose,
  onPurchase,
}: LessonPreviewSheetProps) {
  const { preview, locked, total, sectionCount } = getLessonPreview(lesson);
  const canAfford = coins >= lesson.price;

  return (
    <SheetOverlay onClose={onClose}>
      <div className="preview-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sheet__handle" aria-hidden="true" />
        <div className="preview-sheet__head">
          <h2>Preview</h2>
          <button type="button" className="preview-sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="preview-sheet__body">
          <h3 className="preview-sheet__title">{lesson.title}</h3>
          <div className="preview-sheet__instructor">
            <InstructorAvatar src={instructorAvatar} name={lesson.instructorName} size="sm" />
            <span>{lesson.instructorName}</span>
            <span className="preview-sheet__rating">
              <Star size={12} fill="var(--color-accent)" color="var(--color-accent)" />
              {lesson.rating}
            </span>
          </div>

          <div className="preview-sheet__meta">
            <span><Clock size={14} /> {lesson.duration} min</span>
            <span><BarChart3 size={14} /> {lesson.level}</span>
            <span>{sectionCount} sections · {total} exercises</span>
          </div>

          <p className="preview-sheet__desc">{lesson.description}</p>

          <p className="preview-sheet__label">Lesson plan sample</p>
          <div className="preview-sheet__exercises">
            {preview.map(({ exercise, sectionTitle }) => (
              <div key={exercise.id} className="preview-exercise">
                <ExerciseVideo exercise={exercise} size="row" />
                <div className="preview-exercise__info">
                  <span className="preview-exercise__name">{exercise.nameHe}</span>
                  <span className="preview-exercise__section">{sectionTitle} · {exercise.duration} min</span>
                </div>
              </div>
            ))}
          </div>

          {locked > 0 && (
            <div className="preview-locked">
              <Lock size={20} />
              <p>
                +<strong>{locked} more exercises</strong> across {sectionCount} plan sections
              </p>
              <span>Available after purchase</span>
            </div>
          )}
        </div>

        <div className="preview-sheet__footer">
          <div className="preview-sheet__price-row">
            <div>
              <p className="preview-sheet__price-label">Lesson plan price</p>
              <CoinBadge amount={lesson.price} prominent />
            </div>
            <p className={`preview-sheet__balance ${canAfford ? '' : 'preview-sheet__balance--low'}`}>
              Balance: {coins.toLocaleString('en-US')} coins
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onPurchase}>
            Buy lesson plan
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
