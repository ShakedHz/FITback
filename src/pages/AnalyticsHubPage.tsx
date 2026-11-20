import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ChevronRight, Smartphone, MessageSquareText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { resolveOverallAnalytics } from '@/data/lessonAnalytics';
import { trainingTypeBarColor } from '@/components/AnalyticsCharts';
import {
  BubbleCluster,
  DonutChart,
  PillBars,
  SmoothLineChart,
  TrendPill,
  type Bubble,
  type DonutSlice,
} from '@/components/RatingsDashboard';
import type { StoredFeedback as FeedbackResponse } from '@/data/feedbackStore';
import {
  TRAINING_TYPES,
  isBuiltinTrainingType,
  type TrainingType,
} from '@/data/trainingTypes';
import { FEEDBACK_INTENSITIES, type FeedbackIntensity } from '@/data/feedbackPrompts';
import { trainingLabel, useI18n } from '@/i18n';
import '@/components/Analytics.css';

type Period = '7d' | '30d' | 'all';

const DAY = 24 * 60 * 60 * 1000;
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const INTENSITY_LABELS: Record<FeedbackIntensity, string[]> = {
  tooEasy: ['קל מדי', 'Too easy'],
  justRight: ['מדויק', 'Just right'],
  tooHard: ['קשה מדי', 'Too hard'],
};

const STAR_COLORS: Record<number, string> = {
  5: 'var(--dash-a)',
  4: 'var(--dash-c)',
  3: 'var(--dash-b)',
  2: '#fb923c',
  1: 'var(--color-danger)',
};

/** Builtins keep a fixed order; the instructor's own types follow. */
function orderTypes(present: Iterable<TrainingType>): TrainingType[] {
  const seen = [...new Set(present)];
  return [
    ...TRAINING_TYPES.filter((type) => seen.includes(type)),
    ...seen.filter((type) => !isBuiltinTrainingType(type)),
  ];
}

function readIntensity(improve?: string): FeedbackIntensity | null {
  const head = improve?.split(' · ')[0]?.trim();
  if (!head) return null;
  return FEEDBACK_INTENSITIES.find((k) => INTENSITY_LABELS[k].includes(head)) ?? null;
}

function average(list: FeedbackResponse[]): number | null {
  if (list.length === 0) return null;
  return Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10;
}

