'use client';

import type { FinancialEventForLine } from '../../api/budget-line-financial.api';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatAmount, formatDate } from '../../lib/budget-formatters';
import { formatFinancialEventType, formatFinancialSourceType } from '../../lib/financial-event-labels';

function formatEventAmountCell(e: FinancialEventForLine): { text: string; className: string } {
  const raw = Number(e.amountHt ?? e.amount);
  const cur = e.currency;
  const absFmt = formatAmount(Math.abs(raw), cur);

  if (e.eventType === 'COMMITMENT_REGISTERED' || e.eventType === 'CONSUMPTION_REGISTERED') {
    return {
      text: `− ${absFmt}`,
      className: 'text-destructive',
    };
  }
  if (raw < 0) {
    return {
      text: `− ${formatAmount(Math.abs(raw), cur)}`,
      className: 'text-destructive',
    };
  }
  if (raw > 0 && (e.eventType === 'ALLOCATION_ADDED' || e.eventType === 'REALLOCATION_DONE')) {
    return {
      text: `+ ${absFmt}`,
      className: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  return {
    text: formatAmount(raw, cur),
    className: 'text-foreground',
  };
}

export function BudgetLineEventsTable({
  events,
}: {
  events: FinancialEventForLine[];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Aucun événement à afficher pour cette page.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="w-[110px] min-w-[100px] bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="min-w-[140px] max-w-[240px] bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Libellé
            </TableHead>
            <TableHead className="hidden sm:table-cell bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="hidden md:table-cell bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </TableHead>
            <TableHead className="w-[120px] min-w-[100px] bg-muted/40 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Montant
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => {
            const amountCell = formatEventAmountCell(e);
            const dateStr = formatDate(e.eventDate);
            return (
              <TableRow
                key={e.id}
                className="border-border/50 transition-colors hover:bg-muted/30"
              >
                <TableCell className="align-top text-sm tabular-nums text-muted-foreground">
                  <time dateTime={e.eventDate}>{dateStr}</time>
                </TableCell>
                <TableCell className="align-top">
                  <div
                    className="max-w-[240px] font-medium leading-snug text-foreground"
                    title={e.label}
                  >
                    <span className="line-clamp-2">{e.label || '—'}</span>
                  </div>
                  {e.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={e.description}>
                      {e.description}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
                    <Badge variant="secondary" className="text-[0.65rem] font-normal">
                      {formatFinancialEventType(e.eventType)}
                    </Badge>
                    <Badge variant="outline" className="text-[0.65rem] font-normal">
                      {formatFinancialSourceType(e.sourceType)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden align-top sm:table-cell">
                  <Badge variant="secondary" className="max-w-full whitespace-normal font-normal">
                    {formatFinancialEventType(e.eventType)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden align-top md:table-cell">
                  <Badge variant="outline" className="max-w-full whitespace-normal font-normal">
                    {formatFinancialSourceType(e.sourceType)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'align-top text-right text-sm font-semibold tabular-nums',
                    amountCell.className,
                  )}
                >
                  {amountCell.text}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
