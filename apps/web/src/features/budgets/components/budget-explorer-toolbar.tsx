'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaxDisplayModeToggle } from '@/components/finance/tax-display-mode-toggle';
import type { BudgetExplorerFilters } from '@/features/budgets/types/budget-explorer.types';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';

const ENVELOPE_TYPE_LABEL: Record<string, string> = {
  __all__: 'Tous les types',
  RUN: 'RUN',
  BUILD: 'BUILD',
  TRANSVERSE: 'TRANSVERSE',
};

const EXPENSE_TYPE_LABEL: Record<string, string> = {
  __all__: 'Tous',
  OPEX: 'OPEX',
  CAPEX: 'CAPEX',
};

export interface BudgetExplorerToolbarProps {
  filters: BudgetExplorerFilters;
  setFilters: React.Dispatch<React.SetStateAction<BudgetExplorerFilters>>;
  taxDisplayMode: TaxDisplayMode;
  setTaxDisplayMode: (mode: TaxDisplayMode) => void;
  isTaxLoading?: boolean;
}

export function BudgetExplorerToolbar({
  filters,
  setFilters,
  taxDisplayMode,
  setTaxDisplayMode,
  isTaxLoading,
}: BudgetExplorerToolbarProps) {
  const envelopeKey = filters.envelopeType ?? '__all__';
  const expenseKey = filters.expenseType ?? '__all__';

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher (nom, code)…"
          value={filters.search ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value || undefined }))
          }
          className="min-w-[min(100%,12rem)] max-w-xs flex-1 sm:flex-none"
          data-testid="explorer-search"
          aria-label="Rechercher dans l’explorateur"
        />
        <Select
          value={envelopeKey}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              envelopeType: v === '__all__' || !v ? undefined : v,
            }))
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-[9.5rem] max-w-full sm:w-[150px]"
            data-testid="explorer-envelope-type"
            aria-label="Filtrer par type d’enveloppe"
          >
            <SelectValue>
              {ENVELOPE_TYPE_LABEL[envelopeKey] ?? envelopeKey}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les types</SelectItem>
            <SelectItem value="RUN">RUN</SelectItem>
            <SelectItem value="BUILD">BUILD</SelectItem>
            <SelectItem value="TRANSVERSE">TRANSVERSE</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={expenseKey}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              expenseType: v === '__all__' || !v ? undefined : v,
            }))
          }
        >
          <SelectTrigger
            size="sm"
            className="min-w-[8.5rem] max-w-full sm:w-[130px]"
            data-testid="explorer-expense-type"
            aria-label="Filtrer par OPEX ou CAPEX"
          >
            <SelectValue>
              {EXPENSE_TYPE_LABEL[expenseKey] ?? expenseKey}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous</SelectItem>
            <SelectItem value="OPEX">OPEX</SelectItem>
            <SelectItem value="CAPEX">CAPEX</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex shrink-0 items-center sm:border-l sm:border-border sm:pl-4"
        data-testid="explorer-toolbar-tax"
      >
        <TaxDisplayModeToggle
          taxDisplayMode={taxDisplayMode}
          setTaxDisplayMode={setTaxDisplayMode}
          isLoading={isTaxLoading}
        />
      </div>
    </div>
  );
}
