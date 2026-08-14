import { useRef, useState } from 'react';
import { Play, X, Sparkles } from 'lucide-react';
import type { Exercise } from '@/data/mockData';
import { getAiAssets } from '@/data/aiExerciseVideos';
import './ExerciseVideo.css';

interface ExerciseVideoProps {
  exercise: Exercise;
  size?: 'thumb' | 'row' | 'hero';
  autoPlay?: boolean;
  showPlayButton?: boolean;
  onClick?: () => void;
}

export function ExerciseVideo({
  exercise,
  size = 'thumb',
  autoPlay = true,
  showPlayButton = true,
  onClick,
}: ExerciseVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const aiAssets = getAiAssets(exercise.id);
  const hasVideo = Boolean(exercise.videoUrl || exercise.posterUrl || aiAssets);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasVideo) return;
    if (onClick) {
      onClick();
      return;
    }
    setPlaying(true);
  };

  if (playing && hasVideo) {
    return (
      <VideoModal
        exercise={exercise}
        aiAssets={aiAssets}
        onClose={() => setPlaying(false)}
      />
    );
  }

  return (
    <div
      className={`exercise-video exercise-video--${size}${hasVideo ? '' : ' exercise-video--empty'}`}
      onClick={hasVideo ? handlePlay : undefined}
      role={hasVideo ? 'button' : undefined}
      tabIndex={hasVideo ? 0 : undefined}
      onKeyDown={
        hasVideo
          ? (e) => e.key === 'Enter' && handlePlay(e as unknown as React.MouseEvent)
          : undefined
      }
    >
      {aiAssets ? (
        <AiVideoLoop poster={aiAssets.poster} frame2={aiAssets.frame2} active={autoPlay} />
      ) : exercise.videoUrl ? (
        <video
          ref={videoRef}
          src={exercise.videoUrl}
          poster={exercise.posterUrl}
          muted
          loop
          playsInline
          autoPlay={autoPlay}
          preload="metadata"
        />
      ) : exercise.posterUrl ? (
        <img src={exercise.posterUrl} alt="" className="exercise-video__poster" />
      ) : (
        <div className="exercise-video__placeholder" aria-hidden>
          {exercise.nameHe.slice(0, 1).toUpperCase()}
        </div>
      )}
      {hasVideo && <div className="exercise-video__overlay" />}
      {hasVideo && showPlayButton && (
        <div className="exercise-video__play">
          <Play size={size === 'hero' ? 28 : size === 'row' ? 14 : 18} fill="white" color="white" />
        </div>
      )}
      {aiAssets && (
        <span className="exercise-video__badge exercise-video__badge--ai">
          <Sparkles size={10} /> AI
        </span>
      )}
      {exercise.isCustom && !aiAssets && (
        <span className="exercise-video__badge">Mine</span>
      )}
    </div>
  );
}

function AiVideoLoop({
  poster,
  frame2,
  active,
  large,
}: {
  poster: string;
  frame2: string;
  active: boolean;
  large?: boolean;
}) {
  return (
    <div className={`ai-video-loop ${active ? 'ai-video-loop--playing' : ''} ${large ? 'ai-video-loop--large' : ''}`}>
      <img src={poster} alt="" className="ai-video-loop__frame ai-video-loop__frame--a" />
      <img src={frame2} alt="" className="ai-video-loop__frame ai-video-loop__frame--b" />
    </div>
  );
}

function VideoModal({
  exercise,
  aiAssets,
  onClose,
}: {
  exercise: Exercise;
  aiAssets: ReturnType<typeof getAiAssets>;
  isUploadedVideo?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="video-modal" onClick={onClose}>
      <div className="video-modal__content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="video-modal__close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
        {aiAssets ? (
          <div className="video-modal__ai-wrap">
            <AiVideoLoop poster={aiAssets.poster} frame2={aiAssets.frame2} active large />
            <span className="video-modal__ai-label">
              <Sparkles size={14} /> AI exercise video
            </span>
          </div>
        ) : (
          <video
            src={exercise.videoUrl}
            poster={exercise.posterUrl}
            controls
            autoPlay
            playsInline
            className="video-modal__player"
          />
        )}
        <div className="video-modal__info">
          <p className="video-modal__title">{exercise.nameHe}</p>
          <p className="video-modal__meta">
            {exercise.name} · {exercise.duration} min · {exercise.category}
          </p>
        </div>
      </div>
    </div>
  );
}
