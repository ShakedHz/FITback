import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import {
  formatDayStrip,
  getEventColors,
  getEventEndTime,
  getEventTime,
  toDateKey,
  type ScheduleEvent,
} from '@/data/scheduleTypes';
import { layoutDayEvents, visibleHourRange } from '@/utils/scheduleLayout';
import { useI18n } from '@/i18n';
import './ScheduleGrid.css';

type GridMode = 'day' | 'week';

const HOUR_HEIGHT: Record<GridMode, number> = { day: 72, week: 48 };
const MIN_BLOCK_HEIGHT: Record<GridMode, number> = { day: 28, week: 20 };
/** Tapping an empty slot snaps to this many minutes. */
const TAP_STEP: Record<GridMode, number> = { day: 15, week: 30 };
const DRAG_STEP = 15;
/** Touch needs a press-and-hold (like iOS Calendar) so a normal swipe still scrolls. */
const LONG_PRESS_MS = 350;
const TOUCH_SLOP = 8;
const MOUSE_SLOP = 4;

interface ScheduleGridProps {
  mode: GridMode;
  days: Date[];
  eventsByDay: Record<string, ScheduleEvent[]>;
  todayKey: string;
  onSelectEvent: (event: ScheduleEvent) => void;
  onSelectDay?: (day: Date) => void;
  /** Classes the instructor can attach a plan to — they show a "no plan" hint when empty. */
  canEditPlan: (event: ScheduleEvent) => boolean;
  isViewOnly?: (event: ScheduleEvent) => boolean;
  canMove?: (event: ScheduleEvent) => boolean;
  onMoveEvent?: (event: ScheduleEvent, day: Date, time: string) => void;
  onCreateAt?: (day: Date, time: string) => void;
}

interface DragState {
  event: ScheduleEvent;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  originDayIndex: number;
  originStart: number;
  duration: number;
  dayIndex: number;
  startMin: number;
  active: boolean;
}

