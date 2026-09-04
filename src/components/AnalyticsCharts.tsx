import type { WeeklyPoint } from '@/data/lessonAnalytics';
import type { TrainingType } from '@/data/trainingTypes';
import { trainingLabel, useI18n } from '@/i18n';
import '@/components/Analytics.css';

interface BarChartProps {
  data: WeeklyPoint[];
  variant?: 'views' | 'sales';
  title?: string;
}

export function WeeklyBarChart({ data, variant = 'views', title }: BarChartProps) {
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
                {point.value} {point.value === 1 ? 'vote' : 'votes'}
              </span>
            </div>
            <span className="analytics-chart__day">{point.day}</span>
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

/** Solid bar colors per training type (for charts). */
export const TRAINING_TYPE_BAR_COLORS: Record<TrainingType, string> = {
  pilates: '#3b82f6',
  yoga: '#10b981',
};

export type LessonAveragePoint = {
  id: string;
  label: string;
  fullLabel: string;
  avg: number;
  count: number;
  trainingType?: TrainingType;
  color: string;
};

/** Vertical bar chart: average rating (0–5) per lesson, colored by training type. */
export function LessonAverageChart({ data }: { data: LessonAveragePoint[] }) {
  const { t } = useI18n();
  if (data.length === 0) return null;

  const yTicks = [5, 4, 3, 2, 1, 0];
  const typesInChart = [
    ...new Map(
      data
        .filter((d) => d.trainingType)
        .map((d) => [d.trainingType!, d.color] as const)
    ).entries(),
  ];

  return (
    <div className="lesson-avg-chart">
      <div className="lesson-avg-chart__plot">
        <div className="lesson-avg-chart__y-axis" aria-hidden>
          {yTicks.map((tick) => (
            <span key={tick} className="lesson-avg-chart__y-tick">
              {tick}
            </span>
          ))}
        </div>
        <div className="lesson-avg-chart__grid">
          {yTicks.map((tick) => (
            <div key={tick} className="lesson-avg-chart__grid-line" />
          ))}
        </div>
        <div className="lesson-avg-chart__bars">
          {data.map((row) => {
            const heightPct = (row.avg / 5) * 100;
            return (
              <div key={row.id} className="lesson-avg-chart__bar-wrap">
                <div className="lesson-avg-chart__bar-hit">
                  <div
                    className="lesson-avg-chart__bar"
                    style={{
                      height: `${Math.max(heightPct, 3)}%`,
                      background: `linear-gradient(180deg, ${row.color}ee, ${row.color})`,
                    }}
                  />
                  <span className="lesson-avg-chart__tooltip" role="tooltip">
                    {row.fullLabel}
                    <br />
                    {t('analytics.chartMeta', { avg: row.avg, count: row.count })}
                    {row.trainingType ? ` · ${trainingLabel(row.trainingType, t)}` : ''}
                  </span>
                </div>
                <span className="lesson-avg-chart__x-label" title={row.fullLabel}>
                  {row.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {typesInChart.length > 0 && (
        <div className="lesson-avg-chart__legend">
          {typesInChart.map(([type, color]) => (
            <span key={type} className="lesson-avg-chart__legend-item">
              <span className="lesson-avg-chart__legend-dot" style={{ background: color }} />
              {trainingLabel(type, t)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
