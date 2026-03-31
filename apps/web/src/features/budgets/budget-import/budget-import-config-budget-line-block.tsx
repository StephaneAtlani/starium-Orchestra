'use client';

import React from 'react';
import { BudgetImportColSelect } from './budget-import-column-selects';
import type { MappingConfig } from '../types/budget-imports.types';

export interface BudgetImportConfigBudgetLineBlockProps {
  columns: string[];
  mapping: MappingConfig;
  onMappingChange: (m: MappingConfig) => void;
  /** Si les deux sections métier sont off, proposer les montants généraux ici. */
  showGeneralAmounts: boolean;
}

export function BudgetImportConfigBudgetLineBlock({
  columns,
  mapping,
  onMappingChange,
  showGeneralAmounts,
}: BudgetImportConfigBudgetLineBlockProps) {
  const fields = mapping.fields ?? {};
  const setField = (key: string, column: string) => {
    const next = { ...fields, [key]: column };
    if (!column) delete next[key];
    onMappingChange({ ...mapping, fields: next });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm" aria-labelledby="config-budget-line-heading">
      <h2 id="config-budget-line-heading" className="text-base font-semibold tracking-tight">
        Ligne budgétaire
      </h2>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Question principale :</strong> quelle colonne définit la ligne budgétaire ?
      </p>

      <div className="rounded-lg border border-border">
        <div className="px-4 pb-1 pt-2">
          <BudgetImportColSelect
            label="Libellé de ligne"
            hint="Texte décrivant la ligne (obligatoire : libellé ou second libellé ci-dessous)."
            value={fields.name}
            columnChoices={columns}
            onChange={(c) => setField('name', c)}
          />
          <BudgetImportColSelect
            label="Second libellé (optionnel)"
            hint="Si le fichier distingue deux libellés, mappez la colonne ici lorsque le libellé principal est vide."
            value={(fields as Record<string, string>).label}
            columnChoices={columns}
            onChange={(c) => setField('label', c)}
          />
          {showGeneralAmounts ? (
            <>
              <BudgetImportColSelect
                label="Montant de ligne"
                hint="Montant principal de la ligne lorsque vous n’utilisez pas les sections commande / facture."
                value={fields.amount}
                columnChoices={columns}
                onChange={(c) => setField('amount', c)}
              />
              <BudgetImportColSelect
                label="Montant initial / alternatif"
                hint="Montant initial distinct si le fichier en propose une colonne dédiée."
                value={fields.initialAmount}
                columnChoices={columns}
                onChange={(c) => setField('initialAmount', c)}
              />
            </>
          ) : null}
          <BudgetImportColSelect
            label="Référence externe (optionnel)"
            hint="Clé stable pour reconnaître une ligne entre fichier et Starium (import répété)."
            value={fields.externalId}
            columnChoices={columns}
            onChange={(c) => setField('externalId', c)}
          />
          <BudgetImportColSelect
            label="Date (optionnel)"
            hint="Une seule colonne date pour la ligne ; partagée avec les sections commande / facture si activées."
            value={fields.date}
            columnChoices={columns}
            onChange={(c) => setField('date', c)}
          />
        </div>
      </div>
    </section>
  );
}
