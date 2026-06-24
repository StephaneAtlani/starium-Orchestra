'use client';

import { useMemo, useState } from 'react';
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import type { CreateProjectTaskPayload } from '../api/projects.api';
import {
  CalendarRange,
  CheckSquare,
  Flag,
  Link2,
  ListChecks,
  Plus,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskLabelOption } from '../types/project.types';
import {
  pickReadableTextOnBackground,
  resolveTaskLabelDisplayColor,
} from '../lib/planner-task-label-colors';
import { toast } from '@/lib/toast';

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

const DEP_TYPES = [
  { value: '', label: '—' },
  { value: 'FINISH_TO_START', label: 'Fin → début' },
  { value: 'START_TO_START', label: 'Début → début' },
  { value: 'FINISH_TO_FINISH', label: 'Fin → fin' },
];

const TASK_LABEL_PICK_PLACEHOLDER = '__task_label_pick__';

function toUserErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; error?: unknown };
    if (typeof maybe.message === 'string' && maybe.message.trim().length > 0) return maybe.message;
    if (typeof maybe.error === 'string' && maybe.error.trim().length > 0) return maybe.error;
  }
  return 'Une erreur est survenue.';
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn('starium-form-field', className)}>
      <label htmlFor={htmlFor} className="starium-form-label">
        {label}
      </label>
      {children}
      {hint ? <p className="starium-form-hint">{hint}</p> : null}
    </div>
  );
}

export type TaskFormDialogFieldsProps = {
  form: CreateProjectTaskPayload;
  onPatch: (patch: Partial<CreateProjectTaskPayload>) => void;
  phaseOptions: { id: string; name: string }[];
  tasksForDepends: { id: string; name: string }[];
  assignableOptions: { id: string; label: string }[];
  bucketOptions: { id: string; label: string }[];
  taskLabelOptions: TaskLabelOption[];
  syncMicrosoftPlannerLabelsEnabled: boolean;
  canCreateTaskLabels: boolean;
  onCreateTaskLabel?: (name: string) => Promise<string>;
  canCreatePhase?: boolean;
  onCreatePhase?: (name: string) => Promise<string>;
  fieldIdPrefix: string;
};

