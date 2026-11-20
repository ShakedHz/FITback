import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import './RatingsDashboard.css';

type Point = { x: number; y: number };

function smoothPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function TrendPill({
  value,
  suffix = '',
  invert = false,
}: {
  value: number | null;
  suffix?: string;
  /** For metrics where going up is bad (e.g. dropout). */
  invert?: boolean;
}) {
  if (value == null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  const good = invert ? value <= 0 : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`dash-trend ${good ? 'dash-trend--up' : 'dash-trend--down'}`}>
      <Icon size={12} strokeWidth={2.4} aria-hidden />
      {`${up ? '+' : ''}${value}${suffix}`}
    </span>
  );
}

export type LineSeries = {
  /** Values already scaled to 0..1 (null = gap, carried from the previous point). */
  values: (number | null)[];
  tone: 'a' | 'b';
};

const W = 320;
const H = 132;
const PAD_T = 14;
const PAD_B = 6;

export function SmoothLineChart({
  series,
  labels,
  highlight,
  tooltips,
  upTo,
  rtl = false,
}: {
  series: LineSeries[];
  labels: string[];
  highlight: number;
  tooltips?: { text: string; tone: 'a' | 'b' }[];
  /** Last index to draw; later slots (e.g. future days) keep their label but no line. */
  upTo?: number;
  /** Time runs right-to-left, so the first label sits on the right. */
  rtl?: boolean;
}) {
  const n = labels.length;
  const lastIdx = Math.min(upTo ?? n - 1, n - 1);
  const xAt = (i: number) => {
    const x = n <= 1 ? W / 2 : (i / (n - 1)) * W;
    return rtl ? W - x : x;
  };
  const yAt = (v: number) => PAD_T + (1 - v) * (H - PAD_T - PAD_B);

  const lines = series.map((s) => {
    let last = s.values.find((v) => v != null) ?? 0;
    const pts = s.values.slice(0, lastIdx + 1).map((v, i) => {
      if (v != null) last = v;
      return { x: xAt(i), y: yAt(last) };
    });
    const d = smoothPath(pts);
    const area =
      pts.length > 1 ? `${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z` : '';
    return { ...s, pts, d, area };
  });

  const hx = xAt(highlight);
  const leftPct = (hx / W) * 100;
  const labelCount = Math.min(n, n === 7 ? 7 : 5);
  const evenIdx =
    labelCount <= 1
      ? [0]
      : [...new Set(Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / (labelCount - 1))))];
  const labelIdx = rtl ? [...evenIdx].reverse() : evenIdx;

  return (
    <div className="dash-line" dir="ltr">
      <div className="dash-line__plot">
        <svg viewBox={`0 0 ${W} ${H}`} className="dash-line__svg" aria-hidden>
          <defs>
            <linearGradient id="dash-fill-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--dash-a)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--dash-a)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dash-fill-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--dash-b)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--dash-b)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={yAt(g)} y2={yAt(g)} className="dash-line__grid" />
          ))}
          <line x1={hx} x2={hx} y1={PAD_T - 6} y2={H} className="dash-line__cursor" />
          {lines.map((l) =>
            l.area ? <path key={`a-${l.tone}`} d={l.area} fill={`url(#dash-fill-${l.tone})`} /> : null
          )}
          {lines.map((l) => (
            <path key={`l-${l.tone}`} d={l.d} className={`dash-line__stroke dash-line__stroke--${l.tone}`} />
          ))}
          {lines.map((l) =>
            l.pts[highlight] ? (
              <circle
                key={`c-${l.tone}`}
                cx={l.pts[highlight].x}
                cy={l.pts[highlight].y}
                r="4.5"
                className={`dash-line__dot dash-line__dot--${l.tone}`}
              />
            ) : null
          )}
        </svg>
        {tooltips?.length ? (
          <div
            className={`dash-line__tips${leftPct > 60 ? ' is-end' : ''}`}
            style={{ left: `${leftPct}%` }}
          >
            {tooltips.map((tip) => (
              <span key={tip.tone} className="dash-line__tip">
                <i className={`dash-dot dash-dot--${tip.tone}`} />
                {tip.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="dash-line__labels">
        {n > 0
          ? labelIdx.map((i) => (
              <span key={i} style={{ left: `${(xAt(i) / W) * 100}%` }}>
                {labels[i]}
              </span>
            ))
          : null}
      </div>
    </div>
  );
}

export type DonutSlice = { key: string; value: number; color: string; label: string };

export function DonutChart({
  slices,
  center,
  caption,
}: {
  slices: DonutSlice[];
  center: string;
  caption: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 5 : 0;
  let offset = 0;

  return (
    <div className="dash-donut">
      <svg viewBox="0 0 110 110" className="dash-donut__svg" aria-hidden>
        <circle cx="55" cy="55" r={r} className="dash-donut__track" />
        {total > 0 &&
          slices.map((s) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * c;
            const dash = Math.max(len - gap, 0.5);
            const el = (
              <circle
                key={s.key}
                cx="55"
                cy="55"
                r={r}
                style={{ stroke: s.color }}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                className="dash-donut__seg"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="dash-donut__center">
        <strong>{center}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}

export type Bubble = { key: string; pct: number; label: string; tone: 'a' | 'b' | 'c' };

const BUBBLE_SLOTS = [
  { x: 34, y: 52 },
  { x: 76, y: 28 },
  { x: 74, y: 80 },
];

export function BubbleCluster({ bubbles }: { bubbles: Bubble[] }) {
  const ranked = [...bubbles].sort((a, b) => b.pct - a.pct);
  return (
    <div className="dash-bubbles">
      {ranked.map((b, i) => {
        const size = 56 + Math.sqrt(b.pct / 100) * 52;
        const slot = BUBBLE_SLOTS[i];
        return (
          <div
            key={b.key}
            className={`dash-bubble dash-bubble--${b.tone}`}
            style={{
              width: size,
              height: size,
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              zIndex: 3 - i,
            }}
          >
            <strong>{b.pct}%</strong>
            <span>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function axisTicks(maxValue: number) {
  const max = Math.max(maxValue, 1);
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const step = steps.find((s) => s * 4 >= max) ?? Math.ceil(max / 4);
  const top = step * 4;
  return [top, top - step, top - step * 2, top - step * 3, 0];
}

function formatTick(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function PillBars({
  data,
  highlight,
}: {
  data: { key: string; label: string; value: number }[];
  highlight: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const ticks = axisTicks(max);
  const top = ticks[0] || 1;

  return (
    <div className="dash-cols" dir="ltr">
      <div className="dash-cols__axis" aria-hidden>
        {ticks.map((tick) => (
          <span key={tick}>{formatTick(tick)}</span>
        ))}
      </div>
      <div className="dash-cols__main">
        <div className="dash-cols__plot">
          {data.map((d, i) => {
            const pct = d.value > 0 ? Math.max((d.value / top) * 100, 8) : 0;
            return (
              <div key={d.key} className="dash-cols__slot" title={`${d.label} ${d.value}`}>
                {pct > 0 ? (
                  <div
                    className={`dash-cols__bar dash-cols__bar--${i % 2 === 0 ? 'soft' : 'deep'}${
                      i === highlight ? ' is-on' : ''
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="dash-cols__days">
          {data.map((d, i) => (
            <span key={d.key} className={i === highlight && d.value > 0 ? 'is-on' : undefined}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
