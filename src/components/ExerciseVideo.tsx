import { useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import type { Exercise } from '@/data/mockData';
import './ExerciseVideo.css';

interface ExerciseVideoProps {
  exercise: Exercise;
  size?: 'thumb' | 'row' | 'hero';
  autoPlay?: boolean;
  showPlayButton?: boolean;
}

export function ExerciseVideo({
  exercise,
  size = 'thumb',
  autoPlay = true,
  showPlayButton = true,
}: ExerciseVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(exercise.videoUrl);

  if (!hasVideo) return null;

  if (playing) {
    return (
      <div className="video-modal" onClick={() => setPlaying(false)}>
        <div className="video-modal__content" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="video-modal__close" onClick={() => setPlaying(false)} aria-label="Close">
            <X size={22} />
          </button>
          <video
            src={exercise.videoUrl}
            controls
            autoPlay
            playsInline
            className="video-modal__player"
          />
          <div className="video-modal__info">
            <p className="video-modal__title">{exercise.nameHe}</p>
            <p className="video-modal__meta">
              {exercise.name} · {exercise.category}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`exercise-video exercise-video--${size}`}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setPlaying(true);
      }}
    >
      <video
        ref={videoRef}
        src={exercise.videoUrl}
        muted
        loop
        playsInline
        autoPlay={autoPlay}
        preload="metadata"
      />
      <div className="exercise-video__overlay" />
      {showPlayButton && (
        <div className="exercise-video__play">
          <Play size={size === 'hero' ? 28 : size === 'row' ? 14 : 18} fill="white" color="white" />
        </div>
      )}
    </div>
  );
}
