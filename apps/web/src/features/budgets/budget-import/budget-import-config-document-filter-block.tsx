'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BudgetImportColSelect } from './budget-import-column-selects';
import type { DocumentKindFilterConfig, MappingConfig } from '../types/budget-imports.types';

export interface BudgetImportConfigDocumentFilterBlockProps {
  columns: string[];
  mapping: MappingConfig;
  onMappingChange: (m: MappingConfig) => void;
  /** Affiché quand commandes et/ou factures sont activées. */
  enabled: boolean;
}

export function BudgetImportConfigDocumentFilterBlock({
  columns,
  mapping,
  onMappingChange,
  enabled,
}: BudgetImportConfigDocumentFilterBlockProps) {
  const filter = mapping.documentKindFilter;
  const active = !!(filter?.column?.trim());

  const patchFilter = (patch: Partial<DocumentKindFilterConfig> | null) => {
    if (patch === null) {
      const next = { ...mapping };
      delete next.documentKindFilter;
      onMappingChange(next);
      return;
    }
    onMappingChange({
      ...mapping,
      documentKindFilter: {
        column: filter?.column ?? '',
        orderPrefix: filter?.orderPrefix ?? 'CD',
        invoicePrefix: filter?.invoicePrefix ?? 'FA',
        amountColumn: filter?.amountColumn,
        ...patch,
      },
    });
  };

  if (!enabled) return null;

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
      aria-labelledby="config-document-filter-heading"
    >
      <h2 id="config-document-filter-heading" className="text-base font-semibold tracking-tight">
        Filtre commande / facture
      </h2>
      <p className="text-sm text-muted-foreground">
        Si la même colonne mélange des références du type{' '}
        <span className="font-mono text-xs">CD 0000188999</span> (commande) et{' '}
        <span className="font-mono text-xs">FA 0000302487</span> (facture), activez ce filtre pour
        aiguiller le montant vers l’engagé ou le consommé.
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
        <Switch
          aria-label="Activer le filtre type document"
          checked={active}
          onCheckedChange={(on) => {
            if (!on) {
              patchFilter(null);
              return;
            }
            patchFilter({
              column: filter?.column || columns[0] || '',
              orderPrefix: 'CD',
              invoicePrefix: 'FA',
              amountColumn: filter?.amountColumn || mapping.fields?.amount,
            });
          }}
        />
        <span className="text-sm">Distinguer CD / FA dans une même colonne</span>
      </div>

      {active ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-border">
            <div className="px-4 pb-1 pt-2">
              <BudgetImportColSelect
                label="Colonne type / référence document"
                hint="Valeurs du type « CD … » ou « FA … »."
                value={filter?.column}
                columnChoices={columns}
                onChange={(c) => patchFilter({ column: c })}
              />
              <BudgetImportColSelect
                label="Colonne montant partagé"
                hint="Montant aiguillé vers commande (CD) ou facture (FA). Souvent la même que « Montant »."
                value={filter?.amountColumn}
                columnChoices={columns}
                onChange={(c) =>
                  patchFilter({ amountColumn: c || undefined })
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-filter-order-prefix">Préfixe commande</Label>
              <Input
                id="doc-filter-order-prefix"
                value={filter?.orderPrefix ?? 'CD'}
                onChange={(e) => patchFilter({ orderPrefix: e.target.value || 'CD' })}
                placeholder="CD"
                className="min-h-11 font-mono sm:min-h-9"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-filter-invoice-prefix">Préfixe facture</Label>
              <Input
                id="doc-filter-invoice-prefix"
                value={filter?.invoicePrefix ?? 'FA'}
                onChange={(e) => patchFilter({ invoicePrefix: e.target.value || 'FA' })}
                placeholder="FA"
                className="min-h-11 font-mono sm:min-h-9"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
