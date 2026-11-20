import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconButton } from '@/components/IconToolbar';
import { TemplatePicker } from '@/components/TemplatePicker';
import { useApp } from '@/context/AppContext';
import { LessonCover } from '@/components/LessonCover';
import { PilatesPropsGlance } from '@/components/PilatesSetup';
import { LESSON_LEVELS, type Lesson, type LessonLevel } from '@/data/mockData';
import {
  canChooseTrainingType,
  type TrainingType,
} from '@/data/trainingTypes';
import { levelLabel, trainingLabel, useI18n } from '@/i18n';
import { lessonHasMedia } from '@/utils/lessonCover';
import {
  BookOpen,
  ChevronRight,
  CopyPlus,
  LayoutTemplate,
  MoreVertical,
  PenLine,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import './Library.css';

type TypeFilter = 'all' | TrainingType;
type LevelFilter = 'all' | LessonLevel;
type FavoritesFilter = 'all' | 'favorites';
type LibraryTab = 'lessons' | 'templates';

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
    id: 'template',
    icon: LayoutTemplate,
    titleKey: 'create.templateTitle',
    descKey: 'create.templateDesc',
    path: '',
    color: '#fbbf24',
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
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    createdLessons,
    savedTemplates,
    resetLessonDraft,
    startLessonFromTemplate,
    loadTemplateDraft,
    favoriteLessonIds,
    isFavoriteLesson,
    toggleFavoriteLesson,
    instructor,
    deleteCreatedLesson,
    duplicateCreatedLesson,
    deleteSavedTemplate,
    duplicateSavedTemplate,
  } = useApp();
  const { t } = useI18n();

  const tab: LibraryTab = searchParams.get('tab') === 'templates' ? 'templates' : 'lessons';
  const setTab = (next: LibraryTab) => {
    setSearchParams(next === 'templates' ? { tab: 'templates' } : {}, { replace: true });
    setFavoritesFilter('all');
    setOpenMenuId(null);
  };

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

  const items = tab === 'templates' ? savedTemplates : createdLessons;
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
      if (tab === 'lessons' && favoritesFilter === 'favorites' && !favoriteSet.has(lesson.id)) {
        return false;
      }
      if (typeFilter !== 'all' && lesson.trainingType !== typeFilter) return false;
      if (levelFilter !== 'all' && lesson.level !== levelFilter) return false;
      if (term && !lesson.title.toLowerCase().includes(term) && !(lesson.focus ?? '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [items, tab, typeFilter, levelFilter, favoritesFilter, favoriteSet, query]);

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) =>
        tab === 'lessons' ? Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)) : 0
      ),
    [filteredItems, favoriteSet, tab]
  );

  const openTemplateAsLesson = (template: Lesson) => {
    startLessonFromTemplate(template);
    setShowTemplatePicker(false);
    setShowStartSheet(false);
    navigate(`/builder?fromTemplateId=${template.id}&from=library`);
  };

  const startBlankLesson = () => {
    resetLessonDraft();
    setShowStartSheet(false);
    navigate('/builder?blank=1&from=library');
  };

  const startNewTemplate = () => {
    resetLessonDraft();
    navigate('/builder?blank=1&kind=template&from=library');
  };

  const startLessonOption = (id: (typeof START_OPTIONS)[number]['id'], path: string, resetDraft?: boolean) => {
    if (id === 'template') {
      setShowStartSheet(false);
      if (savedTemplates.length === 0) {
        setTab('templates');
        return;
      }
      setShowTemplatePicker(true);
      return;
    }
    if (resetDraft) resetLessonDraft();
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
              onClick={() => startLessonOption(opt.id, opt.path, 'resetDraft' in opt && opt.resetDraft)}
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
    const isTemplate = tab === 'templates';
    const hasMedia = lessonHasMedia(lesson);
    const title = lesson.title.trim() || (isTemplate ? t('library.untitledTemplate') : t('library.untitled'));
    const isApparatus = lesson.trainingType === 'pilates' && lesson.equipment === 'reformer';
    const favorite = !isTemplate && isFavoriteLesson(lesson.id);
    const facts = [
      `${lesson.duration} ${t('common.min')}`,
      levelLabel(lesson.level, t),
      ...(isApparatus
        ? [t('builder.apparatus')]
        : showTypeChoice
          ? [trainingLabel(lesson.trainingType, t)]
          : []),
    ];

    const openMain = () => {
      if (isTemplate) {
        openTemplateAsLesson(lesson);
        return;
      }
      navigate(`/lesson/${lesson.id}`);
    };

    return (
      <div
        key={lesson.id}
        className={`library-recipe${hasMedia ? ' has-media' : ''}${openMenuId === lesson.id ? ' is-menu-open' : ''}`}
      >
        <button
          type="button"
          className="library-recipe__main"
          onClick={openMain}
          aria-label={isTemplate ? t('library.useTemplate') : undefined}
        >
          <span className="library-recipe__accent" aria-hidden />
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
              {isTemplate ? null : (
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
              )}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  if (isTemplate) {
                    loadTemplateDraft(lesson);
                    navigate(`/builder?templateId=${lesson.id}&kind=template&from=library`);
                    return;
                  }
                  navigate(`/builder?lessonId=${lesson.id}&from=library`);
                }}
              >
                <Pencil size={14} />
                {t('detail.edit')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isTemplate) {
                    duplicateSavedTemplate(lesson, t('detail.copyTitle', { title }));
                  } else {
                    duplicateCreatedLesson(lesson, t('detail.copyTitle', { title }));
                  }
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
                  const ok = window.confirm(
                    isTemplate
                      ? t('library.deleteTemplateConfirm', { title })
                      : t('detail.deleteConfirm', { title })
                  );
                  if (!ok) return;
                  if (isTemplate) deleteSavedTemplate(lesson.id);
                  else deleteCreatedLesson(lesson.id);
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
          {empty && (
            <p className="library-top__sub">
              {tab === 'templates' ? t('library.subtitleTemplates') : t('library.subtitle')}
            </p>
          )}
        </div>
        {!empty && (
          <IconButton
            className={showSearch || query ? 'is-on' : ''}
            aria-label={tab === 'templates' ? t('library.searchTemplate') : t('library.search')}
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

      <div className="library-tabs" role="tablist" aria-label={t('library.title')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'lessons'}
          className={tab === 'lessons' ? 'active' : undefined}
          onClick={() => setTab('lessons')}
        >
          {t('library.tabLessons')}
          <span className="library-tabs__n">{createdLessons.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'templates'}
          className={tab === 'templates' ? 'active' : undefined}
          onClick={() => setTab('templates')}
        >
          {t('library.tabTemplates')}
          <span className="library-tabs__n">{savedTemplates.length}</span>
        </button>
      </div>

      {empty ? (
        <div className="library-welcome">
          <span className="library-welcome__glow" aria-hidden />
          <span className="library-welcome__mark" aria-hidden>
            {tab === 'templates' ? <LayoutTemplate size={28} /> : <BookOpen size={28} />}
          </span>
          <h2 className="library-welcome__title">
            {tab === 'templates' ? t('library.emptyTemplatesTitle') : t('library.emptyTitle')}
          </h2>
          <p className="library-welcome__text">
            {tab === 'templates' ? t('library.emptyTemplatesDesc') : t('library.emptyDesc')}
          </p>
          {tab === 'templates' ? (
            <button
              type="button"
              className="library-welcome__primary"
              onClick={startNewTemplate}
            >
              <LayoutTemplate size={18} />
              {t('library.emptyTemplatesPrimary')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="library-welcome__primary"
                onClick={startBlankLesson}
              >
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
                      onClick={() => startLessonOption(opt.id, opt.path)}
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
            </>
          )}
        </div>
      ) : (
        <>
          {(showSearch || query) && (
            <div className="library-search">
              <Search size={16} className="library-search__icon" aria-hidden />
              <input
                className="input"
                type="search"
                placeholder={tab === 'templates' ? t('library.searchTemplate') : t('library.search')}
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}

          <div className="library-chips" role="toolbar" aria-label={t('library.filter')}>
            {tab === 'lessons' && (
              <button
                type="button"
                className={`library-chip library-chip--fav${favoritesOn ? ' is-on' : ''}`}
                aria-pressed={favoritesOn}
                onClick={() => setFavoritesFilter(favoritesOn ? 'all' : 'favorites')}
              >
                <Star size={14} fill={favoritesOn ? 'currentColor' : 'none'} />
                {t('library.favorites')}
              </button>
            )}
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
        onClick={() => {
          if (tab === 'templates') startNewTemplate();
          else setShowStartSheet(true);
        }}
        aria-label={tab === 'templates' ? t('library.createTemplate') : t('library.create')}
      >
        <Plus size={24} />
      </button>
      {startSheet}
      {filterSheet}
      {showTemplatePicker && (
        <TemplatePicker
          templates={savedTemplates}
          onSelect={openTemplateAsLesson}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}
