'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  TimelineFilterPeriod,
  TimelineFilterType,
  TimelineFiltersState,
} from './timeline-utils';

const TYPE_LABELS: Record<TimelineFilterType, string> = {
  all: 'Tous les types',
  event: 'Événements financiers',
  allocation: 'Allocations',
  purchase_order: 'Commandes',
  invoice: 'Factures',
};

const PERIOD_LABELS: Record<TimelineFilterPeriod, string> = {
  all: 'Toute la période',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  '365d': '12 derniers mois',
};

export function TimelineFilters({
  filters,
  onFiltersChange,
  idPrefix = 'timeline',
}: {
  filters: TimelineFiltersState;
  onFiltersChange: (next: TimelineFiltersState) => void;
  idPrefix?: string;
}) {
  const typeId = `${idPrefix}-filter-type`;
  const periodId = `${idPrefix}-filter-period`;

  return (
    <div
      className="mb-4 rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4"
      role="region"
      aria-label="Filtres de la chronologie"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Affichage
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={typeId} className="text-sm text-foreground">
            Type d’événement
          </Label>
          <Select
            value={filters.type}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, type: v as TimelineFilterType })
            }
          >
            <SelectTrigger
              id={typeId}
              size="sm"
              className="w-full min-w-[220px] sm:w-[240px]"
              aria-label="Filtrer par type d’événement"
            >
              <SelectValue>{TYPE_LABELS[filters.type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{TYPE_LABELS.all}</SelectItem>
              <SelectItem value="event">{TYPE_LABELS.event}</SelectItem>
              <SelectItem value="allocation">{TYPE_LABELS.allocation}</SelectItem>
              <SelectItem value="purchase_order">{TYPE_LABELS.purchase_order}</SelectItem>
              <SelectItem value="invoice">{TYPE_LABELS.invoice}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={periodId} className="text-sm text-foreground">
            Période
          </Label>
          <Select
            value={filters.period}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, period: v as TimelineFilterPeriod })
            }
          >
            <SelectTrigger
              id={periodId}
              size="sm"
              className="w-full min-w-[200px] sm:w-[220px]"
              aria-label="Filtrer par période"
            >
              <SelectValue>{PERIOD_LABELS[filters.period]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{PERIOD_LABELS.all}</SelectItem>
              <SelectItem value="30d">{PERIOD_LABELS['30d']}</SelectItem>
              <SelectItem value="90d">{PERIOD_LABELS['90d']}</SelectItem>
              <SelectItem value="365d">{PERIOD_LABELS['365d']}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
