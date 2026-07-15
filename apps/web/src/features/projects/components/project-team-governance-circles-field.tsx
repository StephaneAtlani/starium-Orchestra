'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  ProjectGovernanceCircleApi,
  ProjectGovernanceCircleSystemKindApi,
} from '../types/project.types';

type GovernanceCircleLabelSource = {
  name: string;
  systemKind: ProjectGovernanceCircleSystemKindApi | null;
};

function circleShortLabel(circle: GovernanceCircleLabelSource): string {
  if (circle.systemKind === 'COPIL') return 'COPIL';
  if (circle.systemKind === 'COPROJ') return 'COPROJ';
  return circle.name;
}

export function governanceCircleDisplayLabel(circle: GovernanceCircleLabelSource): string {
  if (circle.systemKind === 'COPIL') return 'Comité de pilotage (COPIL)';
  if (circle.systemKind === 'COPROJ') return 'Comité de projet (COPROJ)';
  return circle.name;
}

type ProjectTeamGovernanceCirclesFieldProps = {
  idPrefix: string;
  options: ProjectGovernanceCircleApi[];
  value: string[];
  onChange: (circleIds: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export { circleShortLabel };

export function ProjectTeamGovernanceCirclesField({
  idPrefix,
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: ProjectTeamGovernanceCirclesFieldProps) {
  const toggle = (circleId: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...value, circleId])]);
      return;
    }
    onChange(value.filter((id) => id !== circleId));
  };

  if (options.length === 0) {
    return (
      <p className="text-[11px] italic text-muted-foreground">
        Aucun cercle de gouvernance configuré pour ce projet.
      </p>
    );
  }

  return (
    <fieldset className={cn('space-y-2', className)} disabled={disabled}>
      <legend
        className={cn(
          'font-medium text-foreground',
          compact ? 'text-[11px] uppercase tracking-wide text-muted-foreground' : 'text-xs',
        )}
      >
        Appartenance
      </legend>
      {!compact ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Par défaut : Comité de pilotage (COPIL) et Comité de projet (COPROJ). Ajoutez d’autres
          cercles dans les options du projet. Une ressource peut en cumuler plusieurs.
        </p>
      ) : null}
      <ul
        className={cn(
          'grid gap-2',
          compact ? 'sm:grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        {options.map((circle) => {
          const inputId = `${idPrefix}-${circle.id}`;
          const checked = value.includes(circle.id);
          return (
            <li key={circle.id}>
              <Label
                htmlFor={inputId}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-xs font-normal',
                  checked && 'border-violet-900/35 bg-violet-900/10 dark:border-violet-700/40 dark:bg-violet-950/40',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={disabled}
                  className="mt-0.5"
                  onCheckedChange={(next) => toggle(circle.id, next === true)}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {governanceCircleDisplayLabel(circle)}
                  </span>
                  {circle.systemKind ? (
                    <span className="text-[10px] text-muted-foreground">Cercle système</span>
                  ) : null}
                </span>
              </Label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
