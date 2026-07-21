'use client';

import { useMemo } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { useStrategicDirectionsQuery } from '@/features/strategic-vision/hooks/use-strategic-vision-queries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__work_team_direction_none__';

type Props = {
  id?: string;
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  triggerClassName?: string;
  placeholder?: string;
};

/**
 * Sélecteur direction stratégique (Vision) pour rattachement d’une équipe métier.
 */
export function WorkTeamStrategicDirectionSelect({
  id,
  value,
  onChange,
  disabled,
  triggerClassName = 'h-11 w-full min-h-11 text-sm sm:h-9 sm:min-h-9',
  placeholder = 'Aucune direction',
}: Props) {
  const { has, isLoading: permsLoading } = usePermissions();
  const canReadVision = has('strategic_vision.read');

  const directionsQ = useStrategicDirectionsQuery({
    enabled: canReadVision && !permsLoading,
  });

  const options = useMemo(() => {
    const rows = directionsQ.data ?? [];
    return [...rows]
      .filter((d) => d.isActive || d.id === value)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fr'));
  }, [directionsQ.data, value]);

  const selectValue = value ?? NONE;
  const displayLabel = useMemo(() => {
    if (value == null) return placeholder;
    return options.find((o) => o.id === value)?.name ?? placeholder;
  }, [value, options, placeholder]);

  const busy = directionsQ.isLoading || permsLoading;
  const inactive = disabled || !canReadVision || busy || directionsQ.isError;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === NONE) onChange(null);
        else onChange(v);
      }}
      disabled={inactive}
    >
      <SelectTrigger id={id} className={triggerClassName} aria-busy={busy}>
        <SelectValue placeholder={busy ? 'Chargement…' : placeholder}>
          {busy ? 'Chargement…' : displayLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} disabled={!o.isActive && o.id !== value}>
            {o.name}
            {o.code ? ` (${o.code})` : ''}
            {!o.isActive ? ' [inactive]' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
