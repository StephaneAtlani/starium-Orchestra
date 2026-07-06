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
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
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

/** RFC-FE-MOB-003 Lot 3 : FilterBar partiel — table explorer conserve le scroll horizontal. */
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
    <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <FilterBar
        aria-label="Filtres explorateur budget"
        className="flex-1"
        desktopColumns={3}
      >
        <FilterBarField id="explorer-search" label="Recherche">
          {({ controlId }) => (
            <Input
              id={controlId}
              placeholder="Rechercher (nom, code)…"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value || undefined }))
              }
              className="w-full"
              data-testid="explorer-search"
            />
          )}
        </FilterBarField>
        <FilterBarField id="explorer-envelope-type" label="Type d'enveloppe">
          {({ controlId, labelId }) => (
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
                id={controlId}
                aria-labelledby={labelId}
                className="w-full"
                data-testid="explorer-envelope-type"
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
          )}
        </FilterBarField>
        <FilterBarField id="explorer-expense-type" label="OPEX / CAPEX">
          {({ controlId, labelId }) => (
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
                id={controlId}
                aria-labelledby={labelId}
                className="w-full"
                data-testid="explorer-expense-type"
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
          )}
        </FilterBarField>
      </FilterBar>

      <div
        className="flex shrink-0 items-center lg:border-l lg:border-border lg:pl-4"
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
