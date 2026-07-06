'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { MILESTONE_STATUS_LABEL } from '../constants/project-enum-labels';
import type { CreateProjectMilestonePayload } from '../api/projects.api';
import { CalendarRange, Flag, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

function FormField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
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

export type MilestoneFormDialogFieldsProps = {
  form: CreateProjectMilestonePayload;
  onPatch: (patch: Partial<CreateProjectMilestonePayload>) => void;
  phaseOptions: { id: string; name: string; sortOrder?: number }[];
  milestoneLabelOptions: { id: string; label: string }[];
  canCreateMilestoneLabels: boolean;
  onCreateMilestoneLabel?: (name: string) => Promise<string>;
  /** Préfixe des `id` HTML (ex. `gantt-ms`, `ms`). */
  fieldIdPrefix: string;
};

export function MilestoneFormDialogFields({
  form,
  onPatch,
  phaseOptions,
  milestoneLabelOptions,
  canCreateMilestoneLabels,
  onCreateMilestoneLabel,
  fieldIdPrefix,
}: MilestoneFormDialogFieldsProps) {
  const fid = (suffix: string) => `${fieldIdPrefix}-${suffix}`;

  const selectedLabelIds = useMemo(
    () => form.milestoneLabelIds ?? [],
    [form.milestoneLabelIds],
  );
  const [newLabelName, setNewLabelName] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [labelPickerValue, setLabelPickerValue] = useState('');

  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of milestoneLabelOptions) m.set(o.id, o.label);
    return m;
  }, [milestoneLabelOptions]);

  const availableLabelOptions = useMemo(
    () => milestoneLabelOptions.filter((o) => !selectedLabelIds.includes(o.id)),
    [milestoneLabelOptions, selectedLabelIds],
  );

  const toggleLabel = (labelId: string) => {
    const has = selectedLabelIds.includes(labelId);
    const next = has
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    onPatch({ milestoneLabelIds: next });
  };

  const removeLabel = (labelId: string) => {
    onPatch({
      milestoneLabelIds: selectedLabelIds.filter((id) => id !== labelId),
    });
  };

  const createAndSelectLabel = async () => {
    if (!canCreateMilestoneLabels || !onCreateMilestoneLabel) return;
    const name = newLabelName.trim();
    if (!name) return;
    setIsCreatingLabel(true);
    try {
      const id = await onCreateMilestoneLabel(name);
      toggleLabel(id);
      setNewLabelName('');
    } finally {
      setIsCreatingLabel(false);
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
              placeholder="Intitulé du jalon"
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor={fid('desc')}
            className="starium-form-grid--span-2"
          >
            <textarea
              id={fid('desc')}
              className="starium-form-textarea"
              value={form.description ?? ''}
              onChange={(e) => onPatch({ description: e.target.value })}
              placeholder="Objectif, critères d’atteinte, contexte…"
            />
          </FormField>
        </div>
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-planning')}>
        <h3 id={fid('sec-planning')} className="starium-form-section-title">
          <CalendarRange aria-hidden />
          Dates & statut
        </h3>
        <div className="starium-form-grid starium-form-grid--2">
          <FormField label="Date cible" htmlFor={fid('target')}>
            <input
              id={fid('target')}
              type="date"
              className="starium-form-input"
              value={isoToDateInput(form.targetDate)}
              onChange={(e) =>
                onPatch({
                  targetDate: dateInputToIso(e.target.value) ?? form.targetDate,
                })
              }
              required
            />
          </FormField>
          <FormField label="Statut" htmlFor={fid('status')}>
            <select
              id={fid('status')}
              className="starium-form-select"
              value={form.status ?? 'PLANNED'}
              onChange={(e) => onPatch({ status: e.target.value })}
            >
              {Object.keys(MILESTONE_STATUS_LABEL).map((k) => (
                <option key={k} value={k}>
                  {MILESTONE_STATUS_LABEL[k]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Libellé de phase"
            htmlFor={fid('phase')}
            className="starium-form-grid--span-2"
          >
            <select
              id={fid('phase')}
              className="starium-form-select"
              value={form.phaseId ?? ''}
              onChange={(e) => onPatch({ phaseId: e.target.value || null })}
            >
              <option value="">Sans libellé de phase</option>
              {phaseOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Date d’atteinte"
            htmlFor={fid('achieved')}
            hint="Optionnel — renseigner lorsque le jalon est atteint."
            className="starium-form-grid--span-2"
          >
            <input
              id={fid('achieved')}
              type="date"
              className="starium-form-input"
              value={isoToDateInput(form.achievedDate)}
              onChange={(e) =>
                onPatch({
                  achievedDate: e.target.value ? dateInputToIso(e.target.value) : undefined,
                })
              }
            />
          </FormField>
        </div>
      </section>

      <section className="starium-form-section" aria-labelledby={fid('sec-labels')}>
        <h3 id={fid('sec-labels')} className="starium-form-section-title">
          <Tag aria-hidden />
          Étiquettes
        </h3>

        {milestoneLabelOptions.length === 0 ? (
          <p className="starium-form-hint">Aucune étiquette pour l’instant.</p>
        ) : (
          <div className="starium-form-grid">
            {selectedLabelIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedLabelIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                  >
                    <span className="truncate" title={labelById.get(id) ?? id}>
                      {labelById.get(id) ?? id}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Retirer l’étiquette ${labelById.get(id) ?? id}`}
                      onClick={() => removeLabel(id)}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="starium-form-hint">Aucune étiquette sélectionnée.</p>
            )}

            {availableLabelOptions.length > 0 ? (
              <FormField label="Ajouter une étiquette" htmlFor={fid('labels-picker')}>
                <select
                  id={fid('labels-picker')}
                  className="starium-form-select"
                  value={labelPickerValue}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    toggleLabel(id);
                    setLabelPickerValue('');
                  }}
                >
                  <option value="">— Choisir dans la liste…</option>
                  {availableLabelOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : selectedLabelIds.length > 0 && milestoneLabelOptions.length > 0 ? (
              <p className="starium-form-hint">
                Toutes les étiquettes disponibles sont sélectionnées.
              </p>
            ) : null}
          </div>
        )}

        {canCreateMilestoneLabels ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
            <FormField label="Nouvelle étiquette" htmlFor={fid('new-label')} className="min-w-[12rem] flex-1">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!newLabelName.trim() || isCreatingLabel}
              onClick={() => void createAndSelectLabel()}
            >
              Ajouter
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
