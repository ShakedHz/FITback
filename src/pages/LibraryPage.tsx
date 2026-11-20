import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/IconToolbar';
import { useApp } from '@/context/AppContext';
import { LessonCover } from '@/components/LessonCover';
import { PilatesPropsGlance } from '@/components/PilatesSetup';
import { LESSON_LEVELS, type Lesson, type LessonLevel } from '@/data/mockData';
import {
  TRAINING_TYPES,
  canChooseTrainingType,
  trainingTypeTint,
  type TrainingType,
} from '@/data/trainingTypes';
import { useCustomTrainingTypes } from '@/data/customTrainingTypes';
import { levelLabel, trainingLabel, useI18n } from '@/i18n';
import { lessonHasMedia } from '@/utils/lessonCover';
import {
  BookOpen,
  ChevronRight,
  CopyPlus,
  MoreVertical,
  PenLine,
  Pencil,
  Plus,
  Search,
  Share,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { shareLessonPlan, shareResultNote } from '@/utils/shareLesson';
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
    color: 'var(--color-primary)',
    resetDraft: true,
  },
  {
    id: 'ai',
    icon: Sparkles,
    titleKey: 'create.aiTitle',
    descKey: 'create.aiDesc',
    path: '/create/ai?from=library',
    color: '#34d399',
  },
] as const;

