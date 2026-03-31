'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DATE_FORMAT_OPTIONS,
  logicalFieldLabelFr,
} from './budget-import-field-labels';
import { BudgetImportCurrencyColSelect } from './budget-import-column-selects';
import type {
  BudgetImportMode,
  BudgetImportOptionsConfig,
  MappingConfig,
  MappingMatchingConfig,
} from '../types/budget-imports.types';

const IMPORT_MODE_LABELS: Record<BudgetImportMode, string> = {
  CREATE_ONLY: 'Création seule',
  UPSERT: 'Création ou mise à jour',
  UPDATE_ONLY: 'Mise à jour seule',
};

function decimalSeparatorLabel(sep: ',' | '.' | undefined): string {
  return sep === ',' ? 'Virgule (format français)' : 'Point';
}

export interface BudgetImportConfigOptionsBlockProps {
  columns: string[];
  budgetCurrency: string;
  mapping: MappingConfig;
  options: BudgetImportOptionsConfig;
  onMappingChange: (m: MappingConfig) => void;
  onOptionsChange: (o: BudgetImportOptionsConfig) => void;
  mappingName: string;
  onMappingNameChange: (v: string) => void;
  isEditingSaved: boolean;
  onSaveAsNew: () => void;
  onUpdateSaved: () => void;
  canMutateMappings: boolean;
}

export function BudgetImportConfigOptionsBlock({
  columns,
  budgetCurrency,
  mapping,
  options,
  onMappingChange,
  onOptionsChange,
  mappingName,
  onMappingNameChange,
  isEditingSaved,
  onSaveAsNew,
  onUpdateSaved,
  canMutateMappings,
}: BudgetImportConfigOptionsBlockProps) {
  const fields = mapping.fields ?? {};
  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  const strategy: MappingMatchingConfig['strategy'] = mapping.matching?.strategy ?? 'EXTERNAL_ID';
  const compositeKeys = mapping.matching?.keys ?? [];
  const mappableKeys = Object.keys(fields).filter((k) => fields[k]?.trim());

  const toggleCompositeKey = (key: string, checked: boolean) => {
    const nextKeys = checked
      ? [...compositeKeys.filter((k) => k !== key), key]
      : compositeKeys.filter((k) => k !== key);
    onMappingChange({
      ...mapping,
      matching: {
        strategy: 'COMPOSITE',
        keys: nextKeys,
      },
    });
  };

  const modeImport = options.importMode ?? 'UPSERT';
  const sepDec = options.decimalSeparator ?? '.';
  const formatDateVal = options.dateFormat ?? 'DD/MM/YYYY';
  const libelleFormatDate =
    DATE_FORMAT_OPTIONS.find((o) => o.value === formatDateVal)?.labelFr ?? formatDateVal;

  return (
    <section className="space-y-6" aria-labelledby="config-options-heading">
      <h2 id="config-options-heading" className="text-base font-semibold tracking-tight">
        Options et correspondance
      </h2>
      <p className="text-sm text-muted-foreground">
        Devise, format des nombres et des dates, mode d’import, stratégie de reconnaissance des lignes.
      </p>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Devise</h3>
        <div className="space-y-4">
          <BudgetImportCurrencyColSelect
            budgetCurrency={budgetCurrency}
            optionsDefaultCurrency={options.defaultCurrency}
            label="Devise"
            hint="Colonne code devise ISO, ou devise par défaut ci-dessous."
            value={fields.currency}
            columnChoices={columns}
            onChange={(c) => setField('currency', c)}
          />
          <div className="space-y-1.5">
            <Label>Devise par défaut (code ISO, ex. EUR)</Label>
            <Input
              value={options.defaultCurrency ?? budgetCurrency}
              onChange={(e) =>
                onOptionsChange({ ...options, defaultCurrency: e.target.value.toUpperCase() || undefined })
              }
              placeholder={budgetCurrency}
              maxLength={8}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mode d’import</Label>
          <Select
            value={modeImport}
            onValueChange={(v) => onOptionsChange({ ...options, importMode: v as BudgetImportMode })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{IMPORT_MODE_LABELS[modeImport]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREATE_ONLY">Création seule</SelectItem>
              <SelectItem value="UPSERT">Création ou mise à jour</SelectItem>
              <SelectItem value="UPDATE_ONLY">Mise à jour seule</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Séparateur décimal des nombres</Label>
          <Select
            value={sepDec}
            onValueChange={(v) => onOptionsChange({ ...options, decimalSeparator: v as ',' | '.' })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{decimalSeparatorLabel(sepDec)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=".">Point</SelectItem>
              <SelectItem value=",">Virgule (format français)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Interprétation des dates (colonne « Date »)</Label>
          <Select
            value={formatDateVal}
            onValueChange={(v) => onOptionsChange({ ...options, dateFormat: v ? String(v) : undefined })}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{libelleFormatDate}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.labelFr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <Label className="text-sm font-semibold">Correspondance des lignes</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={strategy === 'EXTERNAL_ID' ? 'default' : 'outline'}
            className={cn(strategy === 'EXTERNAL_ID' && 'shadow-sm')}
            onClick={() => onMappingChange({ ...mapping, matching: { strategy: 'EXTERNAL_ID' } })}
          >
            Référence unique (fichier)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={strategy === 'COMPOSITE' ? 'default' : 'outline'}
            onClick={() =>
              onMappingChange({
                ...mapping,
                matching: {
                  strategy: 'COMPOSITE',
                  keys: compositeKeys.length ? compositeKeys : [],
                },
              })
            }
          >
            Clé composite
          </Button>
        </div>
        {strategy === 'COMPOSITE' ? (
          <div className="space-y-2 pl-1">
            <p className="text-xs text-muted-foreground">
              Cochez les champs logiques qui composent la clé (déjà mappés à une colonne).
            </p>
            <div className="flex flex-wrap gap-3">
              {mappableKeys.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border border-input"
                    checked={compositeKeys.includes(k)}
                    onChange={(e) => toggleCompositeKey(k, e.target.checked)}
                  />
                  {logicalFieldLabelFr(k)}
                </label>
              ))}
            </div>
            {mappableKeys.length === 0 ? (
              <p className="text-xs text-amber-600">Mappez d’abord au moins une colonne.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {canMutateMappings ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <Label className="text-sm font-semibold">Enregistrer ce mapping</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="mapping-name-block">Nom du mapping</Label>
              <Input
                id="mapping-name-block"
                value={mappingName}
                onChange={(e) => onMappingNameChange(e.target.value)}
                placeholder="ex. Import mensuel OPEX"
              />
            </div>
            {isEditingSaved ? (
              <Button type="button" onClick={onUpdateSaved} disabled={!mappingName.trim()}>
                Enregistrer les modifications
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={onSaveAsNew} disabled={!mappingName.trim()}>
                Enregistrer sous…
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Droits d’écriture budget requis pour enregistrer un mapping réutilisable.
        </p>
      )}
    </section>
  );
}