export function TaskFormDialogFields({
  form,
  onPatch,
  phaseOptions,
  tasksForDepends,
  assignableOptions,
  bucketOptions,
  taskLabelOptions,
  syncMicrosoftPlannerLabelsEnabled,
  canCreateTaskLabels,
  onCreateTaskLabel,
  canCreatePhase = false,
  onCreatePhase,
  fieldIdPrefix,
}: TaskFormDialogFieldsProps) {
  const fid = (suffix: string) => `${fieldIdPrefix}-${suffix}`;

  const selectedLabelIds = useMemo(
    () => form.taskLabelIds ?? [],
    [form.taskLabelIds],
  );
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [isCreatingPhase, setIsCreatingPhase] = useState(false);

  const progress = Math.min(100, Math.max(0, form.progress ?? 0));

  const labelById = useMemo(() => {
    const m = new Map<string, TaskLabelOption>();
    for (const o of taskLabelOptions) m.set(o.id, o);
    return m;
  }, [taskLabelOptions]);

  const availableLabelOptions = useMemo(
    () => taskLabelOptions.filter((o) => !selectedLabelIds.includes(o.id)),
    [taskLabelOptions, selectedLabelIds],
  );

  const toggleLabel = (labelId: string) => {
    const has = selectedLabelIds.includes(labelId);
    const next = has
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    onPatch({ taskLabelIds: next });
  };

  const removeLabel = (labelId: string) => {
    onPatch({
      taskLabelIds: selectedLabelIds.filter((id) => id !== labelId),
    });
  };

  const createAndSelectLabel = async () => {
    if (!canCreateTaskLabels || !onCreateTaskLabel) return;
    const name = newLabelName.trim();
    if (!name) return;
    setIsCreatingLabel(true);
    try {
      const id = await onCreateTaskLabel(name);
      toggleLabel(id);
      setNewLabelName('');
    } catch (error) {
      toast.error(toUserErrorMessage(error));
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const createAndSelectPhase = async () => {
    if (!canCreatePhase || !onCreatePhase) return;
    const name = newPhaseName.trim();
    if (!name) return;
    setIsCreatingPhase(true);
    try {
      const id = await onCreatePhase(name);
      onPatch({ phaseId: id });
      setNewPhaseName('');
    } catch (error) {
      toast.error(toUserErrorMessage(error));
    } finally {
      setIsCreatingPhase(false);
    }
  };

  return (
    <div className="starium-form">
      <section className="starium-form-section" aria-labelledby={fid('sec-identity')}>
        <h3 id={fid('sec-identity')} className="starium-form-section-title">
          <Flag aria-hidden />
          Identité
        </h3>
        <div className="starium-form-grid starium-form-grid--2">
          <FormField label="Nom" htmlFor={fid('name')} className="starium-form-grid--span-2">
            <input
              id={fid('name')}
              className="starium-form-input"
              value={form.name}
              onChange={(e) => onPatch({ name: e.target.value })}
              required
              autoComplete="off"
              placeholder="Intitulé de la tâche"
            />
          </FormField>
          <FormField label="Description" htmlFor={fid('desc')} className="starium-form-grid--span-2">
            <textarea
              id={fid('desc')}
              className="starium-form-textarea"
              value={form.description ?? ''}
              onChange={(e) => onPatch({ description: e.target.value })}
              placeholder="Contexte, livrables, critères d’acceptation…"
            />
          </FormField>
        </div>
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-tracking')}>
        <h3 id={fid('sec-tracking')} className="starium-form-section-title">
          <ListChecks aria-hidden />
          Suivi & organisation
        </h3>
        <div className="starium-form-grid starium-form-grid--2">
          <FormField
            label="Bucket"
            htmlFor={fid('bucket')}
            hint="Colonne Kanban / Planner (défini dans les options du projet)."
            className="starium-form-grid--span-2"
          >
            <select
              id={fid('bucket')}
              className="starium-form-select"
              value={form.bucketId ?? ''}
              onChange={(e) => onPatch({ bucketId: e.target.value || null })}
            >
              <option value="">— Aucun</option>
              {bucketOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Libellé de phase" htmlFor={fid('phase')}>
            <select
              id={fid('phase')}
              className="starium-form-select"
              value={form.phaseId ?? ''}
              onChange={(e) => onPatch({ phaseId: e.target.value || null })}
            >
              <option value="">Sans libellé</option>
              {phaseOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Assigné à" htmlFor={fid('owner')}>
            <select
              id={fid('owner')}
              className="starium-form-select"
              value={form.ownerUserId ?? ''}
              onChange={(e) => onPatch({ ownerUserId: e.target.value || null })}
            >
              <option value="">— Non assigné</option>
              {assignableOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Statut" htmlFor={fid('status')}>
            <select
              id={fid('status')}
              className="starium-form-select"
              value={form.status ?? 'TODO'}
              onChange={(e) => onPatch({ status: e.target.value })}
            >
              {Object.keys(TASK_STATUS_LABEL).map((k) => (
                <option key={k} value={k}>
                  {TASK_STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Priorité" htmlFor={fid('priority')}>
            <select
              id={fid('priority')}
              className="starium-form-select"
              value={form.priority ?? 'MEDIUM'}
              onChange={(e) => onPatch({ priority: e.target.value })}
            >
              {Object.keys(TASK_PRIORITY_LABEL).map((k) => (
                <option key={k} value={k}>
                  {TASK_PRIORITY_LABEL[k]}
                </option>
              ))}
            </select>
          </FormField>

          <div className="starium-form-progress starium-form-grid--span-2">
            <div className="starium-form-progress-head">
              <label htmlFor={fid('progress')} className="starium-form-label">
                Avancement
              </label>
              <span className="starium-form-progress-value" aria-hidden>
                {progress} %
              </span>
            </div>
            <input
              id={fid('progress')}
              type="range"
              className="starium-form-range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) =>
                onPatch({
                  progress: Number.parseInt(e.target.value, 10) || 0,
                })
              }
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-valuetext={`${progress} pour cent`}
            />
          </div>
        </div>

        {canCreatePhase ? (
          <div className="starium-form-inline mt-3">
            <FormField label="Nouveau libellé de phase" htmlFor={fid('new-phase')}>
              <input
                id={fid('new-phase')}
                className="starium-form-input"
                value={newPhaseName}
                placeholder="Ex. Cadrage"
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();
                  void createAndSelectPhase();
                }}
                disabled={isCreatingPhase}
              />
            </FormField>
            <button
              type="button"
              className="starium-btn starium-btn-secondary starium-btn-sm"
              disabled={!newPhaseName.trim() || isCreatingPhase}
              onClick={() => void createAndSelectPhase()}
            >
              <Plus aria-hidden />
              Ajouter
            </button>
          </div>
        ) : null}
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-planning')}>
        <h3 id={fid('sec-planning')} className="starium-form-section-title">
          <CalendarRange aria-hidden />
          Planning
        </h3>
        <div className="starium-form-grid starium-form-grid--2">
          <FormField label="Début planifié" htmlFor={fid('planned-start')}>
            <input
              id={fid('planned-start')}
              type="date"
              className="starium-form-input"
              value={isoToDateInput(form.plannedStartDate)}
              onChange={(e) =>
                onPatch({ plannedStartDate: dateInputToIso(e.target.value) })
              }
            />
          </FormField>
          <FormField label="Fin planifiée" htmlFor={fid('planned-end')}>
            <input
              id={fid('planned-end')}
              type="date"
              className="starium-form-input"
              value={isoToDateInput(form.plannedEndDate)}
              onChange={(e) =>
                onPatch({ plannedEndDate: dateInputToIso(e.target.value) })
              }
            />
          </FormField>
        </div>
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-checklist')}>
        <h3 id={fid('sec-checklist')} className="starium-form-section-title">
          <CheckSquare aria-hidden />
          Liste de contrôle
        </h3>
        <p className="starium-form-hint mb-3">
          Synchronisée avec Microsoft Planner lors de la sync des tâches.
        </p>
        <ul className="starium-checklist">
          {(form.checklistItems ?? []).map((item, idx) => (
            <li key={item.id ?? `draft-${idx}`} className="starium-checklist-row">
              <input
                type="checkbox"
                checked={item.isChecked ?? false}
                onChange={(e) => {
                  const next = [...(form.checklistItems ?? [])];
                  next[idx] = { ...next[idx], isChecked: e.target.checked };
                  onPatch({ checklistItems: next });
                }}
                aria-label={`Élément coché : ${item.title || 'nouvel élément'}`}
              />
              <input
                className="starium-form-input min-w-0 flex-1"
                value={item.title}
                placeholder="Libellé"
                aria-label={`Libellé de l’élément ${idx + 1}`}
                onChange={(e) => {
                  const next = [...(form.checklistItems ?? [])];
                  next[idx] = { ...next[idx], title: e.target.value };
                  onPatch({ checklistItems: next });
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();

                  const items = form.checklistItems ?? [];
                  const nextTitle = items[idx]?.title ?? '';
                  (e.currentTarget as HTMLInputElement).blur();

                  if (nextTitle.trim().length > 0 && idx === items.length - 1) {
                    onPatch({
                      checklistItems: [
                        ...items,
                        {
                          title: '',
                          isChecked: false,
                          sortOrder: items.length,
                        },
                      ],
                    });
                  }
                }}
              />
              <button
                type="button"
                className="starium-form-icon-btn"
                aria-label={`Retirer l’élément ${item.title || idx + 1}`}
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
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="starium-btn starium-btn-secondary starium-btn-sm mt-3"
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
          <Plus aria-hidden />
          Ajouter un élément
        </button>
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-labels')}>
        <h3 id={fid('sec-labels')} className="starium-form-section-title">
          <Tag aria-hidden />
          Étiquettes
        </h3>

        {syncMicrosoftPlannerLabelsEnabled ? (
          <p className="starium-form-hint mb-3">
            Synchronisation Microsoft Planner active : la création des étiquettes Starium est
            désactivée.
          </p>
        ) : null}

        {selectedLabelIds.length > 0 ? (
          <div className="starium-form-tags mb-3">
            {selectedLabelIds.map((id) => {
              const opt = labelById.get(id);
              const name = opt?.label ?? id;
              const bg = resolveTaskLabelDisplayColor(
                opt?.plannerCategoryId ?? null,
                opt?.color ?? null,
              );
              const fg = pickReadableTextOnBackground(bg);
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm"
                  style={{ backgroundColor: bg, color: fg }}
                >
                  <span className="truncate" title={name}>
                    {name}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      'shrink-0 rounded-md p-0.5 hover:bg-black/10',
                      fg === '#ffffff' ? 'text-white/90' : 'text-black/70',
                    )}
                    aria-label={`Retirer l’étiquette ${name}`}
                    onClick={() => removeLabel(id)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              );
            })}
          </div>
        ) : taskLabelOptions.length > 0 ? (
          <p className="starium-form-hint mb-3">Aucune étiquette sélectionnée.</p>
        ) : null}

        <FormField label="Choisir une étiquette" htmlFor={fid('labels-picker')}>
          <Select
            value={TASK_LABEL_PICK_PLACEHOLDER}
            onValueChange={(id) => {
              if (!id || id === TASK_LABEL_PICK_PLACEHOLDER) return;
              toggleLabel(id);
            }}
            disabled={taskLabelOptions.length === 0}
          >
            <SelectTrigger
              id={fid('labels-picker')}
              className={cn(
                'starium-form-select h-[38px] w-full min-w-0 shadow-none',
                taskLabelOptions.length === 0 && 'cursor-not-allowed opacity-70',
              )}
            >
              <SelectValue placeholder="— Choisir dans la liste…">
                {taskLabelOptions.length === 0
                  ? '— Aucune étiquette disponible'
                  : '— Choisir dans la liste…'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TASK_LABEL_PICK_PLACEHOLDER}>
                <span className="text-muted-foreground">— Choisir dans la liste…</span>
              </SelectItem>
              {availableLabelOptions.map((opt) => {
                const bg = resolveTaskLabelDisplayColor(
                  opt.plannerCategoryId ?? null,
                  opt.color ?? null,
                );
                return (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span className="flex w-full min-w-0 items-center gap-2.5">
                      <span
                        className="size-3 shrink-0 rounded-full shadow-inner ring-1 ring-black/10"
                        style={{ backgroundColor: bg }}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">{opt.label}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {taskLabelOptions.length === 0 ? (
            <p className="starium-form-hint">
              {syncMicrosoftPlannerLabelsEnabled
                ? 'Les libellés viennent du plan Planner. La sync des tâches importe ces libellés s’ils manquent.'
                : 'Créez une étiquette Starium avec le champ ci-dessous pour la voir dans cette liste.'}
            </p>
          ) : availableLabelOptions.length === 0 && selectedLabelIds.length > 0 ? (
            <p className="starium-form-hint">
              Toutes les étiquettes disponibles sont sélectionnées.
            </p>
          ) : null}
        </FormField>

        {canCreateTaskLabels ? (
          <div className="starium-form-inline mt-3">
            <FormField label="Nouvelle étiquette" htmlFor={fid('new-label')}>
              <input
                id={fid('new-label')}
                className="starium-form-input"
                value={newLabelName}
                placeholder="Nom d’étiquette"
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();
                  void createAndSelectLabel();
                }}
                disabled={isCreatingLabel}
              />
            </FormField>
            <button
              type="button"
              className="starium-btn starium-btn-secondary starium-btn-sm"
              disabled={!newLabelName.trim() || isCreatingLabel}
              onClick={() => void createAndSelectLabel()}
            >
              <Plus aria-hidden />
              Ajouter
            </button>
          </div>
        ) : null}
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-deps')}>
        <h3 id={fid('sec-deps')} className="starium-form-section-title">
          <Link2 aria-hidden />
          Dépendances
        </h3>
        <div className="starium-form-grid starium-form-grid--2">
          <FormField label="Dépend de (prédécesseur)" htmlFor={fid('depends')}>
            <select
              id={fid('depends')}
              className="starium-form-select"
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
          </FormField>
          <FormField
            label="Type de dépendance"
            htmlFor={fid('dep-type')}
            hint="Lien logique avec la tâche prédécesseur (ex. fin → début)."
          >
            <select
              id={fid('dep-type')}
              className="starium-form-select"
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
          </FormField>
        </div>
      </section>
    </div>
  );
}
