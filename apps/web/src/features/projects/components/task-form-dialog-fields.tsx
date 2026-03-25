'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import type { CreateProjectTaskPayload } from '../api/projects.api';
import {
  CalendarRange,
  CheckSquare,
  Flag,
  GitBranch,
  Link2,
  ListChecks,
  User,
} from 'lucide-react';
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

const DEP_TYPES = [
  { value: '', label: '—' },
  { value: 'FINISH_TO_START', label: 'Fin → début' },
  { value: 'START_TO_START', label: 'Début → début' },
  { value: 'FINISH_TO_FINISH', label: 'Fin → fin' },
];

export type TaskFormDialogFieldsProps = {
  form: CreateProjectTaskPayload;
  onPatch: (patch: Partial<CreateProjectTaskPayload>) => void;
  tasksForParent: { id: string; name: string }[];
  tasksForDepends: { id: string; name: string }[];
  assignableOptions: { id: string; label: string }[];
  /** Buckets projet (vide = aucun bucket défini côté API). */
  bucketOptions: { id: string; label: string }[];
  /** Préfixe des `id` HTML (ex. `planning-task`). */
  fieldIdPrefix: string;
};

/**
 * Formulaire tâche (planning) : sections alignées sur FRONTEND_UI-UX.md (cartes bordure token, hiérarchie).
 */
export function TaskFormDialogFields({
  form,
  onPatch,
  tasksForParent,
  tasksForDepends,
  assignableOptions,
  bucketOptions,
  fieldIdPrefix,
}: TaskFormDialogFieldsProps) {
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
        aria-labelledby={fid('sec-tracking')}
      >
        <h3
          id={fid('sec-tracking')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <ListChecks className="size-3.5 shrink-0" aria-hidden />
          Suivi
        </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={fid('bucket')}>Bucket</Label>
            <select
              id={fid('bucket')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.bucketId ?? ''}
              onChange={(e) =>
                onPatch({ bucketId: e.target.value || null })
              }
            >
              <option value="">— Aucun</option>
              {bucketOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Colonne Kanban / Planner (défini dans les options du projet).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('status')}>Statut</Label>
            <select
              id={fid('status')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.status ?? 'TODO'}
              onChange={(e) => onPatch({ status: e.target.value })}
            >
              {Object.keys(TASK_STATUS_LABEL).map((k) => (
                <option key={k} value={k}>
                  {TASK_STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('priority')}>Priorité</Label>
            <select
              id={fid('priority')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.priority ?? 'MEDIUM'}
              onChange={(e) => onPatch({ priority: e.target.value })}
            >
              {Object.keys(TASK_PRIORITY_LABEL).map((k) => (
                <option key={k} value={k}>
                  {TASK_PRIORITY_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor={fid('progress')}>Progression (0–100)</Label>
          <Input
            id={fid('progress')}
            type="number"
            min={0}
            max={100}
            value={form.progress ?? 0}
            onChange={(e) =>
              onPatch({
                progress: Number.parseInt(e.target.value, 10) || 0,
              })
            }
          />
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
          Planning
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={fid('planned-start')}>Début planifié</Label>
            <Input
              id={fid('planned-start')}
              type="date"
              value={isoToDateInput(form.plannedStartDate)}
              onChange={(e) =>
                onPatch({ plannedStartDate: dateInputToIso(e.target.value) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('planned-end')}>Fin planifiée</Label>
            <Input
              id={fid('planned-end')}
              type="date"
              value={isoToDateInput(form.plannedEndDate)}
              onChange={(e) =>
                onPatch({ plannedEndDate: dateInputToIso(e.target.value) })
              }
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-checklist')}
      >
        <h3
          id={fid('sec-checklist')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <CheckSquare className="size-3.5 shrink-0" aria-hidden />
          Liste de contrôle
        </h3>
        <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
          Synchronisée avec Microsoft Planner lors de la sync des tâches.
        </p>
        <ul className="space-y-2">
          {(form.checklistItems ?? []).map((item, idx) => (
            <li key={item.id ?? `draft-${idx}`} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border border-input"
                checked={item.isChecked ?? false}
                onChange={(e) => {
                  const next = [...(form.checklistItems ?? [])];
                  next[idx] = { ...next[idx], isChecked: e.target.checked };
                  onPatch({ checklistItems: next });
                }}
                aria-label={`Élément coché : ${item.title || 'nouvel élément'}`}
              />
              <Input
                className="min-w-0 flex-1"
                value={item.title}
                placeholder="Libellé"
                onChange={(e) => {
                  const next = [...(form.checklistItems ?? [])];
                  next[idx] = { ...next[idx], title: e.target.value };
                  onPatch({ checklistItems: next });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 px-2 text-muted-foreground"
                onClick={() => {
                  const next = (form.checklistItems ?? []).filter((_, i) => i !== idx);
                  onPatch({
                    checklistItems: next.map((row, i) => ({
                      ...row,
                      sortOrder: i,
                    })),
                  });
                }}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            const items = form.checklistItems ?? [];
            onPatch({
              checklistItems: [
                ...items,
                { title: '', isChecked: false, sortOrder: items.length },
              ],
            });
          }}
        >
          Ajouter un élément
        </Button>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-hierarchy')}
      >
        <h3
          id={fid('sec-hierarchy')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <GitBranch className="size-3.5 shrink-0" aria-hidden />
          Hiérarchie
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor={fid('parent')}>Tâche parente</Label>
          <select
            id={fid('parent')}
            className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
            value={form.parentTaskId ?? ''}
            onChange={(e) => onPatch({ parentTaskId: e.target.value || null })}
          >
            <option value="">— Aucune</option>
            {tasksForParent.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-deps')}
      >
        <h3
          id={fid('sec-deps')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          Dépendances
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={fid('depends')}>Dépend de (prédécesseur)</Label>
            <select
              id={fid('depends')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.dependsOnTaskId ?? ''}
              onChange={(e) =>
                onPatch({ dependsOnTaskId: e.target.value || null })
              }
            >
              <option value="">— Aucune</option>
              {tasksForDepends.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={fid('dep-type')}>Type de dépendance</Label>
            <select
              id={fid('dep-type')}
              className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
              value={form.dependencyType ?? ''}
              onChange={(e) =>
                onPatch({
                  dependencyType: e.target.value || null,
                })
              }
            >
              {DEP_TYPES.map((d) => (
                <option key={d.value || 'none'} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Définit le lien logique avec la tâche prédécesseur (ex. fin → début).
            </p>
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-border/70 bg-muted/30 p-4"
        aria-labelledby={fid('sec-owner')}
      >
        <h3
          id={fid('sec-owner')}
          className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <User className="size-3.5 shrink-0" aria-hidden />
          Responsable
        </h3>
        <div className="space-y-1.5">
          <Label htmlFor={fid('owner')}>Utilisateur assigné</Label>
          <select
            id={fid('owner')}
            className={cn('h-9 w-full rounded-lg border px-2', fieldBase)}
            value={form.ownerUserId ?? ''}
            onChange={(e) => onPatch({ ownerUserId: e.target.value || null })}
          >
            <option value="">—</option>
            {assignableOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}
