'use client';

import { useId } from 'react';
import { suggestStrategicAxisIconKeyFromTitle } from '../lib/strategic-axis-icon-suggest-from-title';
import {
  isStrategicAxisIconKey,
  STRATEGIC_AXIS_COLOR_OPTIONS,
  STRATEGIC_AXIS_ICONS,
  STRATEGIC_AXIS_ICON_OPTIONS,
  type StrategicAxisIconColor,
  type StrategicAxisIconKey,
  strategicAxisIconColorClass,
} from './strategic-axis-icons';

export type StrategicAxisFormValues = {
  logo: StrategicAxisIconKey | '';
  color: StrategicAxisIconColor;
  name: string;
  description: string;
};

export function StrategicAxisFormFields({
  values,
  onChange,
  visionTitle,
  idPrefix = 'sv-axis',
}: {
  values: StrategicAxisFormValues;
  onChange: (patch: Partial<StrategicAxisFormValues>) => void;
  visionTitle?: string | null;
  idPrefix?: string;
}) {
  const iconId = `${idPrefix}-icon`;
  const colorId = `${idPrefix}-color`;
  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;
  const visionId = useId();

  const previewIconKey =
    values.logo || suggestStrategicAxisIconKeyFromTitle(values.name);

  return (
    <div className="starium-form">
      <h3 className="starium-modal-seg-title">Informations</h3>

      {visionTitle !== undefined ? (
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor={visionId}>
            Vision active
          </label>
          <input
            id={visionId}
            className="starium-form-input"
            value={visionTitle ?? 'Vision non définie'}
            readOnly
          />
        </div>
      ) : null}

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={iconId}>
          Icône
        </label>
        <select
          id={iconId}
          className="starium-form-select"
          value={values.logo}
          onChange={(event) =>
            onChange({ logo: event.target.value as StrategicAxisIconKey | '' })
          }
        >
          <option value="">Aucune icône</option>
          {STRATEGIC_AXIS_ICON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {previewIconKey && isStrategicAxisIconKey(previewIconKey) ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {(() => {
            const Icon = STRATEGIC_AXIS_ICONS[previewIconKey];
            return (
              <Icon
                className={`size-4 shrink-0 ${strategicAxisIconColorClass(values.color)}${values.logo ? '' : ' opacity-80'}`}
                aria-hidden
              />
            );
          })()}
          <span>
            {values.logo
              ? 'Aperçu de l’icône sélectionnée'
              : 'Suggestion selon le titre — choisissez une icône pour l’enregistrer'}
          </span>
        </div>
      ) : null}

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={colorId}>
          Couleur de l’icône
        </label>
        <select
          id={colorId}
          className="starium-form-select"
          value={values.color}
          onChange={(event) =>
            onChange({ color: event.target.value as StrategicAxisIconColor })
          }
        >
          {STRATEGIC_AXIS_COLOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={nameId}>
          Nom <span className="text-destructive">*</span>
        </label>
        <input
          id={nameId}
          className="starium-form-input"
          value={values.name}
          placeholder="Ex. Performance opérationnelle"
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>

      <div className="starium-form-field">
        <label className="starium-form-label" htmlFor={descriptionId}>
          Description
        </label>
        <textarea
          id={descriptionId}
          className="starium-form-textarea min-h-[100px]"
          value={values.description}
          placeholder="Objectif porté par cet axe…"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </div>
    </div>
  );
}

export function isStrategicAxisFormSubmittable(values: StrategicAxisFormValues): boolean {
  return values.name.trim().length > 0;
}
