import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import type { GovernanceCalendarEventDto } from '../types/governance-calendar.types';

export function calendarEventKindLabel(
  kind: GovernanceCalendarEventDto['kind'],
): string {
  return kind === 'PROJECT_REVIEW' ? 'Point projet' : 'Instance de cycle';
}

export function calendarEventDisplayTitle(
  event: GovernanceCalendarEventDto,
): string {
  return firstDisplayLabel(
    [
      event.title,
      event.reviewTypeLabel,
      event.cycleName,
      event.projectName,
      calendarEventKindLabel(event.kind),
    ],
    calendarEventKindLabel(event.kind),
  );
}

export function calendarEventTypeBadgeLabel(
  event: GovernanceCalendarEventDto,
): string {
  if (event.kind === 'PROJECT_REVIEW') {
    return displayLabel(event.reviewTypeLabel, 'Point projet');
  }
  return displayLabel(event.cycleName, 'Instance de cycle');
}

/** Clé jour locale YYYY-MM-DD (calendrier mensuel FR). */
export function toLocalDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
}

export function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
}

export function monthRangeIso(year: number, monthIndex: number): {
  from: string;
  to: string;
} {
  return {
    from: startOfMonth(year, monthIndex).toISOString(),
    to: endOfMonth(year, monthIndex).toISOString(),
  };
}

export function buildMonthGridDays(
  year: number,
  monthIndex: number,
): Array<{ date: Date; inMonth: boolean; dayKey: string }> {
  const first = startOfMonth(year, monthIndex);
  // Lundi = 0 … Dimanche = 6
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);

  const days: Array<{ date: Date; inMonth: boolean; dayKey: string }> = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    days.push({
      date,
      inMonth: date.getMonth() === monthIndex,
      dayKey: toLocalDayKey(date),
    });
  }
  return days;
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1));
}

export function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return dayKey;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d));
}

export function formatEventTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
