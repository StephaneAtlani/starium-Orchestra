'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import type { CreateProjectMilestonePayload } from '../api/projects.api';
import { CalendarRange, Flag, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function dateInputToIso(s: string): string | undefined {
  if (!s.trim()) return undefined;
  return new Date(`${s}T12:00:00.000Z`).toISOString();
}

const fieldBase =
  'border border-input bg-background text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export type MilestoneFormDialogFieldsProps = {
  form: CreateProjectMilestonePayload;
  onPatch: (patch: Partial<CreateProjectMilestonePayload>) => void;
  taskOptions: { id: string; name: string }[];
  /** Préfixe des `id` HTML (ex. `gantt-ms`, `ms`). */
  fieldIdPrefix: string;
};

/**
 * Formulaire jalon (planning) : sections alignées sur FRONTEND_UI-UX.md (cartes bordure token, hiérarchie).
 */
export function MilestoneFormDialogFields({
  form,
  onPatch,
  taskOptions,
  fieldIdPrefix,
}: MilestoneFormDialogFieldsProps) {
  const fid = (suffix: string) => `${fieldIdPrefix}-${suffix}`;

  return (
    <div className="space-y-4">
      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-identity')}
      >
        <h3
          id={fid('sec-identity')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <Flag className="size-3.5 shrink-0" aria-hidden />
          Identité
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={fid('name')}>Nom</Label>
            <Input
              id={fid('name')}
              value={form.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('desc')}>Description</Label>
            <textarea
              id={fid('desc')}
              className={cn(
                'min-h-[72px] w-full rounded-lg px-3 py-2 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                fieldBase,
              )}
              value={form.description ?? ''}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-planning')}
      >
        <h3
          id={fid('sec-planning')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <CalendarRange className="size-3.5 shrink-0" aria-hidden />
          Dates & statut
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={fid('target')}>Date cible</Label>
            <Input
              id={fid('target')}
              type="date"
              value={isoToDateInput(form.targetDate)}
              onChange={(e) =>
                onPatch({
                  targetDate: dateInputToIso(e.target.value) ?? form.targetDate,
                })
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('status')}>Statut</Label>
            <select
              id={fid('status')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.status ?? 'PLANNED'}
              onChange={(e) => onPatch({ status: e.target.value })}
            >
              {Object.keys(MILESTONE_STATUS_LABEL).map((k) => (
                <option key={k} value={k}>
                  {MILESTONE_STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor={fid('achieved')}>Date d’atteinte (optionnel)</Label>
          <Input
            id={fid('achieved')}
            type="date"
            value={isoToDateInput(form.achievedDate)}
            onChange={(e) =>
              onPatch({
                achievedDate: e.target.value ? dateInputToIso(e.target.value) : undefined,
              })
            }
          />
        </div>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-link')}
      >
        <h3
          id={fid('sec-link')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          Lien projet
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor={fid('linked-task')}>Tâche liée</Label>
          <select
            id={fid('linked-task')}
            className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
            value={form.linkedTaskId ?? ''}
            onChange={(e) => onPatch({ linkedTaskId: e.target.value || null })}
          >
            <option value="">—</option>
            {taskOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Associe optionnellement ce jalon à une tâche pour le suivi dans la grille.
          </p>
        </div>
      </section>
    </div>
  );
}
