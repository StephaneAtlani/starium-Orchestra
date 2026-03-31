'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_CURRENCY_SELECT_VALUE, EMPTY_SELECT_VALUE } from './budget-import-field-labels';

/** Select colonne fichier : libellé colonne affiché (pas l’ID technique). */
export function BudgetImportColSelect(props: {
  label: string;
  hint?: string;
  value: string | undefined;
  columnChoices: string[];
  onChange: (v: string) => void;
}) {
  const { label, hint, value, columnChoices, onChange } = props;
  const v = value?.trim() ? value : EMPTY_SELECT_VALUE;
  const affichage = v === EMPTY_SELECT_VALUE ? '— Aucune —' : v;
  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,280px))] sm:items-start sm:gap-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-snug">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="space-y-1.5 sm:pt-0.5">
        <Label className="sr-only">Colonne du fichier pour : {label}</Label>
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

/** Devise : option « devise par défaut » + colonnes fichier. */
export function BudgetImportCurrencyColSelect(props: {
  budgetCurrency: string;
  optionsDefaultCurrency: string | undefined;
  label: string;
  hint?: string;
  value: string | undefined;
  columnChoices: string[];
  onChange: (v: string) => void;
}) {
  const {
    budgetCurrency,
    optionsDefaultCurrency,
    label,
    hint,
    value,
    columnChoices,
    onChange,
  } = props;
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
