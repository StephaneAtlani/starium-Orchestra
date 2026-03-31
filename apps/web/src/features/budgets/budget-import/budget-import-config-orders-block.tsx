'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { BudgetImportColSelect } from './budget-import-column-selects';
import type { MappingConfig } from '../types/budget-imports.types';

export interface BudgetImportConfigOrdersBlockProps {
  columns: string[];
  mapping: MappingConfig;
  onMappingChange: (m: MappingConfig) => void;
  ordersSectionEnabled: boolean;
  onOrdersSectionEnabledChange: (v: boolean) => void;
}

export function BudgetImportConfigOrdersBlock({
  columns,
  mapping,
  onMappingChange,
  ordersSectionEnabled,
  onOrdersSectionEnabledChange,
}: BudgetImportConfigOrdersBlockProps) {
  const fields = mapping.fields ?? {};
  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="config-orders-heading">
      <h2 id="config-orders-heading" className="text-base font-semibold tracking-tight">
        Commandes
      </h2>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
        <Switch
          aria-label="Activer les données commande"
          checked={ordersSectionEnabled}
          onCheckedChange={onOrdersSectionEnabledChange}
        />
        <span className="text-sm">Mon fichier contient des données commande</span>
      </div>

      {ordersSectionEnabled ? (
        <>
          <p className="text-xs text-muted-foreground">
            Les colonnes ci-dessous alimentent les mêmes champs que le reste du mapping (pas de second état pour les
            montants partagés avec la section facture).
          </p>
          <div className="rounded-lg border border-border">
            <div className="px-4 pb-1 pt-2">
              <BudgetImportColSelect
                label="Montant initial commande"
                hint="Préférez « montant initial » ; sinon « montant de ligne » si une seule colonne."
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
                label="Montant engagé / facturé (commande)"
                hint="Obligatoire si la section est activée."
                value={fields.committedAmount}
                columnChoices={columns}
                onChange={(c) => setField('committedAmount', c)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Date : utilisez la colonne définie à l’étape « Ligne budgétaire » (une seule colonne date dans le fichier).
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Activez l’option pour mapper les colonnes liées aux commandes.</p>
      )}
    </section>
  );
}
