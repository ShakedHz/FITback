import { useEffect, useRef, type CSSProperties } from 'react';
import { Circle, CircleDot, Dumbbell, PanelTop } from 'lucide-react';
import {
  bumpSpring,
  isSpringSetupEmpty,
  MAX_SPRINGS_PER_COLOR,
  MAX_SPRINGS_TOTAL,
  PILATES_PROPS,
  SPRING_COLORS,
  SPRING_HEX,
  springDotList,
  springTotal,
  toggleProp,
  type PilatesPropId,
  type SpringColor,
  type SpringSetup,
} from '@/data/pilatesSetup';
import { useI18n } from '@/i18n';
import './PilatesSetup.css';

const PROP_ICONS: Record<PilatesPropId, typeof Dumbbell> = {
  weight: Dumbbell,
  circle: Circle,
  ball: CircleDot,
  jumpboard: PanelTop,
};

export function SpringDots({
  setup,
  size = 'sm',
}: {
  setup?: SpringSetup;
  size?: 'sm' | 'md';
}) {
  const dots = springDotList(setup);
  if (dots.length === 0) return null;
  return (
    <span className={`spring-dots spring-dots--${size}`} aria-hidden>
      {dots.map((color, i) => (
        <span
          key={`${color}-${i}`}
          className="spring-dot"
          style={{ background: SPRING_HEX[color] }}
        />
      ))}
    </span>
  );
}

export function SpringPicker({
  setup,
  open,
  onOpenChange,
  onChange,
}: {
  setup?: SpringSetup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: SpringSetup | undefined) => void;
}) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const empty = isSpringSetupEmpty(setup);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open, onOpenChange]);

  const labelFor = (color: SpringColor) => t(`spring.${color}`);

  return (
    <div className="spring-picker" ref={wrapRef}>
      <button
        type="button"
        className={`spring-picker__btn${empty ? '' : ' is-set'}${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          empty
            ? t('builder.springsAdd')
            : SPRING_COLORS.filter((c) => (setup?.[c] ?? 0) > 0)
                .map((c) => `${Math.min(MAX_SPRINGS_PER_COLOR, setup?.[c] ?? 0)} ${labelFor(c)}`)
                .join(', ')
        }
        onClick={() => onOpenChange(!open)}
      >
        {empty ? (
          <span className="spring-picker__empty" aria-hidden>
            {SPRING_COLORS.map((color) => (
              <span
                key={color}
                className="spring-dot spring-dot--ghost"
                style={{ background: SPRING_HEX[color] }}
              />
            ))}
          </span>
        ) : (
          <SpringDots setup={setup} />
        )}
      </button>
      {open && (
        <div className="spring-pop" role="dialog" aria-label={t('builder.springs')}>
          <div className="spring-pop__bar">
            {SPRING_COLORS.map((color) => {
              const count = Math.min(MAX_SPRINGS_PER_COLOR, setup?.[color] ?? 0);
              const blocked = count === 0 && springTotal(setup) >= MAX_SPRINGS_TOTAL;
              return (
                <button
                  key={color}
                  type="button"
                  className={`spring-pop__peg${count > 0 ? ' is-on' : ''}${blocked ? ' is-blocked' : ''}`}
                  style={{ '--spring': SPRING_HEX[color] } as CSSProperties}
                  aria-label={`${labelFor(color)}${count ? ` ${count}` : ''}`}
                  disabled={blocked}
                  onClick={() => onChange(bumpSpring(setup, color))}
                >
                  <span className="spring-pop__swatch" />
                  {count > 1 ? <span className="spring-pop__badge">{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PilatesPropsRow({
  selected,
  onChange,
}: {
  selected?: PilatesPropId[];
  onChange: (next: PilatesPropId[]) => void;
}) {
  const { t } = useI18n();
  const current = selected ?? [];

  return (
    <div className="builder-field pilates-props">
      <span className="builder-field__label">{t('builder.props')}</span>
      <div className="pilates-props__row">
        {PILATES_PROPS.map((id) => {
          const Icon = PROP_ICONS[id];
          const on = current.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`pilates-prop${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(toggleProp(current, id))}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{t(`prop.${id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PilatesPropsGlance({
  selected,
  className = '',
}: {
  selected?: PilatesPropId[];
  className?: string;
}) {
  const { t } = useI18n();
  const items = (selected ?? []).filter((id) => id in PROP_ICONS);
  if (!items.length) return null;

  return (
    <ul className={`pilates-props-glance${className ? ` ${className}` : ''}`}>
      {items.map((id) => {
        const Icon = PROP_ICONS[id];
        return (
          <li key={id} className="pilates-props-glance__item">
            <Icon size={12} strokeWidth={2.2} aria-hidden />
            <span>{t(`prop.${id}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
