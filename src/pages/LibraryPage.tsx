import { useState, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/IconToolbar';
import { useApp } from '@/context/AppContext';
import { LessonCover } from '@/components/LessonCover';
import { PilatesPropsGlance } from '@/components/PilatesSetup';
import { LESSON_LEVELS, type Lesson, type LessonLevel } from '@/data/mockData';
import {
  TRAINING_TYPE_COLORS,
  canChooseTrainingType,
  type TrainingType,
} from '@/data/trainingTypes';
import { levelLabel, trainingLabel, useI18n } from '@/i18n';
import { lessonHasMedia } from '@/utils/lessonCover';
import {
  BookOpen,
  ChevronRight,
  LayoutTemplate,
  PenLine,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import './Library.css';

type TypeFilter = 'all' | TrainingType;
type LevelFilter = 'all' | LessonLevel;
type FavoritesFilter = 'all' | 'favorites';

const START_OPTIONS = [
  {
    id: 'new',
    icon: PenLine,
    titleKey: 'create.buildTitle',
    descKey: 'create.buildDesc',
    path: '/builder?blank=1&from=library',
    color: '#8b5cf6',
    draftMode: 'blank' as const,
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    titleKey: 'create.templateTitle',
    descKey: 'create.templateDesc',
    path: '/builder?template=1&from=library',
    color: '#fbbf24',
    draftMode: 'template' as const,
  },
  {
    id: 'ai',
    icon: Sparkles,
    titleKey: 'create.aiTitle',
    descKey: 'create.aiDesc',
    path: '/create/ai?from=library',
    color: '#34d399',
  },
];

export function LibraryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [favoritesFilter, setFavoritesFilter] = useState<FavoritesFilter>('all');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const navigate = useNavigate();
  const { createdLessons, resetLessonDraft, favoriteLessonIds, isFavoriteLesson, toggleFavoriteLesson, instructor } = useApp();
  const { t } = useI18n();

  const items = createdLessons;
  const showTypeChoice = canChooseTrainingType(instructor.specialties);
  const favoriteSet = useMemo(() => new Set(favoriteLessonIds), [favoriteLessonIds]);

  const clearFilters = () => {
    setQuery('');
    setTypeFilter('all');
    setLevelFilter('all');
    setFavoritesFilter('all');
  };

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((lesson) => {
      if (favoritesFilter === 'favorites' && !favoriteSet.has(lesson.id)) return false;
      if (typeFilter !== 'all' && lesson.trainingType !== typeFilter) return false;
      if (levelFilter !== 'all' && lesson.level !== levelFilter) return false;
      if (term && !lesson.title.toLowerCase().includes(term) && !(lesson.focus ?? '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [items, typeFilter, levelFilter, favoritesFilter, favoriteSet, query]);

  const ownPlans = useMemo(
    () =>
      filteredItems
        .filter((l) => !l.isStarter)
        .sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id))),
    [filteredItems, favoriteSet]
  );
  const starterPlans = useMemo(
    () =>
      filteredItems
        .filter((l) => l.isStarter)
        .sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id))),
    [filteredItems, favoriteSet]
  );

  const startLesson = (path: string, draftMode?: 'blank' | 'template') => {
    if (draftMode) resetLessonDraft(draftMode);
    setShowStartSheet(false);
    navigate(path);
  };

  const facetCount =
    Number(showTypeChoice && typeFilter !== 'all') +
    Number(levelFilter !== 'all');
  const favoritesOn = favoritesFilter === 'favorites';

  const overlaySheet = (
    title: string,
    onClose: () => void,
    body: ReactNode
  ) => {
    const shell = document.getElementById('app-shell');
    if (!shell) return null;
    return createPortal(
      <div className="library-overlay" onClick={onClose} role="presentation">
        <div className="library-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="library-sheet__handle" />
          <div className="library-sheet__top">
            <h2 className="library-sheet__title">{title}</h2>
            <IconButton onClick={onClose} aria-label={t('common.close')}>
              <X size={18} />
            </IconButton>
          </div>
          {body}
        </div>
      </div>,
      shell
    );
  };

  const startSheet = showStartSheet
    ? overlaySheet(
        t('library.startTitle'),
        () => setShowStartSheet(false),
        START_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              className="library-start library-start--sheet"
              onClick={() => startLesson(opt.path, opt.draftMode)}
            >
              <span className="library-start__icon" style={{ background: `${opt.color}22` }}>
                <Icon size={22} color={opt.color} />
              </span>
              <span className="library-start__body">
                <span className="library-start__title">{t(opt.titleKey)}</span>
                <span className="library-start__desc">{t(opt.descKey)}</span>
              </span>
              <ChevronRight className="rtl-flip" size={18} color="#a78bfa" />
            </button>
          );
        })
      )
    : null;

  const filterSheet = showFilters
    ? overlaySheet(
        t('library.filter'),
        () => setShowFilters(false),
        <>
          {showTypeChoice && (
            <div className="library-sheet__group">
              <p className="library-sheet__label">{t('library.filterType')}</p>
              <div className="library-chips library-chips--wrap">
                <button
                  type="button"
                  className={`library-chip${typeFilter === 'all' ? ' is-on' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  {t('common.all')}
                </button>
                {instructor.specialties.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`library-chip${typeFilter === type ? ' is-on' : ''}`}
                    onClick={() => setTypeFilter(type)}
                  >
                    {trainingLabel(type, t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="library-sheet__group">
            <p className="library-sheet__label">{t('library.filterLevel')}</p>
            <div className="library-chips library-chips--wrap">
              <button
                type="button"
                className={`library-chip${levelFilter === 'all' ? ' is-on' : ''}`}
                onClick={() => setLevelFilter('all')}
              >
                {t('common.all')}
              </button>
              {LESSON_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`library-chip${levelFilter === level ? ' is-on' : ''}`}
                  onClick={() => setLevelFilter(level)}
                >
                  {levelLabel(level, t)}
                </button>
              ))}
            </div>
          </div>
          {facetCount > 0 && (
            <button type="button" className="library-sheet__clear" onClick={() => {
              setTypeFilter('all');
              setLevelFilter('all');
            }}>
              {t('library.clearFilter')}
            </button>
          )}
        </>
      )
    : null;

  const renderCard = (lesson: Lesson) => {
    const typeStyle = TRAINING_TYPE_COLORS[lesson.trainingType];
    const hasMedia = lessonHasMedia(lesson);
    const title = lesson.title.trim() || t('library.untitled');
    const isApparatus = lesson.trainingType === 'pilates' && lesson.equipment === 'reformer';
    const favorite = isFavoriteLesson(lesson.id);
    const facts = [
      `${lesson.duration} ${t('common.min')}`,
      levelLabel(lesson.level, t),
      ...(isApparatus
        ? [t('builder.apparatus')]
        : showTypeChoice
          ? [trainingLabel(lesson.trainingType, t)]
          : []),
    ];

    return (
      <div
        key={lesson.id}
        className={`library-recipe${hasMedia ? ' has-media' : ''}${lesson.isStarter ? ' is-starter' : ''}`}
      >
        <button
          type="button"
          className="library-recipe__main"
          onClick={() => navigate(`/lesson/${lesson.id}`)}
        >
          <span
            className="library-recipe__accent"
            style={{ background: typeStyle.text }}
            aria-hidden
          />
          {hasMedia ? (
            <span className="library-recipe__thumb">
              <LessonCover lesson={lesson} alt="" size="sm" />
            </span>
          ) : null}
          <span className="library-recipe__body">
            <span className="library-recipe__title-row">
              <span className="library-recipe__title">{title}</span>
              {lesson.isStarter ? (
                <span className="library-recipe__starter">{t('library.starter')}</span>
              ) : null}
            </span>
            <span className="library-recipe__facts">
              {facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
            </span>
            {isApparatus ? (
              <PilatesPropsGlance selected={lesson.props} className="library-recipe__props" />
            ) : null}
          </span>
        </button>
        <IconButton
          className={`library-recipe__fav${favorite ? ' is-fav' : ''}`}
          aria-label={favorite ? t('library.removeFavorite') : t('library.addFavorite')}
          aria-pressed={favorite}
          onClick={() => toggleFavoriteLesson(lesson.id)}
        >
          <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
        </IconButton>
      </div>
    );
  };

  if (items.length === 0) {
    const [blank, ...alts] = START_OPTIONS;
    const BlankIcon = blank.icon;
    return (
      <div className="page fade-in">
        <div className="library-top">
          <div className="library-top__copy">
            <h1 className="page-title">{t('library.title')}</h1>
          </div>
        </div>
        <div className="library-welcome">
          <span className="library-welcome__glow" aria-hidden />
          <span className="library-welcome__mark" aria-hidden>
            <BookOpen size={28} />
          </span>
          <h2 className="library-welcome__title">{t('library.emptyTitle')}</h2>
          <p className="library-welcome__text">{t('library.emptyDesc')}</p>
          <button
            type="button"
            className="library-welcome__primary"
            onClick={() => startLesson(blank.path, blank.draftMode)}
          >
            <BlankIcon size={18} />
            {t('library.emptyPrimary')}
          </button>
          <p className="library-welcome__alts-label">{t('library.emptyAlts')}</p>
          <div className="library-welcome__alts">
            {alts.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className="library-welcome__alt"
                  onClick={() => startLesson(opt.path, opt.draftMode)}
                >
                  <span className="library-welcome__alt-icon" style={{ background: `${opt.color}22` }}>
                    <Icon size={18} color={opt.color} />
                  </span>
                  <span className="library-welcome__alt-title">{t(opt.titleKey)}</span>
                  <span className="library-welcome__alt-desc">{t(opt.descKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="library-top">
        <div className="library-top__copy">
          <h1 className="page-title">
            {t('library.title')}
            <span className="library-top__pill">{items.length}</span>
          </h1>
          <p className="library-top__sub">{t('library.subtitle')}</p>
        </div>
        <IconButton
          className={showSearch || query ? 'is-on' : ''}
          aria-label={t('library.search')}
          aria-expanded={showSearch || Boolean(query)}
          onClick={() => {
            setShowSearch((open) => {
              if (open) setQuery('');
              return !open;
            });
          }}
        >
          <Search size={18} />
        </IconButton>
      </div>

      {(showSearch || query) && (
        <div className="library-search">
          <Search size={16} className="library-search__icon" aria-hidden />
          <input
            className="input"
            type="search"
            placeholder={t('library.search')}
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <div className="library-chips" role="toolbar" aria-label={t('library.filter')}>
        <button
          type="button"
          className={`library-chip library-chip--fav${favoritesOn ? ' is-on' : ''}`}
          aria-pressed={favoritesOn}
          onClick={() => setFavoritesFilter(favoritesOn ? 'all' : 'favorites')}
        >
          <Star size={14} fill={favoritesOn ? 'currentColor' : 'none'} />
          {t('library.favorites')}
        </button>
        <button
          type="button"
          className={`library-chip library-chip--more${facetCount > 0 || showFilters ? ' is-on' : ''}`}
          aria-label={t('library.moreFilters')}
          aria-expanded={showFilters}
          onClick={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={14} />
          {t('library.filter')}
          {facetCount > 0 ? <span className="library-chip__n">{facetCount}</span> : null}
        </button>
      </div>

      {facetCount > 0 && (
        <div className="library-applied">
          {showTypeChoice && typeFilter !== 'all' && (
            <button
              type="button"
              className="library-applied__chip"
              aria-label={t('library.removeFilter', { name: trainingLabel(typeFilter, t) })}
              onClick={() => setTypeFilter('all')}
            >
              {trainingLabel(typeFilter, t)}
              <X size={12} />
            </button>
          )}
          {levelFilter !== 'all' && (
            <button
              type="button"
              className="library-applied__chip"
              aria-label={t('library.removeFilter', { name: levelLabel(levelFilter, t) })}
              onClick={() => setLevelFilter('all')}
            >
              {levelLabel(levelFilter, t)}
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="library-no-match">
          <p>
            {query.trim()
              ? t('library.noMatch')
              : favoritesFilter === 'favorites' &&
                  typeFilter === 'all' &&
                  levelFilter === 'all'
                ? t('library.emptyFavorites')
                : t('library.emptyFilter')}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={clearFilters}
          >
            {t('library.clearFilter')}
          </button>
        </div>
      ) : (
        <div className="library-list">
          {ownPlans.length > 0 && starterPlans.length > 0 && (
            <p className="library-group">
              {t('library.yoursSection')}
              <span className="library-group__n">{ownPlans.length}</span>
            </p>
          )}
          {ownPlans.map((lesson) => renderCard(lesson))}
          {starterPlans.length > 0 && (
            <>
              <p className="library-group library-group--starters">
                {t('library.startersSection')}
                <span className="library-group__n">{starterPlans.length}</span>
              </p>
              {starterPlans.map((lesson) => renderCard(lesson))}
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="library-fab"
        onClick={() => setShowStartSheet(true)}
        aria-label={t('library.create')}
      >
        <Plus size={24} />
      </button>
      {startSheet}
      {filterSheet}
    </div>
  );
}
