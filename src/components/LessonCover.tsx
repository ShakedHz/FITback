import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';
import { getLessonMediaData, lessonHasMedia } from '@/utils/lessonCover';
import type { Lesson } from '@/data/mockData';
import type { TrainingType } from '@/data/trainingTypes';
import { useI18n } from '@/i18n';
import './LessonCover.css';

interface LessonCoverProps {
  lesson: Pick<Lesson, 'coverVideo' | 'coverImage'> & {
    albumImages?: string[];
    sections?: Lesson['sections'];
    trainingType?: TrainingType;
  };
  alt: string;
  size?: 'sm' | 'md' | 'hero';
  locked?: boolean;
  lockOverlay?: ReactNode;
  showFullscreenButton?: boolean;
}

export function LessonCover({
  lesson,
  alt,
  size = 'hero',
  locked,
  lockOverlay,
  showFullscreenButton = false,
}: LessonCoverProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { coverVideo, coverImage } = getLessonMediaData(lesson);
  const hasMedia = lessonHasMedia(lesson);
  const isThumb = size === 'sm';
  const autoPlayVideo = Boolean(coverVideo) && (isThumb || size === 'md');

  useEffect(() => {
    if (!autoPlayVideo) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {});
  }, [autoPlayVideo, coverVideo]);

  const enterFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const webkitVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitSetPresentationMode?: (mode: string) => void;
    };

    if (typeof webkitVideo.webkitEnterFullscreen === 'function') {
      webkitVideo.webkitEnterFullscreen();
      return;
    }

    if (typeof webkitVideo.webkitSetPresentationMode === 'function') {
      webkitVideo.webkitSetPresentationMode('fullscreen');
      return;
    }

    const container = video.parentElement;
    const target = container?.requestFullscreen ? container : video;
    void target.requestFullscreen?.().catch(() => {});
  }, []);

  if (!hasMedia) return null;

  return (
    <div className={`lesson-cover lesson-cover--${size}`}>
      {coverVideo ? (
        <>
          <video
            ref={videoRef}
            src={coverVideo}
            className="lesson-cover__video"
            muted
            loop
            playsInline
            autoPlay={autoPlayVideo}
            controls={size === 'hero'}
            preload="metadata"
            aria-label={alt}
          />
          {showFullscreenButton && (
            <button
              type="button"
              className="lesson-cover__fullscreen"
              onClick={enterFullscreen}
              aria-label={t('cover.fullscreen')}
            >
              <Maximize2 size={18} />
            </button>
          )}
        </>
      ) : coverImage ? (
        <img src={coverImage} alt={alt} className="lesson-cover__single" loading="lazy" />
      ) : null}
      <div className="lesson-cover__overlay" />
      {locked && lockOverlay && (
        <div className="lesson-cover__lock">{lockOverlay}</div>
      )}
    </div>
  );
}
