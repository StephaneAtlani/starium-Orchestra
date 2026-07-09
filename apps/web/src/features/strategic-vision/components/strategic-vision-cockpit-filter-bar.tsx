'use client';

import { Building2, Signpost } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';
import { cn } from '@/lib/utils';

export function StrategicVisionCockpitFilterBar({
  directionFilter,
  directionFilterLabel,
  directions,
  onDirectionFilterChange,
  onManageVisions,
  onManageDirections,
  showVisionActions,
}: {
  directionFilter: string;
  directionFilterLabel: string;
  directions: StrategicDirectionDto[];
  onDirectionFilterChange: (value: string) => void;
  onManageVisions: () => void;
  onManageDirections: () => void;
  showVisionActions: boolean;
}) {
  const directionActive = directionFilter !== 'ALL';

  return (
    <div
      className="starium-panel overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card"
      aria-label="Filtre direction cockpit"
    >
      <div className="starium-filter-bar">
        <div className="starium-filter-bar-left">
          <div className="starium-filter-bar-chips">
            <Select value={directionFilter} onValueChange={(v) => onDirectionFilterChange(v ?? 'ALL')}>
              <SelectTrigger
                size="sm"
                aria-label="Direction cockpit"
                className={cn(
                  'starium-filter-chip h-auto min-h-[44px] w-full shadow-none focus-visible:ring-0 data-[size=sm]:h-auto md:min-h-0 md:w-auto',
                  directionActive && 'starium-filter-chip--active',
                )}
              >
                <SelectValue>{directionFilterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les directions</SelectItem>
                <SelectItem value="UNASSIGNED">Non affectés</SelectItem>
                {directions.map((direction) => (
                  <SelectItem key={direction.id} value={direction.id}>
                    {direction.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="starium-filter-bar-right">
          {showVisionActions ? (
            <button
              type="button"
              className="starium-filter-chip min-h-[44px] md:min-h-0"
              onClick={onManageVisions}
              aria-haspopup="dialog"
            >
              <Building2 aria-hidden />
              <span>Gérer les visions</span>
            </button>
          ) : null}
          <button
            type="button"
            className="starium-filter-chip min-h-[44px] md:min-h-0"
            onClick={onManageDirections}
            aria-haspopup="dialog"
          >
            <Signpost aria-hidden />
            <span>Gérer les directions</span>
          </button>
        </div>
      </div>
    </div>
  );
}
