'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import type { GovernanceCalendarEventDto } from '../types/governance-calendar.types';
import {
  buildMonthGridDays,
  calendarEventDisplayTitle,
  calendarEventKindLabel,
  calendarEventTypeBadgeLabel,
  formatDayHeading,
  formatEventTime,
  formatMonthTitle,
  monthRangeIso,
  toLocalDayKey,
} from '../lib/governance-calendar-labels';
import { useGovernanceCalendarEventsQuery } from '../hooks/use-governance-cycles';
import { getApiErrorMessage } from '../api/governance-cycles.mutations';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

function eventToneClass(event: GovernanceCalendarEventDto): string {
  if (event.kind === 'CYCLE_INSTANCE') {
    return 'border-border/70 bg-[color:var(--brand-gold-050)] text-foreground';
  }
  return 'border-border/70 bg-[color:var(--state-info-bg)] text-foreground';
}

function EventChip({ event }: { event: GovernanceCalendarEventDto }) {
  const label = calendarEventDisplayTitle(event);
  const typeLabel = calendarEventTypeBadgeLabel(event);
  const content = (
    <span className="block truncate text-left">
      <span className="font-medium">{label}</span>
      <span className="starium-text-muted"> · {typeLabel}</span>
    </span>
  );

  const className = cn(
    'block w-full rounded-md border px-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]',
    eventToneClass(event),
  );

  if (event.href) {
    return (
      <Link href={event.href} className={className} title={`${label} — ${typeLabel}`}>
        {content}
      </Link>
    );
  }

  return (
    <span className={className} title={`${label} — ${typeLabel}`}>
      {content}
    </span>
  );
}

function EventListItem({ event }: { event: GovernanceCalendarEventDto }) {
  const label = calendarEventDisplayTitle(event);
  const typeLabel = calendarEventTypeBadgeLabel(event);
  const kindLabel = calendarEventKindLabel(event.kind);
  const projectLabel = event.projectName
    ? displayLabel(event.projectName, 'Projet')
    : null;

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{label}</span>
        <Badge variant="outline" className={cn('border-border', eventToneClass(event))}>
          {kindLabel}
        </Badge>
        <Badge variant="secondary">{typeLabel}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatEventTime(event.date)}
        {projectLabel ? ` · ${projectLabel}` : null}
      </p>
    </div>
  );

  if (event.href) {
    return (
      <Link
        href={event.href}
        className="flex min-h-11 items-start gap-3 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="flex min-h-11 items-start gap-3 rounded-lg border border-border/70 bg-card p-3">
      {body}
    </div>
  );
}

