import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Star, TrendingUp, Check, Clock, Eye } from 'lucide-react';
import { feedPosts } from '@/data/mockData';
import {
  TRAINING_TYPES,
  TRAINING_TYPE_LABELS,
  TRAINING_TYPE_COLORS,
  type TrainingType,
} from '@/data/trainingTypes';
import { EQUIPMENT_LABELS } from '@/data/equipmentTypes';
import { CoinBadge } from '@/components/ui';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { LessonCover } from '@/components/LessonCover';
import { LessonPreviewSheet } from '@/components/LessonPreviewSheet';
import { useApp } from '@/context/AppContext';
import './Feed.css';

type FeedFilter = 'all' | 'trending' | TrainingType;

const FILTER_OPTIONS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  ...TRAINING_TYPES.map((type) => ({
    id: type as FeedFilter,
    label: TRAINING_TYPE_LABELS[type],
  })),
];

export function FeedPage() {
  const navigate = useNavigate();
  const { ownedLessonIds, getLessonById, purchaseLesson, coins } = useApp();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const previewLesson = previewLessonId ? getLessonById(previewLessonId) : undefined;
  const previewPost = previewLessonId
    ? feedPosts.find((p) => p.lessonId === previewLessonId)
    : undefined;

  const handlePurchase = (lessonId: string, price: number) => {
    if (coins < price) {
      navigate('/shop');
      return;
    }
    const success = purchaseLesson(lessonId, price);
    if (success) {
      setPreviewLessonId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'trending') return feedPosts.filter((p) => p.trending);
    if (filter !== 'all') return feedPosts.filter((p) => p.trainingType === filter);
    return feedPosts;
  }, [filter]);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Inspiration feed</h1>
        <p className="page-subtitle">Lesson plans from every fitness discipline — browse, learn, and grow</p>
      </div>

      <div className="feed-hero">
        <p className="feed-hero__title">Discover new lesson plans every day</p>
        <p className="feed-hero__sub">
          Instructors and trainers from the community share lesson plans, exercises, and ideas — open a plan and get inspired for your next class
        </p>
        <div className="feed-hero__stats">
          <div className="feed-hero__stat">
            <strong>{feedPosts.length}</strong>
            Lesson plans
          </div>
          <div className="feed-hero__stat">
            <strong>6</strong>
            Training types
          </div>
          <div className="feed-hero__stat">
            <strong>2.4k</strong>
            Likes
          </div>
        </div>
      </div>

      <div className="feed-filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`feed-filter ${filter === opt.id ? 'feed-filter--active' : ''}`}
            onClick={() => setFilter(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="feed-empty">No lesson plans for this training type — try another filter</p>
      )}

      {filtered.map((post) => {
        const owned = ownedLessonIds.includes(post.lessonId);
        const typeStyle = TRAINING_TYPE_COLORS[post.trainingType];

        return (
          <article key={post.id} className="card card-glow feed-card">
            <LessonCover
              lesson={post}
              alt={`${post.instructorName} — ${post.lessonTitle}`}
              locked={!owned}
            />
            <div className="feed-card__body">
              <div className="feed-card__top">
                <div className="feed-card__instructor">
                  <InstructorAvatar src={post.instructorAvatar} name={post.instructorName} size="md" />
                  <div>
                    <p className="feed-card__instructor-name">{post.instructorName}</p>
                    <p className="feed-card__instructor-meta">
                      <Star size={12} fill="#fbbf24" color="#fbbf24" />
                      {post.rating}
                    </p>
                  </div>
                </div>
                <div className="feed-card__badges">
                  <span
                    className="feed-type-badge"
                    style={{
                      background: typeStyle.bg,
                      borderColor: typeStyle.border,
                      color: typeStyle.text,
                    }}
                  >
                    {TRAINING_TYPE_LABELS[post.trainingType]}
                  </span>
                  {post.trending && (
                    <span className="feed-trending">
                      <TrendingUp size={12} />
                      Trending
                    </span>
                  )}
                </div>
              </div>

              <h2 className="feed-card__title">{post.lessonTitle}</h2>

              <div className="feed-card__tags">
                <span className="feed-tag">{post.level}</span>
                <span className="feed-tag">
                  <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                  {post.duration} min
                </span>
                <span className="feed-tag feed-tag--equipment">{EQUIPMENT_LABELS[post.equipment]}</span>
                {post.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="feed-tag">{tag}</span>
                ))}
              </div>

              <div className="feed-card__engagement">
                <span><Heart size={14} /> {post.likes}</span>
                <span><MessageCircle size={14} /> {post.comments}</span>
              </div>

              {owned ? (
                <button
                  type="button"
                  className="feed-owned"
                  onClick={() => navigate(`/lesson/${post.lessonId}`)}
                >
                  <Check size={18} />
                  Your lesson plan — View
                </button>
              ) : (
                <div className="feed-purchase">
                  <p className="feed-purchase__label">Lesson plan price</p>
                  <CoinBadge amount={post.price} prominent />
                  <div className="feed-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPreviewLessonId(post.lessonId)}
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(`/lesson/${post.lessonId}`)}
                    >
                      Buy lesson plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}

      {previewLesson && previewPost && (
        <LessonPreviewSheet
          lesson={previewLesson}
          instructorAvatar={previewPost.instructorAvatar}
          coins={coins}
          onClose={() => setPreviewLessonId(null)}
          onPurchase={() => handlePurchase(previewLesson.id, previewLesson.price)}
        />
      )}
    </div>
  );
}
