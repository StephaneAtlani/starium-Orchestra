'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { BudgetImportColSelect } from './budget-import-column-selects';
import type { MappingConfig } from '../types/budget-imports.types';

export interface BudgetImportConfigInvoicesBlockProps {
  columns: string[];
  mapping: MappingConfig;
  onMappingChange: (m: MappingConfig) => void;
  invoicesSectionEnabled: boolean;
  onInvoicesSectionEnabledChange: (v: boolean) => void;
}

export function BudgetImportConfigInvoicesBlock({
  columns,
  mapping,
  onMappingChange,
  invoicesSectionEnabled,
  onInvoicesSectionEnabledChange,
}: BudgetImportConfigInvoicesBlockProps) {
  const fields = mapping.fields ?? {};
  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="config-invoices-heading">
      <h2 id="config-invoices-heading" className="text-base font-semibold tracking-tight">
        Factures
      </h2>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
        <Switch
          aria-label="Activer les données facture"
          checked={invoicesSectionEnabled}
          onCheckedChange={onInvoicesSectionEnabledChange}
        />
        <span className="text-sm">Mon fichier contient des données facture</span>
      </div>

      {invoicesSectionEnabled ? (
        <>
          <p className="text-xs text-muted-foreground">
            Les colonnes ci-dessous utilisent les mêmes champs « montant initial » et « montant de ligne » que la
            section commande (une seule valeur dans le mapping).
          </p>
          <div className="rounded-lg border border-border">
            <div className="px-4 pb-1 pt-2">
              <BudgetImportColSelect
                label="Montant initial facture"
                value={fields.initialAmount}
                columnChoices={columns}
                onChange={(c) => setField('initialAmount', c)}
              />
              <BudgetImportColSelect
                label="Montant de ligne (si pas de montant initial distinct)"
                value={fields.amount}
                columnChoices={columns}
                onChange={(c) => setField('amount', c)}
              />
              <BudgetImportColSelect
                label="Montant consommé"
                hint="Obligatoire si la section est activée."
                value={fields.consumedAmount}
                columnChoices={columns}
                onChange={(c) => setField('consumedAmount', c)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Date : utilisez la colonne définie à l’étape « Ligne budgétaire » (une seule colonne date).
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Activez l’option pour mapper les colonnes liées aux factures.</p>
      )}
    </section>
  );
}
