'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type StrategicVisionFormValues = {
  title: string;
  statement: string;
  horizonLabel: string;
  isActive: boolean;
};

export function StrategicVisionFormFields({
  values,
  onChange,
  activeCheckboxLabel = 'Vision active',
  idPrefix = 'sv-vision',
}: {
  values: StrategicVisionFormValues;
  onChange: (patch: Partial<StrategicVisionFormValues>) => void;
  activeCheckboxLabel?: string;
  idPrefix?: string;
}) {
  const titleId = `${idPrefix}-title`;
  const statementId = `${idPrefix}-statement`;
  const horizonId = `${idPrefix}-horizon`;
  const activeId = useId();

  return (
    <div className="starium-form">
      <h3 className="starium-modal-seg-title">Informations</h3>

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={titleId}>
          Titre <span className="text-destructive">*</span>
        </label>
        <input
          id={titleId}
          className="starium-form-input"
          value={values.title}
          placeholder="Ex. Vision 2026-2028"
          autoComplete="off"
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={statementId}>
          Énoncé <span className="text-destructive">*</span>
        </label>
        <textarea
          id={statementId}
          className="starium-form-textarea min-h-[100px]"
          value={values.statement}
          placeholder="Formulez la vision en une phrase ou un court paragraphe…"
          onChange={(event) => onChange({ statement: event.target.value })}
        />
        <p className="starium-form-hint">
          Utilisez <strong>**texte**</strong> pour mettre en avant un passage clé à l&apos;affichage.
        </p>
      </div>

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={horizonId}>
          Horizon <span className="text-destructive">*</span>
        </label>
        <input
          id={horizonId}
          className="starium-form-input"
          value={values.horizonLabel}
          placeholder="Ex. 2026-2028"
          autoComplete="off"
          onChange={(event) => onChange({ horizonLabel: event.target.value })}
        />
      </div>

      <h3 className="starium-modal-seg-title">Statut</h3>

      <div
        className={cn(
          'flex items-start gap-2.5 rounded-[var(--radius-md,10px)] border px-3 py-2.5 transition-colors',
          values.isActive
            ? 'border-[color-mix(in_srgb,var(--brand-gold)_35%,var(--border))] bg-[color-mix(in_srgb,var(--brand-gold)_8%,var(--card))]'
            : 'border-border/70 bg-card',
        )}
      >
        <Checkbox
          id={activeId}
          checked={values.isActive}
          onCheckedChange={(checked) => onChange({ isActive: checked === true })}
          className="mt-0.5"
          aria-describedby={`${activeId}-hint`}
        />
        <label htmlFor={activeId} className="min-w-0 flex-1 cursor-pointer">
          <span className="text-sm font-semibold text-foreground">{activeCheckboxLabel}</span>
          <p id={`${activeId}-hint`} className="starium-form-hint mt-1">
            Une seule vision peut être en production à la fois pour ce client.
          </p>
        </label>
      </div>
    </div>
  );
}

export function isStrategicVisionFormSubmittable(values: StrategicVisionFormValues): boolean {
  return (
    values.title.trim().length > 0 &&
    values.statement.trim().length > 0 &&
    values.horizonLabel.trim().length > 0
  );
}