export function GovernanceCyclesCalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    toLocalDayKey(now),
  );

  const range = useMemo(
    () => monthRangeIso(cursor.year, cursor.monthIndex),
    [cursor.year, cursor.monthIndex],
  );

  const query = useGovernanceCalendarEventsQuery(range);

  const days = useMemo(
    () => buildMonthGridDays(cursor.year, cursor.monthIndex),
    [cursor.year, cursor.monthIndex],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, GovernanceCalendarEventDto[]>();
    for (const event of query.data?.items ?? []) {
      const key = toLocalDayKey(event.date);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [query.data?.items]);

  const selectedEvents = selectedDayKey
    ? (eventsByDay.get(selectedDayKey) ?? [])
    : [];

  const monthEvents = query.data?.items ?? [];

  const goPrev = () => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.monthIndex - 1, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  };

  const goNext = () => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.monthIndex + 1, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = new Date();
    setCursor({ year: d.getFullYear(), monthIndex: d.getMonth() });
    setSelectedDayKey(toLocalDayKey(d));
  };

  return (
    <div className="starium-stack space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={goPrev}
            aria-label="Mois précédent"
          >
            Précédent
          </Button>
          <h2 className="min-w-[10rem] text-center text-base font-semibold capitalize sm:text-lg">
            {formatMonthTitle(cursor.year, cursor.monthIndex)}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={goNext}
            aria-label="Mois suivant"
          >
            Suivant
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={goToday}
          >
            Aujourd&apos;hui
          </Button>
        </div>

        <ul
          className="flex flex-wrap gap-3 text-sm"
          aria-label="Légende du calendrier"
        >
          <li className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-sm bg-[color:var(--state-info)]"
              aria-hidden
            />
            <span>Point projet</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-sm bg-[color:var(--brand-gold)]"
              aria-hidden
            />
            <span>Instance de cycle</span>
          </li>
        </ul>
      </div>

      {query.isLoading ? <LoadingState rows={6} /> : null}

      {query.isError ? (
        <ErrorState
          message={getApiErrorMessage(
            query.error,
            'Impossible de charger le calendrier.',
          )}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!query.isLoading && !query.isError && monthEvents.length === 0 ? (
        <EmptyState
          title="Aucun événement ce mois-ci"
          description="Les points projet datés et les instances de cycle planifiées apparaîtront ici."
        />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <>
          {/* Grille desktop / tablette */}
          <div className="hidden sm:block" role="grid" aria-label="Calendrier mensuel">
            <div
              className="grid grid-cols-7 gap-px rounded-lg border border-border/70 bg-border/70 overflow-hidden"
              role="row"
            >
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  role="columnheader"
                  className="bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-px grid grid-cols-7 gap-px rounded-lg border border-border/70 bg-border/70 overflow-hidden">
              {days.map((day) => {
                const dayEvents = eventsByDay.get(day.dayKey) ?? [];
                const isSelected = selectedDayKey === day.dayKey;
                const isToday = day.dayKey === toLocalDayKey(new Date());
                return (
                  <div
                    key={day.dayKey}
                    role="gridcell"
                    className={cn(
                      'min-h-[7.5rem] bg-card p-1.5',
                      !day.inMonth && 'bg-muted/20 text-muted-foreground',
                      isSelected && 'ring-2 ring-inset ring-[color:var(--brand-gold)]',
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'mb-1 flex min-h-9 min-w-9 items-center justify-center rounded-full text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]',
                        isToday &&
                          'bg-[color:var(--brand-ink)] font-semibold text-primary-foreground',
                      )}
                      aria-pressed={isSelected}
                      aria-label={`${formatDayHeading(day.dayKey)}${
                        dayEvents.length
                          ? `, ${dayEvents.length} événement${dayEvents.length > 1 ? 's' : ''}`
                          : ''
                      }`}
                      onClick={() => setSelectedDayKey(day.dayKey)}
                    >
                      {day.date.getDate()}
                    </button>
                    <div className="flex flex-col gap-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventChip key={`${event.kind}-${event.id}`} event={event} />
                      ))}
                      {dayEvents.length > 3 ? (
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-[color:var(--brand-gold-700)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]"
                          onClick={() => setSelectedDayKey(day.dayKey)}
                        >
                          +{dayEvents.length - 3} autre
                          {dayEvents.length - 3 > 1 ? 's' : ''}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liste mobile */}
          <div className="space-y-3 sm:hidden" aria-label="Agenda du mois">
            {monthEvents.length === 0 ? null : (
              <ul className="space-y-2">
                {monthEvents.map((event) => (
                  <li key={`${event.kind}-${event.id}`}>
                    <EventListItem event={event} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedDayKey ? (
            <section
              className="starium-section hidden space-y-3 p-4 sm:block"
              aria-live="polite"
              aria-label={`Événements du ${formatDayHeading(selectedDayKey)}`}
            >
              <h3 className="text-sm font-semibold capitalize">
                {formatDayHeading(selectedDayKey)}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun événement ce jour. Utilisez « Créer un point » depuis un projet
                  pour planifier une revue.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedEvents.map((event) => (
                    <li key={`${event.kind}-${event.id}`}>
                      <EventListItem event={event} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
