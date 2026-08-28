import { useRef } from 'react';
import { Upload, X, Film } from 'lucide-react';
import { LessonCover } from '@/components/LessonCover';
import type { Lesson } from '@/data/mockData';
import type { TrainingType } from '@/data/trainingTypes';
import { useI18n } from '@/i18n';

interface LessonVideoUploadProps {
  lesson: Pick<Lesson, 'coverVideo' | 'coverImage'> & {
    trainingType?: TrainingType;
  };
  coverVideo: string | null;
  onVideoChange: (url: string | null) => void;
  alt: string;
}

export function LessonVideoUpload({
  lesson,
  coverVideo,
  onVideoChange,
  alt,
}: LessonVideoUploadProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const previewLesson = {
    ...lesson,
    coverVideo: coverVideo ?? undefined,
    coverImage: undefined,
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('video/')) return;
    onVideoChange(URL.createObjectURL(file));
    e.target.value = '';
  };

  const remove = () => {
    if (coverVideo?.startsWith('blob:')) URL.revokeObjectURL(coverVideo);
    onVideoChange(null);
  };

  return (
    <div className="lesson-cover-upload card">
      <p className="section-title">{t('cover.title')}</p>
      {coverVideo ? (
        <div className="lesson-cover-upload__preview">
          <LessonCover lesson={previewLesson} alt={alt} size="md" />
        </div>
      ) : (
        <div className="lesson-cover-upload__empty">
          <Film size={28} color="var(--color-text-subtle)" />
          <p>{t('cover.none')}</p>
        </div>
      )}
      <p className="lesson-cover-upload__hint">
        {t('cover.hint')}
      </p>
      <div className="lesson-cover-upload__actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> {coverVideo ? t('cover.change') : t('cover.add')}
        </button>
        {coverVideo && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
            <X size={16} /> {t('cover.remove')}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={handleFile} />
    </div>
  );
}
