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
        Aucune équipe configurée — créez-en dans l’onglet Équipes.
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
        Équipes
      </legend>
      {!compact ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Les tags viennent des équipes du projet (onglet Équipes). Cocher ajoute
          la personne à l’équipe ; décocher la retire — même source que la
          convocation des points.
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
          const label = governanceCircleDisplayLabel(circle);
          return (
            <li key={circle.id}>
              <Label
                htmlFor={inputId}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-xs font-normal',
                  checked && 'border-border bg-card shadow-[var(--shadow-1)]',
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
                  <span className="block font-medium text-foreground">{label}</span>
                  {circle.label?.trim() ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {circle.label.trim()}
                    </span>
                  ) : circle.systemKind ? (
                    <span className="text-[10px] text-muted-foreground">
                      Équipe système
                    </span>
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