export function LibraryPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [favoritesFilter, setFavoritesFilter] = useState<FavoritesFilter>('all');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    createdLessons,
    resetLessonDraft,
    favoriteLessonIds,
    isFavoriteLesson,
    toggleFavoriteLesson,
    instructor,
    deleteCreatedLesson,
    duplicateCreatedLesson,
  } = useApp();
  const { t, locale } = useI18n();
  const customTypes = useCustomTrainingTypes();

  useEffect(() => {
    if (!shareNote) return;
    const id = window.setTimeout(() => setShareNote(null), 2800);
    return () => window.clearTimeout(id);
  }, [shareNote]);

  useEffect(() => {
    if (!openMenuId) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('.library-recipe__menu-wrap')) return;
      setOpenMenuId(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openMenuId]);

  const items = createdLessons;
  const showTypeChoice = canChooseTrainingType(instructor.specialties);
  const favoriteSet = useMemo(() => new Set(favoriteLessonIds), [favoriteLessonIds]);
  const typeOptions = useMemo(
    () =>
      [...TRAINING_TYPES, ...customTypes.map((item) => item.id)].filter(
        (type) => instructor.specialties.includes(type) || items.some((l) => l.trainingType === type)
      ),
    [instructor.specialties, items, customTypes]
  );

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

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort(
        (a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id))
      ),
    [filteredItems, favoriteSet]
  );

  const startBlankLesson = () => {
    resetLessonDraft();
    setShowStartSheet(false);
    navigate('/builder?blank=1&from=library');
  };

  const startLessonOption = (path: string, resetDraft?: boolean) => {
    if (resetDraft) resetLessonDraft();
    setShowStartSheet(false);
    navigate(path);
  };

  const facetCount = Number(levelFilter !== 'all');
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
              onClick={() => startLessonOption(opt.path, 'resetDraft' in opt && opt.resetDraft)}
            >
              <span className="library-start__icon" style={{ background: `${opt.color}22` }}>
                <Icon size={22} color={opt.color} />
              </span>
              <span className="library-start__body">
                <span className="library-start__title">{t(opt.titleKey)}</span>
                <span className="library-start__desc">{t(opt.descKey)}</span>
              </span>
              <ChevronRight className="rtl-flip" size={18} color="var(--color-primary-bright)" />
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
            <button type="button" className="library-sheet__clear" onClick={() => setLevelFilter('all')}>
              {t('library.clearFilter')}
            </button>
          )}
        </>
      )
    : null;

  const renderCard = (lesson: Lesson) => {
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

    const openMain = () => navigate(`/lesson/${lesson.id}`);

    const tint = trainingTypeTint(lesson.trainingType);

    return (
      <div
        key={lesson.id}
        className={`library-recipe${hasMedia ? ' has-media' : ''}${openMenuId === lesson.id ? ' is-menu-open' : ''}`}
        style={{ '--type-rgb': tint.rgb, '--type-color': tint.hex } as React.CSSProperties}
      >
        <button type="button" className="library-recipe__main" onClick={openMain}>
          {hasMedia ? (
            <span className="library-recipe__thumb">
              <LessonCover lesson={lesson} alt="" size="sm" />
            </span>
          ) : null}
          <span className="library-recipe__body">
            <span className="library-recipe__title-row">
              <span className="library-recipe__title">{title}</span>
              {favorite ? (
                <Star className="library-recipe__fav-mark" size={13} fill="currentColor" aria-hidden />
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
        <div className="library-recipe__menu-wrap">
          <button
            type="button"
            className="library-recipe__menu-btn"
            aria-label={t('library.itemMenu')}
            aria-expanded={openMenuId === lesson.id}
            onClick={() => setOpenMenuId((id) => (id === lesson.id ? null : lesson.id))}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === lesson.id && (
            <div className="library-recipe__menu">
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  void shareLessonPlan(lesson, t, locale).then((result) => {
                    setShareNote(shareResultNote(result, t));
                  });
                }}
              >
                <Share size={14} />
                {t('detail.share')}
              </button>
              <button
                type="button"
                className={favorite ? 'is-fav' : undefined}
                onClick={() => {
                  toggleFavoriteLesson(lesson.id);
                  setOpenMenuId(null);
                }}
              >
                <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                {favorite ? t('library.removeFavorite') : t('library.addFavorite')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  navigate(`/builder?lessonId=${lesson.id}&from=library`);
                }}
              >
                <Pencil size={14} />
                {t('detail.edit')}
              </button>
              <button
                type="button"
                onClick={() => {
                  duplicateCreatedLesson(lesson, t('detail.copyTitle', { title }));
                  setOpenMenuId(null);
                }}
              >
                <CopyPlus size={14} />
                {t('detail.duplicate')}
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  setOpenMenuId(null);
                  if (!window.confirm(t('detail.deleteConfirm', { title }))) return;
                  deleteCreatedLesson(lesson.id);
                }}
              >
                <Trash2 size={14} />
                {t('detail.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const empty = items.length === 0;
  const alts = START_OPTIONS.filter((opt) => opt.id !== 'new');

  return (
    <div className="page fade-in library-page">
      <div className="library-top">
        <div className="library-top__copy">
          <h1 className="page-title">{t('library.title')}</h1>
          {empty && <p className="library-top__sub">{t('library.subtitle')}</p>}
        </div>
        {!empty && (
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
        )}
      </div>

      {shareNote ? (
        <p className="library-share-note" role="status">
          {shareNote}
        </p>
      ) : null}

      {!empty && typeOptions.length > 0 && (
        <div className="library-chips" role="tablist" aria-label={t('library.filterType')}>
          {(['all', ...typeOptions] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={typeFilter === type}
              className={`library-chip library-chip--type${typeFilter === type ? ' is-on' : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {type !== 'all' ? (
                <i className="library-chip__dot" style={{ background: trainingTypeTint(type).hex }} />
              ) : null}
              {type === 'all' ? t('common.all') : trainingLabel(type, t)}
            </button>
          ))}
        </div>
      )}

      {empty ? (
        <div className="library-welcome">
          <span className="library-welcome__glow" aria-hidden />
          <span className="library-welcome__mark" aria-hidden>
            <BookOpen size={28} />
          </span>
          <h2 className="library-welcome__title">{t('library.emptyTitle')}</h2>
          <p className="library-welcome__text">{t('library.emptyDesc')}</p>
          <button type="button" className="library-welcome__primary" onClick={startBlankLesson}>
            <PenLine size={18} />
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
                  onClick={() => startLessonOption(opt.path)}
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
      ) : (
        <>
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

          {sortedItems.length === 0 ? (
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
              {sortedItems.map((lesson) => renderCard(lesson))}
            </div>
          )}
        </>
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
