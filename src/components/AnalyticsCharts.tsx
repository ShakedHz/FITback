import { ChevronRight, Star } from 'lucide-react';
import type { WeeklyPoint } from '@/data/lessonAnalytics';
import { trainingTypeTint, type TrainingType } from '@/data/trainingTypes';
import { useI18n } from '@/i18n';
import '@/components/Analytics.css';

interface BarChartProps {
  data: WeeklyPoint[];
  variant?: 'views' | 'sales';
  title?: string;
}

export function WeeklyBarChart({ data, variant = 'views', title }: BarChartProps) {
  const { t } = useI18n();
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="analytics-chart">
      {title && <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{title}</p>}
      <div className="analytics-chart__bars">
        {data.map((point) => (
          <div key={point.day} className="analytics-chart__bar-wrap">
            <div className="analytics-chart__bar-hit">
              <div
                className={`analytics-chart__bar ${variant === 'sales' ? 'analytics-chart__bar--sales' : ''}`}
                style={{ height: `${(point.value / max) * 100}%` }}
              />
              <span className="analytics-chart__tooltip" role="tooltip">
                {point.value}
              </span>
            </div>
            <span className="analytics-chart__day">{t(`analytics.weekDay.${point.day}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  pct: number;
  count?: number;
}

export function AnalyticsProgressBar({ label, pct, count }: ProgressBarProps) {
  return (
    <div className="analytics-progress">
      <div className="analytics-progress__header">
        <span>{label}</span>
        <span style={{ color: 'var(--color-primary-bright)' }}>{count != null ? `${count} · ` : ''}{pct}%</span>
      </div>
      <div className="analytics-progress__track">
        <div className="analytics-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MiniSparkline({ data }: { data: WeeklyPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="analytics-lesson-row__spark">
      {data.map((point) => (
        <div
          key={point.day}
          className="analytics-lesson-row__spark-bar"
          style={{ height: `${Math.max(4, (point.value / max) * 28)}px` }}
        />
      ))}
    </div>
  );
}

export type LessonResponsePoint = {
  id: string;
  label: string;
  fullLabel: string;
  responded: number;
  asked: number;
};

/** Solid bar/dot tone per class type — custom types take theirs from the pastel palette. */
export function trainingTypeBarColor(type: TrainingType): string {
  return trainingTypeTint(type).hex;
}

export type LessonAveragePoint = {
  id: string;
  label: string;
  fullLabel: string;
  avg: number;
  count: number;
  trainingType?: TrainingType;
  color: string;
};

/** Ranked list of average rating (1–5) per lesson plan — scales past a few bars. */
export function LessonAverageChart({
  data,
  onSelect,
}: {
  data: LessonAveragePoint[];
  onSelect?: (id: string) => void;
}) {
  const { t } = useI18n();
  if (data.length === 0) return null;

  const ranked = [...data].sort((a, b) => b.avg - a.avg || b.count - a.count);

  return (
    <div className="lesson-avg-list">
      {ranked.map((row) => {
        const label = `${row.fullLabel} · ${t('analytics.chartAvgOutOf', { avg: row.avg })} · ${t('analytics.chartRatings', { count: row.count })}`;
        if (onSelect) {
          return (
            <button
              key={row.id}
              type="button"
              className="lesson-avg-row lesson-avg-row--link"
              onClick={() => onSelect(row.id)}
              aria-label={label}
            >
              <LessonAverageRow row={row} />
              <ChevronRight className="rtl-flip lesson-avg-row__chevron" size={18} aria-hidden />
            </button>
          );
        }
        return (
          <div key={row.id} className="lesson-avg-row" aria-label={label}>
            <LessonAverageRow row={row} />
          </div>
        );
      })}
    </div>
  );
}

function LessonAverageRow({ row }: { row: LessonAveragePoint }) {
  const { t } = useI18n();
  return (
    <>
      <span className="lesson-avg-row__text">
        <span className="lesson-avg-row__title">{row.fullLabel}</span>
        <span className="lesson-avg-row__count">{t('analytics.chartRatings', { count: row.count })}</span>
      </span>
      <span className="lesson-avg-row__score">
        <Star size={12} strokeWidth={1.6} fill="currentColor" aria-hidden />
        {row.avg}
      </span>
    </>
  );
}
