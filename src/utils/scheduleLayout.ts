import { getEventMinutes, type ScheduleEvent } from '@/data/scheduleTypes';

export interface PositionedEvent {
  event: ScheduleEvent;
  startMin: number;
  endMin: number;
  column: number;
  columns: number;
}

const MIN_DURATION = 15;

/**
 * Google-Calendar style layout: classes that overlap in time share the row
 * side by side; each block's height follows its duration.
 */
export function layoutDayEvents(events: ScheduleEvent[]): PositionedEvent[] {
  const items = events
    .map((event) => {
      const startMin = getEventMinutes(event);
      return { event, startMin, endMin: startMin + Math.max(event.duration, MIN_DURATION) };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = columnEnds.length;
    cluster.forEach((item) => {
      item.columns = columns;
    });
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  };

  items.forEach((item) => {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();

    let column = columnEnds.findIndex((end) => end <= item.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(item.endMin);
    } else {
      columnEnds[column] = item.endMin;
    }

    cluster.push({ ...item, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  });
  flush();

  return result;
}

/** Visible hour window: the default working day, stretched to fit any class outside it. */
export function visibleHourRange(
  events: ScheduleEvent[],
  defaultStart = 8,
  defaultEnd = 20
): { start: number; end: number } {
  let start = defaultStart;
  let end = defaultEnd;
  events.forEach((event) => {
    const startMin = getEventMinutes(event);
    const endMin = Math.min(startMin + Math.max(event.duration, MIN_DURATION), 24 * 60);
    start = Math.min(start, Math.floor(startMin / 60));
    end = Math.max(end, Math.ceil(endMin / 60));
  });
  return { start, end };
}
