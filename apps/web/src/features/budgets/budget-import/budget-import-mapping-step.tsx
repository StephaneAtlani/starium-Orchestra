'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import type { BudgetEnvelope } from '../types/budget-management.types';
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_CURRENCY_SELECT_VALUE,
  EMPTY_SELECT_VALUE,
  logicalFieldLabelFr,
} from './budget-import-field-labels';
import type {
  BudgetImportMappingDto,
  BudgetImportMode,
  BudgetImportOptionsConfig,
  MappingConfig,
  MappingMatchingConfig,
} from '../types/budget-imports.types';
import type { EnvelopeImportMode } from './budget-import-mapping-validation';

const ENVELOPE_MODE_LABELS: Record<EnvelopeImportMode, string> = {
  from_file_columns: 'Colonne du fichier (code ou ID enveloppe par ligne)',
  single_envelope: 'Une seule enveloppe pour tout le fichier',
};

export interface BudgetImportMappingStepProps {
  /** En-têtes de colonnes lus dans le fichier (ordre d’analyse). */
  columns: string[];
  /** Nombre de lignes de données détectées (hors en-tête si applicable). */
  rowCount: number;
  /** Onglet Excel dont proviennent les colonnes (affichage seulement). */
  excelActiveSheetName?: string;
  budgetCurrency: string;
  envelopes: BudgetEnvelope[];
  mapping: MappingConfig;
  options: BudgetImportOptionsConfig;
  onMappingChange: (m: MappingConfig) => void;
  onOptionsChange: (o: BudgetImportOptionsConfig) => void;
  validationMessage: string | null;
  savedMappings: BudgetImportMappingDto[];
  mappingName: string;
  onMappingNameChange: (v: string) => void;
  selectedSavedId: string | null;
  onSelectSaved: (id: string | null) => void;
  isEditingSaved: boolean;
  onApplySaved: () => void;
  onEnterEditMode: () => void;
  onSaveAsNew: () => void;
  onUpdateSaved: () => void;
  onDeleteSaved: () => void;
  canMutateMappings: boolean;
  envelopeImportMode: EnvelopeImportMode;
  onEnvelopeImportModeChange: (mode: EnvelopeImportMode) => void;
}

function envelopeLabel(e: BudgetEnvelope): string {
  if (e.code?.trim() && e.name?.trim()) {
    return `${e.code} — ${e.name}`;
  }
  return e.name?.trim() || e.code?.trim() || 'Enveloppe';
}