function FeedbackStars({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="dash-feed__stars" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          strokeWidth={1.6}
          fill={n <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

function formatWhen(iso: string, t: (key: string, vars?: Record<string, string | number>) => string, dateLocale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / DAY);
  if (days <= 0) return t('analytics.today');
  if (days === 1) return t('analytics.yesterday');
  if (days < 7) return t('analytics.daysAgo', { count: days });
  return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
}

export function AnalyticsHubPage() {
  const navigate = useNavigate();
  const { createdLessons, instructor, feedbackResponses, scheduleEvents } = useApp();
  const { t, dateLocale, locale, dir } = useI18n();
  const [period, setPeriod] = useState<Period>('30d');
  const [typeFilter, setTypeFilter] = useState<TrainingType | 'all'>('all');
  const tagged = useMemo(() => {
    const lessonById = new Map(createdLessons.map((l) => [l.id, l]));
    const eventById = new Map(scheduleEvents.map((ev) => [ev.id, ev]));
    const lessonByTitle = new Map(createdLessons.map((l) => [l.title.trim().toLowerCase(), l]));

    const resolvePlan = (r: FeedbackResponse) => {
      if (r.lessonId) {
        const lesson = lessonById.get(r.lessonId);
        if (lesson) return lesson;
      }
      const event = eventById.get(r.sourceId);
      const planId = event?.lessonPlanId ?? event?.lessonId;
      if (planId) {
        const fromEvent = lessonById.get(planId);
        if (fromEvent) return fromEvent;
      }
      const title = r.title?.trim().toLowerCase();
      return title ? lessonByTitle.get(title) ?? null : null;
    };

    return feedbackResponses.map((r) => {
      const plan = resolvePlan(r);
      const title = plan?.title ?? r.title?.trim() ?? '';
      return {
        r,
        planId: plan?.id ?? null,
        key: plan ? plan.id : `title:${title.toLowerCase()}`,
        title,
        type: (plan?.trainingType ?? r.trainingType ?? null) as TrainingType | null,
      };
    });
  }, [feedbackResponses, createdLessons, scheduleEvents]);

  const availableTypes = useMemo(
    () => orderTypes(tagged.map((x) => x.type).filter((type): type is TrainingType => Boolean(type))),
    [tagged]
  );

  const filtered = useMemo(
    () => tagged.filter((x) => typeFilter === 'all' || x.type === typeFilter),
    [tagged, typeFilter]
  );

  const responses = useMemo(() => filtered.map((x) => x.r), [filtered]);

  const overall = useMemo(
    () =>
      resolveOverallAnalytics(
        typeFilter !== 'all' ? typeFilter : instructor.specialties[0] ?? 'pilates',
        responses,
        locale
      ),
    [typeFilter, instructor.specialties, responses, locale]
  );

  const hasResults = feedbackResponses.length > 0;

  const stats = useMemo(() => {
    const feedbackResponses = responses;
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = today.getTime() + DAY;
    const time = (r: FeedbackResponse) => new Date(r.createdAt).getTime();

    const weekStart = today.getTime() - today.getDay() * DAY;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : null;
    const rangeStart =
      period === '7d' ? weekStart : days ? now - days * DAY : -Infinity;
    const inRange = feedbackResponses.filter((r) => time(r) >= rangeStart);
    const prev = days
      ? feedbackResponses.filter(
          (r) => time(r) >= rangeStart - days * DAY && time(r) < now - days * DAY
        )
      : [];

    const avg = average(inRange);
    const prevAvg = average(prev);
    const avgDelta =
      days && avg != null && prevAvg != null ? Math.round((avg - prevAvg) * 10) / 10 : null;
    const countDelta =
      days && prev.length > 0
        ? Math.round(((inRange.length - prev.length) / prev.length) * 100)
        : null;

    let bucketCount: number;
    let start: number;
    let width: number;
    if (period === '7d') {
      bucketCount = 7;
      width = DAY;
      start = weekStart;
    } else if (period === '30d') {
      bucketCount = 10;
      width = 3 * DAY;
      start = endOfToday - 30 * DAY;
    } else {
      const earliest = feedbackResponses.reduce((m, r) => Math.min(m, time(r)), now);
      const span = Math.max(7 * DAY, endOfToday - earliest);
      bucketCount = 10;
      width = span / bucketCount;
      start = endOfToday - span;
    }

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const from = start + i * width;
      const to = from + width;
      const list = inRange.filter((r) => time(r) >= from && time(r) < to);
      const label =
        period === '7d'
          ? t(`analytics.weekDay.${WEEK_DAYS[i]}`)
          : (() => {
              const d = new Date(Math.min(to - 1, now));
              return `${d.getDate()}/${d.getMonth() + 1}`;
            })();
      return { label, count: list.length, avg: average(list) };
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 0);
    const lastIdx =
      period === '7d'
        ? buckets.reduce((m, b, i) => (b.count > 0 ? i : m), today.getDay())
        : buckets.length - 1;
    let highlight = lastIdx;
    for (let i = lastIdx; i >= 0; i--) {
      if (buckets[i].count > 0) {
        highlight = i;
        break;
      }
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    inRange.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    });
    const positive = inRange.length
      ? Math.round(((distribution[4] + distribution[5]) / inRange.length) * 100)
      : 0;

    const intensity: Record<FeedbackIntensity, number> = { tooEasy: 0, justRight: 0, tooHard: 0 };
    inRange.forEach((r) => {
      const k = readIntensity(r.improve);
      if (k) intensity[k] += 1;
    });
    const intensityTotal = intensity.tooEasy + intensity.justRight + intensity.tooHard;

    const weekday = WEEK_DAYS.map((d) => ({ key: d, label: t(`analytics.weekDay.${d}`), value: 0 }));
    inRange.forEach((r) => {
      weekday[new Date(r.createdAt).getDay()].value += 1;
    });
    const busiest = weekday.reduce(
      (best, d, i) => (d.value > weekday[best].value ? i : best),
      0
    );

    return {
      inRange,
      avg,
      avgDelta,
      countDelta,
      buckets,
      maxCount,
      highlight,
      lastIdx,
      distribution,
      positive,
      intensity,
      intensityTotal,
      weekday,
      busiest,
    };
  }, [responses, period, t]);

  const lessonRanking = useMemo(() => {
    const inRange = new Set(stats.inRange);
    const byLesson = new Map<
      string,
      { planId: string | null; title: string; type: TrainingType | null; ratings: number[] }
    >();
    filtered.forEach((x) => {
      if (!inRange.has(x.r) || !x.title) return;
      const bucket = byLesson.get(x.key) ?? {
        planId: x.planId,
        title: x.title,
        type: x.type,
        ratings: [],
      };
      bucket.ratings.push(x.r.rating);
      byLesson.set(x.key, bucket);
    });

    return [...byLesson.entries()]
      .map(([key, d]) => ({
        key,
        planId: d.planId,
        title: d.title,
        type: d.type,
        count: d.ratings.length,
        avg: Math.round((d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length) * 10) / 10,
      }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 5);
  }, [stats.inRange, filtered]);

  const typeOf = useMemo(() => new Map(tagged.map((x) => [x.r.id, x.type])), [tagged]);

  const donutSlices: DonutSlice[] = [5, 4, 3, 2, 1].map((n) => ({
    key: String(n),
    value: stats.distribution[n],
    color: STAR_COLORS[n],
    label: t('analytics.starsN', { n }),
  }));

  const bubbles: Bubble[] = [
    { key: 'justRight', tone: 'a' as const },
    { key: 'tooHard', tone: 'b' as const },
    { key: 'tooEasy', tone: 'c' as const },
  ].map(({ key, tone }) => ({
    key,
    tone,
    label: t(`feedback.intensity.${key}`),
    pct: stats.intensityTotal
      ? Math.round((stats.intensity[key as FeedbackIntensity] / stats.intensityTotal) * 100)
      : 0,
  }));

  const periods: { id: Period; label: string }[] = [
    { id: '7d', label: t('analytics.periodWeek') },
    { id: '30d', label: t('analytics.periodMonth') },
    { id: 'all', label: t('analytics.periodAll') },
  ];

  return (
    <div className="page fade-in analytics-hub">
      <div className="page-header">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="page-subtitle">{t('analytics.subtitle')}</p>
      </div>

      <div className="dash">
        {availableTypes.length > 0 ? (
          <div className="dash-filters">
            <div className="dash-chips" role="tablist" aria-label={t('analytics.filterType')}>
              {(['all', ...availableTypes] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === type}
                  className={`dash-chip${typeFilter === type ? ' is-on' : ''}`}
                  onClick={() => setTypeFilter(type)}
                >
                  {type !== 'all' ? (
                    <i
                      className="dash-chip__dot"
                      style={{ background: trainingTypeBarColor(type) }}
                    />
                  ) : null}
                  {type === 'all' ? t('analytics.filterAllTypes') : trainingLabel(type, t)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <section className="dash-tile">
          <div className="dash-tile__head">
            <h2 className="dash-tile__title">{t('analytics.overview')}</h2>
            <div className="dash-seg" role="tablist">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={period === p.id}
                  className={period === p.id ? 'is-on' : undefined}
                  onClick={() => setPeriod(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dash-kpis">
            <div>
              <div className="dash-kpi__row">
                <span className="dash-kpi__value">
                  {stats.avg ?? '—'}
                  {stats.avg != null ? <small>/5</small> : null}
                </span>
                <TrendPill value={stats.avgDelta} />
              </div>
              <p className="dash-kpi__label">{t('analytics.avgRating')}</p>
            </div>
            <div>
              <div className="dash-kpi__row">
                <span className="dash-kpi__value">{stats.inRange.length}</span>
                <TrendPill value={stats.countDelta} suffix="%" />
              </div>
              <p className="dash-kpi__label">{t('analytics.responses')}</p>
            </div>
          </div>

          <SmoothLineChart
            labels={stats.buckets.map((b) => b.label)}
            highlight={stats.highlight}
            upTo={stats.lastIdx}
            rtl={dir === 'rtl'}
            series={[
              {
                tone: 'b',
                values: stats.buckets.map((b) => (b.avg != null ? (b.avg - 1) / 4 : null)),
              },
              {
                tone: 'a',
                values: stats.buckets.map((b) => (stats.maxCount ? b.count / stats.maxCount : 0)),
              },
            ]}
          />
          <div className="dash-legend dash-legend--below">
            <span>
              <i className="dash-dot dash-dot--a" />
              {t('analytics.responses')}
            </span>
            <span>
              <i className="dash-dot dash-dot--b" />
              {t('analytics.avgRating')}
            </span>
          </div>
        </section>

        <div className="dash-row">
          <section className="dash-tile">
            <div className="dash-tile__head">
              <h2 className="dash-tile__title">{t('analytics.distribution')}</h2>
            </div>
            <DonutChart
              slices={donutSlices}
              center={stats.inRange.length ? `${stats.positive}%` : '—'}
              caption={t('analytics.highStars')}
            />
            <ul className="dash-keys">
              {donutSlices.map((s) => (
                <li key={s.key}>
                  <i className="dash-dot" style={{ background: s.color }} />
                  {s.label}
                  <b>{s.value}</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="dash-tile">
            <div className="dash-tile__head">
              <h2 className="dash-tile__title">{t('analytics.effort')}</h2>
            </div>
            {stats.intensityTotal > 0 ? (
              <BubbleCluster bubbles={bubbles} />
            ) : (
              <p className="dash-empty-note">{t('analytics.effortEmpty')}</p>
            )}
          </section>
        </div>
        <section className="dash-tile">
          <div className="dash-tile__head">
            <h2 className="dash-tile__title">{t('analytics.byWeekday')}</h2>
            <span className="dash-tile__hint">
              {t('analytics.responsesCount', { count: stats.inRange.length })}
            </span>
          </div>
          <PillBars data={stats.weekday} highlight={stats.busiest} />
        </section>

        {lessonRanking.length > 0 ? (
          <section className="dash-tile">
            <div className="dash-tile__head">
              <h2 className="dash-tile__title">{t('analytics.topLessons')}</h2>
              <span className="dash-tile__hint">{t('analytics.averageByLessonHint')}</span>
            </div>
            <div className="dash-rank">
              {lessonRanking.map((row, i) => {
                const body = (
                  <>
                    <span className="dash-rank__n">{i + 1}</span>
                    <span className="dash-rank__body">
                      <span className="dash-rank__title">{row.title}</span>
                      <span className="dash-rank__meta">
                        {row.type ? (
                          <span
                            className="dash-rank__tag"
                            style={{ background: trainingTypeBarColor(row.type) }}
                          >
                            {trainingLabel(row.type, t)}
                          </span>
                        ) : null}
                        {t('analytics.chartRatings', { count: row.count })}
                      </span>
                      <span className="dash-rank__bar">
                        <i style={{ width: `${(row.avg / 5) * 100}%` }} />
                      </span>
                    </span>
                    <span className="dash-rank__score">{row.avg}</span>
                  </>
                );
                const planId = row.planId;
                return planId ? (
                  <button
                    key={row.key}
                    type="button"
                    className="dash-rank__row"
                    onClick={() => navigate(`/analytics/${planId}`)}
                  >
                    {body}
                  </button>
                ) : (
                  <div key={row.key} className="dash-rank__row">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="dash-tile">
          <div className="dash-tile__head">
            <h2 className="dash-tile__title">{t('analytics.aiSummary')}</h2>
          </div>
          <p className="dash-summary">
            {stats.inRange.length > 0 ? overall.aiSummary : t('analytics.summaryWaiting')}
          </p>
        </section>

        <section className="dash-tile">
          <div className="dash-tile__head">
            <h2 className="dash-tile__title">
              <MessageSquareText size={15} className="dash-tile__icon" aria-hidden />
              {t('analytics.clientFeedback')}
            </h2>
            <span className="dash-tile__hint">
              {t('analytics.responsesCount', { count: stats.inRange.length })}
            </span>
          </div>
          {stats.inRange.length > 0 ? (
            <div className="dash-feed">
              {stats.inRange.map((r) => {
                const [head, ...rest] = (r.improve ?? '').split(' · ');
                const intensity = readIntensity(r.improve);
                const note = (intensity ? rest.join(' · ') : r.improve ?? '').trim();
                const type = typeOf.get(r.id);
                return (
                  <div key={r.id} className="dash-feed__item">
                    <div className="dash-feed__top">
                      <FeedbackStars rating={r.rating} label={t('feedback.stars', { n: r.rating })} />
                      <span className="dash-feed__meta">
                        {r.title || t('common.class')}
                        {type ? ` · ${trainingLabel(type, t)}` : ''} ·{' '}
                        {formatWhen(r.createdAt, t, dateLocale)}
                      </span>
                    </div>
                    {intensity || note ? (
                      <p className="dash-feed__note">
                        {intensity ? <span className="dash-feed__tag">{head.trim()}</span> : null}
                        {note}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dash-summary">{hasResults ? t('analytics.noMatches') : t('analytics.empty')}</p>
          )}
        </section>

        <button
          type="button"
          className="dash-tile dash-link"
          onClick={() => navigate('/feedback/demo?preview=1')}
        >
          <span className="dash-link__icon" aria-hidden="true">
            <Smartphone size={20} />
          </span>
          <span className="dash-link__text">
            <span className="dash-link__title">{t('analytics.formPreview')}</span>
            <span className="dash-link__hint">{t('analytics.formPreviewHint')}</span>
          </span>
          <ChevronRight className="rtl-flip dash-link__chevron" size={18} />
        </button>
      </div>
    </div>
  );
}
