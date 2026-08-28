import { useMemo, useRef, useState } from 'react';
import './Analytics.css';

export type LineChartPoint = {
  /** Category key (lesson id, date, etc.) */
  key: string;
  value: number;
  /** Label shown on X-axis / tooltip for this point */
  pointLabel?: string;
};

export type LineChartSeries = {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: LineChartPoint[];
};

type Props = {
  series: LineChartSeries[];
  yMax?: number;
  yMin?: number;
  /** Preserve a fixed order of category keys on the X-axis */
  categoryOrder?: string[];
};

/** @deprecated use `key` — kept for older call sites */
export type LegacyLineChartPoint = { dateKey: string; value: number };

export function MultiLineChart({ series, yMax = 5, yMin = 0, categoryOrder }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const categories = useMemo(() => {
    if (categoryOrder && categoryOrder.length > 0) return categoryOrder;
    const set = new Set<string>();
    series.forEach((s) => s.points.forEach((p) => set.add(p.key)));
    return [...set];
  }, [series, categoryOrder]);

  const labelByKey = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach((s) => {
      s.points.forEach((p) => {
        if (p.pointLabel) map.set(p.key, p.pointLabel);
      });
    });
    return map;
  }, [series]);

  const chart = useMemo(() => {
    const W = 320;
    const H = 168;
    const padL = 28;
    const padR = 10;
    const padT = 14;
    const padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const range = Math.max(yMax - yMin, 0.1);

    const xAt = (i: number) => {
      if (categories.length <= 1) return padL + innerW / 2;
      return padL + (i / (categories.length - 1)) * innerW;
    };
    const yAt = (v: number) => padT + ((yMax - v) / range) * innerH;

    const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (range * i) / 4).reverse();

    const seriesPaths = series.map((s) => {
      const byKey = new Map(s.points.map((p) => [p.key, p]));
      const coords = categories
        .map((key, i) => {
          const p = byKey.get(key);
          if (!p) return null;
          return {
            i,
            key,
            v: p.value,
            pointLabel: p.pointLabel ?? labelByKey.get(key) ?? key,
            x: xAt(i),
            y: yAt(p.value),
          };
        })
        .filter(
          (c): c is { i: number; key: string; v: number; pointLabel: string; x: number; y: number } =>
            c != null
        );

      if (coords.length === 0) {
        return { ...s, coords, lineD: '', areaD: '' };
      }

      const lineD = coords
        .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
        .join(' ');

      const first = coords[0]!;
      const last = coords[coords.length - 1]!;
      const areaD =
        `${lineD} L ${last.x.toFixed(1)} ${(padT + innerH).toFixed(1)} ` +
        `L ${first.x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

      return { ...s, coords, lineD, areaD };
    });

    const xLabelIndexes =
      categories.length <= 5
        ? categories.map((_, i) => i)
        : [
            0,
            Math.floor((categories.length - 1) / 3),
            Math.floor(((categories.length - 1) * 2) / 3),
            categories.length - 1,
          ];

    return { W, H, padL, padR, padT, padB, innerW, innerH, xAt, yAt, yTicks, seriesPaths, xLabelIndexes };
  }, [series, categories, labelByKey, yMax, yMin]);

  if (categories.length === 0 || series.length === 0) return null;

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el || categories.length === 0) return;
    const rect = el.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    const idx = Math.round(rel * (categories.length - 1));
    setActiveIndex(Math.max(0, Math.min(categories.length - 1, idx)));
  };

  const activeKey = activeIndex != null ? categories[activeIndex] : null;
  const activeX = activeIndex != null ? chart.xAt(activeIndex) : null;
  const activePointLabel =
    activeKey != null ? labelByKey.get(activeKey) ?? activeKey : null;

  const shortAxisLabel = (key: string) => {
    const full = labelByKey.get(key) ?? key;
    return full.length > 8 ? `${full.slice(0, 7)}…` : full;
  };

  return (
    <div className="multi-line-chart">
      <div className="multi-line-chart__legend">
        {series.map((s) => (
          <span key={s.id} className="multi-line-chart__legend-item">
            <span
              className={`multi-line-chart__legend-line${s.dashed ? ' multi-line-chart__legend-line--dashed' : ''}`}
              style={{ background: s.dashed ? 'transparent' : s.color, borderColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div
        ref={wrapRef}
        className="multi-line-chart__svg-wrap"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          onMove(e.clientX);
        }}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <svg
          className="multi-line-chart__svg"
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          preserveAspectRatio="none"
        >
          <defs>
            {chart.seriesPaths.map((s) => (
              <linearGradient key={s.id} id={`fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {chart.yTicks.map((tick) => {
            const y = chart.yAt(tick);
            return (
              <g key={tick}>
                <line
                  x1={chart.padL}
                  x2={chart.W - chart.padR}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.16)"
                  strokeDasharray="3 4"
                />
                <text
                  x={chart.padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--color-text-subtle)"
                  fontSize="9"
                  fontWeight="600"
                >
                  {tick % 1 === 0 ? tick : tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          {chart.seriesPaths.map((s) => (
            <g key={s.id}>
              {!s.dashed && s.areaD && s.coords.length > 1 && (
                <path d={s.areaD} fill={`url(#fill-${s.id})`} />
              )}
              {s.lineD && s.coords.length > 1 && (
                <path
                  d={s.lineD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.dashed ? 1.5 : 2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {/* Always show a dot per lesson point */}
              {s.coords.map((c) => (
                <circle
                  key={`${s.id}-${c.key}`}
                  cx={c.x}
                  cy={c.y}
                  r={activeKey === c.key ? 5 : 3.5}
                  fill={s.color}
                  stroke="var(--color-bg)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}

          {activeX != null && activeKey && (
            <line
              x1={activeX}
              x2={activeX}
              y1={chart.padT}
              y2={chart.H - chart.padB}
              stroke="rgba(248,250,252,0.85)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {chart.xLabelIndexes.map((i) => (
            <text
              key={categories[i]}
              x={chart.xAt(i)}
              y={chart.H - 8}
              textAnchor="middle"
              fill="var(--color-text-subtle)"
              fontSize="8"
              fontWeight="600"
            >
              {shortAxisLabel(categories[i]!)}
            </text>
          ))}
        </svg>

        {activeIndex != null && activeKey && (
          <div
            className="multi-line-chart__tooltip"
            style={{ left: `${(activeX! / chart.W) * 100}%` }}
          >
            <p className="multi-line-chart__tooltip-date">{activePointLabel}</p>
            {chart.seriesPaths.map((s) => {
              const pt = s.coords.find((c) => c.key === activeKey);
              if (!pt) return null;
              return (
                <p key={s.id} style={{ color: s.color }}>
                  {s.label} : {pt.v.toFixed(1)}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
