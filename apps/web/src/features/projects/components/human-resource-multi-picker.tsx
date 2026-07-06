'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type HumanResourcePickerOption = {
  id: string;
  firstName: string | null;
  name: string;
  code: string | null;
};

export function formatHumanResourcePerson(
  r: Pick<HumanResourcePickerOption, 'firstName' | 'name' | 'code'>,
): string {
  const label = [r.firstName, r.name].filter(Boolean).join(' ').trim();
  return label || r.code || '—';
}

type HumanResourceMultiPickerProps = {
  id: string;
  label: string;
  options: HumanResourcePickerOption[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function HumanResourceMultiPicker({
  id,
  label,
  options,
  selectedIds,
  onChange,
  disabled = false,
  emptyLabel = 'Aucune ressource sélectionnée',
  className,
}: HumanResourceMultiPickerProps) {
  const toggle = (resourceId: string) => {
    if (disabled) return;
    const has = selectedIds.includes(resourceId);
    onChange(
      has ? selectedIds.filter((x) => x !== resourceId) : [...selectedIds, resourceId],
    );
  };

  const remove = (resourceId: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((x) => x !== resourceId));
  };

  const optionById = new Map(options.map((option) => [option.id, option]));

  return (
    <div className={cn('space-y-2', className)}>
      <span id={id} className="starium-form-label">
        {label}
      </span>

      {selectedIds.length > 0 ? (
        <div className="starium-form-tags flex flex-wrap gap-2" aria-labelledby={id}>
          {selectedIds.map((resourceId) => {
            const option = optionById.get(resourceId);
            const text = option ? formatHumanResourcePerson(option) : 'Ressource inconnue';
            return (
              <Badge key={resourceId} variant="secondary" className="gap-1 pr-1 font-normal">
                <span>{text}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="rounded-sm px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Retirer ${text}`}
                    onClick={() => remove(resourceId)}
                  >
                    ×
                  </button>
                ) : null}
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      {!disabled ? (
        <ul
          className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/70 p-2"
          aria-labelledby={id}
        >
          {options.length === 0 ? (
            <li className="px-2 py-1 text-sm text-muted-foreground">
              Aucune ressource Humaine disponible.
            </li>
          ) : (
            options.map((option) => {
              const optionId = `${id}-${option.id}`;
              const checked = selectedIds.includes(option.id);
              const text = formatHumanResourcePerson(option);
              return (
                <li key={option.id}>
                  <Label
                    htmlFor={optionId}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/40"
                  >
                    <Checkbox
                      id={optionId}
                      checked={checked}
                      onCheckedChange={() => toggle(option.id)}
                    />
                    <span className="text-sm">{text}</span>
                  </Label>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function formatAssignedResourcesLabel(
  resources: Array<Pick<HumanResourcePickerOption, 'firstName' | 'name' | 'code'>> | undefined,
  fallbackIds: string[] = [],
): string {
  if (resources && resources.length > 0) {
    return resources.map((resource) => formatHumanResourcePerson(resource)).join(', ');
  }
  if (fallbackIds.length === 0) return '—';
  return `${fallbackIds.length} ressource${fallbackIds.length > 1 ? 's' : ''}`;
}