interface DragPreview {
  eventId: string;
  dayIndex: number;
  startMin: number;
  duration: number;
}

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function ScheduleGrid({
  mode,
  days,
  eventsByDay,
  todayKey,
  onSelectEvent,
  onSelectDay,
  canEditPlan,
  isViewOnly,
  canMove,
  onMoveEvent,
  onCreateAt,
}: ScheduleGridProps) {
  const { t, dateLocale, dir } = useI18n();
  const hourHeight = HOUR_HEIGHT[mode];
  const minBlock = MIN_BLOCK_HEIGHT[mode];
  const compact = mode === 'week';

  const rootRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pressTimer = useRef<number | undefined>(undefined);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  const allEvents = useMemo(
    () => days.flatMap((day) => eventsByDay[toDateKey(day)] ?? []),
    [days, eventsByDay]
  );
  const range = useMemo(() => visibleHourRange(allEvents), [allEvents]);
  const hours = useMemo(
    () => Array.from({ length: range.end - range.start }, (_, i) => range.start + i),
    [range]
  );
  const bodyHeight = hours.length * hourHeight;

  // Once a drag is live, stop the page from scrolling under the finger.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current?.active) e.preventDefault();
    };
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => root.removeEventListener('touchmove', onTouchMove);
  }, []);

  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  const hourLabel = (hour: number) =>
    compact
      ? new Date(2000, 0, 1, hour).toLocaleTimeString(dateLocale, { hour: 'numeric' })
      : `${String(hour).padStart(2, '0')}:00`;

  const activateDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.active = true;
    navigator.vibrate?.(10);
    setPreview({
      eventId: drag.event.id,
      dayIndex: drag.dayIndex,
      startMin: drag.startMin,
      duration: drag.duration,
    });
  };

  const endDrag = () => {
    window.clearTimeout(pressTimer.current);
    dragRef.current = null;
    setPreview(null);
  };

  const onBlockPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    event: ScheduleEvent,
    dayIndex: number,
    startMin: number,
    endMin: number
  ) => {
    if (!onMoveEvent || !canMove?.(event)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragRef.current = {
      event,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      originDayIndex: dayIndex,
      originStart: startMin,
      duration: endMin - startMin,
      dayIndex,
      startMin,
      active: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.pointerType !== 'mouse') {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(activateDrag, LONG_PRESS_MS);
    }
  };

  const onBlockPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.active) {
      const moved = Math.hypot(dx, dy);
      if (drag.pointerType === 'mouse') {
        if (moved < MOUSE_SLOP) return;
        activateDrag();
      } else {
        // Finger moved before the hold finished: the user is scrolling, not dragging.
        if (moved > TOUCH_SLOP) endDrag();
        return;
      }
    }

    const deltaMin = Math.round(((dy / hourHeight) * 60) / DRAG_STEP) * DRAG_STEP;
    const earliest = range.start * 60;
    const latest = Math.min(range.end * 60, 24 * 60) - drag.duration;
    const startMin = Math.max(earliest, Math.min(latest, drag.originStart + deltaMin));

    let dayIndex = drag.dayIndex;
    const cols = colsRef.current;
    if (cols && days.length > 1) {
      const rect = cols.getBoundingClientRect();
      const slot = Math.floor(((e.clientX - rect.left) / rect.width) * days.length);
      const clamped = Math.max(0, Math.min(days.length - 1, slot));
      dayIndex = dir === 'rtl' ? days.length - 1 - clamped : clamped;
    }

    if (startMin === drag.startMin && dayIndex === drag.dayIndex) return;
    drag.startMin = startMin;
    drag.dayIndex = dayIndex;
    setPreview({ eventId: drag.event.id, dayIndex, startMin, duration: drag.duration });
  };

  const onBlockPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const { active, event, dayIndex, startMin, originDayIndex, originStart } = drag;
    endDrag();
    if (!active) return;

    // The click that follows a drag must not open the class sheet.
    suppressClick.current = true;
    if (dayIndex !== originDayIndex || startMin !== originStart) {
      onMoveEvent?.(event, days[dayIndex], minutesToTime(startMin));
    }
  };

  const onBlockClick = (event: ScheduleEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelectEvent(event);
  };

  const onColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if (!onCreateAt || e.target !== e.currentTarget) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const step = TAP_STEP[mode];
    const minutes = range.start * 60 + ((e.clientY - rect.top) / hourHeight) * 60;
    const snapped = Math.min(Math.floor(minutes / step) * step, 24 * 60 - step);
    onCreateAt(day, minutesToTime(Math.max(0, snapped)));
  };

  const renderBlockBody = (
    event: ScheduleEvent,
    height: number,
    timeRange: string,
    showPlanLine: boolean
  ) => {
    const hasPlan = Boolean(event.lessonPlanTitle);
    if (compact) {
      return (
        <>
          <span className="sgrid-block__title">{event.title}</span>
          {height >= 34 && <span className="sgrid-block__time">{timeRange.split('–')[0]}</span>}
        </>
      );
    }
    return (
      <>
        <span className="sgrid-block__top">
          <span className="sgrid-block__time">{timeRange}</span>
          {event.enrolled != null && event.capacity != null && (
            <span className="sgrid-block__count">
              {event.enrolled}/{event.capacity}
            </span>
          )}
        </span>
        <span className="sgrid-block__title">{event.title}</span>
        {showPlanLine && (
          <span className={`sgrid-block__plan${hasPlan ? '' : ' sgrid-block__plan--none'}`}>
            <BookOpen size={12} strokeWidth={2.25} aria-hidden />
            <span>{hasPlan ? event.lessonPlanTitle : t('schedule.noPlan')}</span>
          </span>
        )}
      </>
    );
  };

  const draggedEvent = preview ? allEvents.find((ev) => ev.id === preview.eventId) : undefined;

  return (
    <div
      ref={rootRef}
      className={`sgrid sgrid--${mode}${preview ? ' sgrid--dragging' : ''}`}
      style={{ '--hour-h': `${hourHeight}px` } as React.CSSProperties}
    >
      {mode === 'week' && (
        <div className="sgrid__head">
          <span className="sgrid__corner" aria-hidden />
          {days.map((day) => {
            const key = toDateKey(day);
            const strip = formatDayStrip(day, dateLocale);
            return (
              <button
                key={key}
                type="button"
                className={`sgrid__dayhead${key === todayKey ? ' sgrid__dayhead--today' : ''}`}
                onClick={() => onSelectDay?.(day)}
              >
                <span className="sgrid__dow">{strip.dow}</span>
                <span className="sgrid__num">{strip.num}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="sgrid__body" style={{ height: bodyHeight }}>
        <div className="sgrid__hours" aria-hidden>
          {hours.map((hour, i) => (
            <span key={hour} className="sgrid__hour" style={{ top: i * hourHeight }}>
              {hourLabel(hour)}
            </span>
          ))}
        </div>

        <div className="sgrid__cols" ref={colsRef}>
          {days.map((day, dayIndex) => {
            const key = toDateKey(day);
            const positioned = layoutDayEvents(eventsByDay[key] ?? []);
            return (
              <div
                key={key}
                className={`sgrid__col${key === todayKey && compact ? ' sgrid__col--today' : ''}${onCreateAt ? ' sgrid__col--tappable' : ''}`}
                onClick={(e) => onColumnClick(e, day)}
              >
                {positioned.map(({ event, startMin, endMin, column, columns }) => {
                  const colors = getEventColors(event);
                  const top = ((startMin - range.start * 60) / 60) * hourHeight;
                  const height = Math.max(((endMin - startMin) / 60) * hourHeight - 2, minBlock);
                  const hasPlan = Boolean(event.lessonPlanTitle);
                  const editable = canEditPlan(event);
                  const movable = Boolean(onMoveEvent && canMove?.(event));
                  const timeRange = `${getEventTime(event)}–${formatClock(getEventEndTime(event))}`;
                  const planDiffersFromTitle = hasPlan && event.lessonPlanTitle !== event.title;
                  const showPlanLine =
                    !compact && height >= 60 && (planDiffersFromTitle || (editable && !hasPlan));

                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={[
                        'sgrid-block',
                        editable && !hasPlan ? 'sgrid-block--no-plan' : '',
                        isViewOnly?.(event) ? 'sgrid-block--view-only' : '',
                        movable ? 'sgrid-block--movable' : '',
                        preview?.eventId === event.id ? 'sgrid-block--lifted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        {
                          '--event-rgb': colors.rgb,
                          '--event-color': colors.bg,
                          top,
                          height,
                          insetInlineStart: `calc(${(column * 100) / columns}% + 1px)`,
                          width: `calc(${100 / columns}% - 2px)`,
                        } as React.CSSProperties
                      }
                      onPointerDown={(e) => onBlockPointerDown(e, event, dayIndex, startMin, endMin)}
                      onPointerMove={onBlockPointerMove}
                      onPointerUp={onBlockPointerUp}
                      onPointerCancel={endDrag}
                      onContextMenu={(e) => {
                        if (movable) e.preventDefault();
                      }}
                      onClick={() => onBlockClick(event)}
                      aria-label={`${timeRange} ${event.title}`}
                    >
                      {renderBlockBody(event, height, timeRange, showPlanLine)}
                    </button>
                  );
                })}

                {preview && draggedEvent && preview.dayIndex === dayIndex && (() => {
                  const colors = getEventColors(draggedEvent);
                  const top = ((preview.startMin - range.start * 60) / 60) * hourHeight;
                  const height = Math.max((preview.duration / 60) * hourHeight - 2, minBlock);
                  const timeRange = `${minutesToTime(preview.startMin)}–${minutesToTime(preview.startMin + preview.duration)}`;
                  return (
                    <div
                      className="sgrid-block sgrid-block--ghost"
                      style={
                        {
                          '--event-rgb': colors.rgb,
                          '--event-color': colors.bg,
                          top,
                          height,
                          insetInlineStart: '1px',
                          width: 'calc(100% - 2px)',
                        } as React.CSSProperties
                      }
                      aria-hidden
                    >
                      {renderBlockBody(draggedEvent, height, timeRange, false)}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
