'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from './timeline-utils';
import {
  formatTimelineEventStatus,
  formatTimelineSignedAmount,
} from './timeline-display';

function typeBadgeLabel(type: TimelineEvent['type']): string {
  switch (type) {
    case 'event':
      return 'Événement';
    case 'allocation':
      return 'Allocation';
    case 'purchase_order':
      return 'Commande';
    case 'invoice':
      return 'Facture';
    default:
      return type;
  }
}

export function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const statusLabel = formatTimelineEventStatus(event.type, event.status);
  const amountClass =
    event.direction === 'increase'
      ? 'text-emerald-700 dark:text-emerald-400'
      : event.direction === 'decrease'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const lineLabel = `${typeBadgeLabel(event.type)} · ${event.title}`;

  return (
    <li aria-label={lineLabel}>
      <div
        className={cn(
          'rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm transition-colors',
          'hover:bg-muted/40',
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <time
                className="text-xs font-medium text-muted-foreground tabular-nums"
                dateTime={event.date}
              >
                {new Date(event.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </time>
              <Badge variant="outline" className="text-[0.7rem] font-medium">
                {typeBadgeLabel(event.type)}
              </Badge>
              {statusLabel ? (
                <Badge variant="secondary" className="text-[0.65rem] font-normal">
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground">{event.title}</div>
            {event.description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{event.description}</p>
            ) : null}
          </div>
          <div
            className={cn(
              'shrink-0 text-right text-base font-semibold tabular-nums tracking-tight sm:pt-0.5 sm:text-lg',
              amountClass,
            )}
          >
            {formatTimelineSignedAmount(event.amount, event.currency)}
          </div>
        </div>
      </div>
    </li>
  );
}