/** Base UI Select : fournir le texte affiché explicitement (sinon la valeur technique s’affiche). */
function colSelect(
  label: string,
  hint: string | undefined,
  value: string | undefined,
  columnChoices: string[],
  onChange: (v: string) => void,
) {
  const v = value?.trim() ? value : EMPTY_SELECT_VALUE;
  const affichage = v === EMPTY_SELECT_VALUE ? '— Aucune —' : v;
  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,280px))] sm:items-start sm:gap-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-1.5 sm:pt-0.5">
        <Label className="sr-only">
          Colonne du fichier pour : {label}
        </Label>
        <Select
          value={v}
          onValueChange={(x) => onChange(!x || x === EMPTY_SELECT_VALUE ? '' : x)}
        >
          <SelectTrigger className="h-9 w-full min-w-0">
            <SelectValue>{affichage}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>— Aucune —</SelectItem>
            {columnChoices.map((c, i) => (
              <SelectItem key={`${c}-${i}`} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Select Devise : option explicite « Devise par défaut » + colonnes fichier (aucune valeur sentinelle côté API). */
function currencyColSelect(
  budgetCurrency: string,
  optionsDefaultCurrency: string | undefined,
  label: string,
  hint: string | undefined,
  value: string | undefined,
  columnChoices: string[],
  onChange: (v: string) => void,
) {
  const code = (optionsDefaultCurrency ?? budgetCurrency).trim() || 'EUR';
  const raw = value?.trim() ?? '';
  const selectValue = raw === '' ? DEFAULT_CURRENCY_SELECT_VALUE : raw;
  const affichage =
    selectValue === DEFAULT_CURRENCY_SELECT_VALUE
      ? `Devise par défaut (${code})`
      : selectValue;

  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,280px))] sm:items-start sm:gap-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-1.5 sm:pt-0.5">
        <Label className="sr-only">Colonne du fichier pour : {label}</Label>
        <Select
          value={selectValue}
          onValueChange={(x) => {
            if (!x || x === DEFAULT_CURRENCY_SELECT_VALUE) onChange('');
            else onChange(x);
          }}
        >
          <SelectTrigger className="h-9 w-full min-w-0">
            <SelectValue>{affichage}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_CURRENCY_SELECT_VALUE}>
              Devise par défaut ({code})
            </SelectItem>
            {columnChoices.map((c, i) => (
              <SelectItem key={`${c}-${i}`} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const IMPORT_MODE_LABELS: Record<BudgetImportMode, string> = {
  CREATE_ONLY: 'Création seule',
  UPSERT: 'Création ou mise à jour',
  UPDATE_ONLY: 'Mise à jour seule',
};

function decimalSeparatorLabel(sep: ',' | '.' | undefined): string {
  return sep === ',' ? 'Virgule (format français)' : 'Point';
}

export function BudgetImportMappingStep({
  columns,
  rowCount,
  excelActiveSheetName,
  budgetCurrency,
  envelopes,
  mapping,
  options,
  onMappingChange,
  onOptionsChange,
  validationMessage,
  savedMappings,
  mappingName,
  onMappingNameChange,
  selectedSavedId,
  onSelectSaved,
  isEditingSaved,
  onApplySaved,
  onEnterEditMode,
  onSaveAsNew,
  onUpdateSaved,
  onDeleteSaved,
  canMutateMappings,
  envelopeImportMode,
  onEnvelopeImportModeChange,
}: BudgetImportMappingStepProps) {
  const fields = mapping.fields ?? {};
  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  const strategy: MappingMatchingConfig['strategy'] =
    mapping.matching?.strategy ?? 'EXTERNAL_ID';

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

  const libelleMappingSauvegarde =
    selectedSavedId == null
      ? 'Aucun'
      : (savedMappings.find((m) => m.id === selectedSavedId)?.name ?? '—');

  const enveloppeParDefautValue = options.defaultEnvelopeId ?? EMPTY_SELECT_VALUE;
  const libelleEnveloppeParDefaut =
    enveloppeParDefautValue === EMPTY_SELECT_VALUE
      ? 'Aucune'
      : (() => {
          const ev = envelopes.find((e) => e.id === enveloppeParDefautValue);
          return ev ? envelopeLabel(ev) : 'Enveloppe';
        })();

  const modeImport = options.importMode ?? 'UPSERT';
  const sepDec = options.decimalSeparator ?? '.';
  const formatDateVal = options.dateFormat ?? 'DD/MM/YYYY';
  const libelleFormatDate =
    DATE_FORMAT_OPTIONS.find((o) => o.value === formatDateVal)?.labelFr ?? formatDateVal;

  return (
    <div className="space-y-6">
      {validationMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="import-file-columns-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="import-file-columns-heading" className="text-base font-semibold tracking-tight">
            Colonnes du fichier
          </h2>
          <p className="text-xs text-muted-foreground">
            {rowCount} ligne{rowCount > 1 ? 's' : ''} de données · {columns.length} colonne
            {columns.length > 1 ? 's' : ''}
          </p>
        </div>
        {excelActiveSheetName ? (
          <p className="text-sm text-muted-foreground">
            Onglet source : <span className="font-medium text-foreground">{excelActiveSheetName}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Ce sont les <strong>en-têtes</strong> lus dans votre fichier (ligne de titres). Le mapping ci-dessous
          consiste à dire, pour chaque information budgétaire, <strong>laquelle de ces colonnes</strong> la contient.
        </p>
        {columns.length === 0 ? (
          <Alert variant="destructive">
            <AlertDescription>Aucune colonne détectée : vérifiez le fichier ou la ligne d’en-têtes.</AlertDescription>
          </Alert>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Liste des en-têtes de colonnes">
            {columns.map((c, i) => (
              <li key={`${c}-${i}`}>
                <Badge variant="secondary" className="max-w-full font-normal">
                  <span className="truncate" title={c}>
                    {c}
                  </span>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-3 text-sm font-semibold">Mappings enregistrés</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label>Charger un mapping enregistré</Label>
            <Select
              value={selectedSavedId ?? EMPTY_SELECT_VALUE}
              onValueChange={(id) => onSelectSaved(id === EMPTY_SELECT_VALUE ? null : id)}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue>{libelleMappingSauvegarde}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Aucun</SelectItem>
                {savedMappings.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={onApplySaved} disabled={!selectedSavedId}>
            Appliquer
          </Button>
          {canMutateMappings ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onEnterEditMode}
                disabled={!selectedSavedId}
              >
                Modifier…
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onDeleteSaved}
                disabled={!selectedSavedId}
              >
                Supprimer
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Écriture budget requise pour modifier ou supprimer un mapping.
            </p>
          )}
        </div>
        {isEditingSaved ? (
          <p className="mt-2 text-xs text-muted-foreground">Mode édition : les changements sont enregistrés sur ce mapping.</p>
        ) : null}
      </div>

      <section className="space-y-3" aria-labelledby="import-mapping-assoc-heading">
        <div>
          <h2 id="import-mapping-assoc-heading" className="text-base font-semibold tracking-tight">
            Associer les champs budgétaires aux colonnes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pour chaque ligne ci-dessous, choisissez <strong>la colonne du fichier</strong> qui alimente le champ.
            Votre export peut mélanger logique <strong>commande</strong> (montant initial + engagé / facturé) et{' '}
            <strong>facture</strong> (montant initial + consommé) : mappez les colonnes correspondantes ; elles peuvent
            rester vides si non présentes dans le fichier.
          </p>
        </div>
        <div className="rounded-lg border border-border">
          <div className="hidden border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,280px))] sm:gap-4">
            <span>Information budgétaire (Starium)</span>
            <span>Colonne du fichier</span>
          </div>
          <div className="px-4 pb-1">
            {colSelect(
              'Montant',
              'Montant de la ligne budgétaire (souvent obligatoire pour l’import).',
              fields.amount,
              columns,
              (c) => setField('amount', c),
            )}
            {colSelect(
              'Montant alternatif',
              'Montant initial distinct du montant révisé, si le fichier en propose deux colonnes.',
              fields.initialAmount,
              columns,
              (c) => setField('initialAmount', c),
            )}
            {colSelect(
              'Montant engagé / facturé (commande)',
              'Optionnel — colonne liée aux commandes : montant engagé ou facturé (BC). Peut coexister avec une colonne « consommé » pour les factures.',
              fields.committedAmount,
              columns,
              (c) => setField('committedAmount', c),
            )}
            {colSelect(
              'Montant consommé (facture)',
              'Optionnel — colonne liée aux factures : montant consommé / réalisé. À mapper si votre fichier distingue facturation et commande.',
              fields.consumedAmount,
              columns,
              (c) => setField('consumedAmount', c),
            )}
            {colSelect(
              'Libellé de ligne',
              'Texte décrivant la ligne (libellé, intitulé, etc.).',
              fields.name,
              columns,
              (c) => setField('name', c),
            )}
            <div className="border-b border-border bg-muted/20 py-4 sm:-mx-4 sm:px-4">
              <div className="space-y-2">
                <Label htmlFor="envelope-import-mode" className="text-sm font-semibold">
                  Rattachement aux enveloppes
                </Label>
                <Select
                  value={envelopeImportMode}
                  onValueChange={(v) => {
                    if (v === 'from_file_columns' || v === 'single_envelope') {
                      onEnvelopeImportModeChange(v);
                    }
                  }}
                >
                  <SelectTrigger id="envelope-import-mode" className="w-full max-w-xl">
                    <SelectValue>{ENVELOPE_MODE_LABELS[envelopeImportMode]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from_file_columns">
                      {ENVELOPE_MODE_LABELS.from_file_columns}
                    </SelectItem>
                    <SelectItem value="single_envelope">{ENVELOPE_MODE_LABELS.single_envelope}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {envelopeImportMode === 'from_file_columns' ? (
                    <>
                      Chaque ligne est affectée à une enveloppe du budget selon une <strong>colonne</strong> du fichier
                      (code ou identifiant). Vous pouvez aussi définir une enveloppe par défaut pour les lignes sans
                      code reconnu.
                    </>
                  ) : (
                    <>
                      Toutes les lignes sont importées dans <strong>la même enveloppe</strong> (choisie dans les options
                      ci-dessous). Aucune colonne « enveloppe » du fichier n’est utilisée.
                    </>
                  )}
                </p>
              </div>
            </div>
            {envelopeImportMode === 'from_file_columns' ? (
              <>
                {colSelect(
                  'Code enveloppe (fichier)',
                  'Code ou compte côté fichier pour rattacher la ligne à une enveloppe du budget.',
                  fields.envelopeCode,
                  columns,
                  (c) => setField('envelopeCode', c),
                )}
                {colSelect(
                  'Référence enveloppe (fichier)',
                  'Identifiant d’enveloppe tel qu’exporté (si votre fichier l’utilise).',
                  fields.envelopeId,
                  columns,
                  (c) => setField('envelopeId', c),
                )}
              </>
            ) : null}
            {currencyColSelect(
              budgetCurrency,
              options.defaultCurrency,
              'Devise',
              'Colonne contenant un code devise (ISO), ou « Devise par défaut » pour appliquer le code défini dans les options ci-dessous.',
              fields.currency,
              columns,
              (c) => setField('currency', c),
            )}
            {colSelect(
              'Référence externe',
              'Clé stable pour reconnaître une ligne entre fichier et Starium (import répété).',
              fields.externalId,
              columns,
              (c) => setField('externalId', c),
            )}
            {colSelect(
              'Date',
              'Date ou période associée à la ligne, si présente.',
              fields.date,
              columns,
              (c) => setField('date', c),
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            {envelopeImportMode === 'single_envelope'
              ? 'Enveloppe cible (toutes les lignes)'
              : 'Enveloppe par défaut (lignes sans code / ID enveloppe reconnu)'}
          </Label>
          <Select
            value={enveloppeParDefautValue}
            onValueChange={(id) =>
              onOptionsChange({
                ...options,
                defaultEnvelopeId: id === EMPTY_SELECT_VALUE || !id ? undefined : id,
              })
            }
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue>{libelleEnveloppeParDefaut}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Aucune</SelectItem>
              {envelopes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {envelopeLabel(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-1.5">
          <Label>Mode d’import</Label>
          <Select
            value={modeImport}
            onValueChange={(v) =>
              onOptionsChange({ ...options, importMode: v as BudgetImportMode })
            }
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
            onValueChange={(v) =>
              onOptionsChange({ ...options, decimalSeparator: v as ',' | '.' })
            }
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
        <div className="space-y-1.5">
          <Label>Interprétation des dates (colonne « Date »)</Label>
          <Select
            value={formatDateVal}
            onValueChange={(v) =>
              onOptionsChange({ ...options, dateFormat: v ? String(v) : undefined })
            }
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
              <Label htmlFor="mapping-name">Nom du mapping</Label>
              <Input
                id="mapping-name"
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
    </div>
  );
}
