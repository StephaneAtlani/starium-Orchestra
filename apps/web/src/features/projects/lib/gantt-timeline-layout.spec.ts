import { describe, expect, it } from 'vitest';
import {
  GANTT_DAY_MS,
  GANTT_PX_PER_DAY,
  computeTimelineBounds,
  dateMsFromPx,
  dateMsToPx,
  dateRangeToTimelineLayout,
  resizeTaskRange,
  shiftTaskRangeByDays,
  spanDays,
  timelineWidthPx,
} from './gantt-timeline-layout';

describe('gantt-timeline-layout', () => {
  const t1 = { plannedStartDate: '2025-06-01T00:00:00.000Z', plannedEndDate: '2025-06-10T00:00:00.000Z' };
  const t2 = { plannedStartDate: null, plannedEndDate: null };

  it('computeTimelineBounds retourne null sans dates', () => {
    expect(computeTimelineBounds([], [])).toBeNull();
    expect(computeTimelineBounds([t2], [])).toBeNull();
  });

  it('computeTimelineBounds inclut padding et jalons', () => {
    const ms = new Date('2025-07-01T12:00:00.000Z').getTime();
    const b = computeTimelineBounds([t1], [ms]);
    expect(b).not.toBeNull();
    expect(b!.min).toBeLessThan(new Date(t1.plannedStartDate!).getTime());
    expect(b!.max).toBeGreaterThan(new Date(t1.plannedEndDate!).getTime());
  });

  it('dateMsToPx et timelineWidthPx sont cohérents', () => {
    const b = computeTimelineBounds([t1], [])!;
    const w = timelineWidthPx(b, GANTT_PX_PER_DAY);
    expect(w).toBeGreaterThan(0);
    const span = spanDays(b);
    expect(w).toBeGreaterThanOrEqual(span * GANTT_PX_PER_DAY);
    const left0 = dateMsToPx(b.min, b, GANTT_PX_PER_DAY);
    expect(left0).toBe(0);
  });

  it('dateRangeToTimelineLayout expose largeur et bandeaux', () => {
    const b = computeTimelineBounds([t1], [])!;
    const layout = dateRangeToTimelineLayout(b, GANTT_PX_PER_DAY);
    expect(layout.widthPx).toBe(timelineWidthPx(b, GANTT_PX_PER_DAY));
    expect(layout.monthBands.length).toBeGreaterThan(0);
    expect(layout.weekBands.length).toBeGreaterThan(0);
    expect(layout.monthBands[0]!.widthPx).toBeGreaterThan(0);
  });

  it('spanDays cohérent avec bounds', () => {
    const b = { min: 0, max: 10 * GANTT_DAY_MS };
    expect(spanDays(b)).toBe(10);
  });

  it('dateMsFromPx et dateMsToPx sont inverses (approximation)', () => {
    const b = computeTimelineBounds(
      [
        {
          plannedStartDate: '2025-06-01T12:00:00.000Z',
          plannedEndDate: '2025-06-10T12:00:00.000Z',
        },
      ],
      [],
    )!;
    const px = dateMsToPx(new Date('2025-06-05T12:00:00.000Z').getTime(), b, GANTT_PX_PER_DAY);
    const back = dateMsFromPx(px, b, GANTT_PX_PER_DAY);
    expect(Math.abs(back - new Date('2025-06-05T12:00:00.000Z').getTime())).toBeLessThan(1);
  });

  it('shiftTaskRangeByDays conserve la durée en jours', () => {
    const s = 1000 * GANTT_DAY_MS;
    const e = 1005 * GANTT_DAY_MS;
    const r = shiftTaskRangeByDays(s, e, 3);
    expect(r.endMs - r.startMs).toBe(e - s);
    expect(r.startMs).toBe(s + 3 * GANTT_DAY_MS);
  });

  it('resizeTaskRange impose au moins un jour', () => {
    const s = 1000 * GANTT_DAY_MS;
    const e = 1001 * GANTT_DAY_MS;
    const r = resizeTaskRange(s, e, 'resize-end', -5);
    expect(r.endMs - r.startMs).toBe(GANTT_DAY_MS);
  });
});
