import { useRef } from 'react';
import { Upload, X, Film } from 'lucide-react';
import { LessonCover } from '@/components/LessonCover';
import type { Lesson } from '@/data/mockData';
import type { TrainingType } from '@/data/trainingTypes';

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
      <p className="section-title">Lesson preview video</p>
      {coverVideo ? (
        <div className="lesson-cover-upload__preview">
          <LessonCover lesson={previewLesson} alt={alt} size="md" />
        </div>
      ) : (
        <div className="lesson-cover-upload__empty">
          <Film size={28} color="#64748b" />
          <p>No video yet</p>
        </div>
      )}
      <p className="lesson-cover-upload__hint">
        Optional — plays as a preview when you browse My library
      </p>
      <div className="lesson-cover-upload__actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> {coverVideo ? 'Change video' : 'Add video'}
        </button>
        {coverVideo && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
            <X size={16} /> Remove
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={handleFile} />
    </div>
  );
}
