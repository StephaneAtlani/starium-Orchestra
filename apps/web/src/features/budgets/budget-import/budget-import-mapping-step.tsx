'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetEnvelope } from '../types/budget-management.types';
import { EMPTY_SELECT_VALUE } from './budget-import-field-labels';
import type {
  BudgetImportMappingDto,
  BudgetImportOptionsConfig,
  MappingConfig,
} from '../types/budget-imports.types';
import type { BudgetImportConfigBlockId } from './budget-import-config-types';
import {
  BUDGET_IMPORT_CONFIG_BLOCK_ORDER,
  budgetImportConfigBlockIndex,
} from './budget-import-config-types';
import type { EnvelopeImportMode } from './budget-import-mapping-validation';
import { BudgetImportConfigFileSheetBlock } from './budget-import-config-file-sheet-block';
import { BudgetImportConfigEnvelopeBlock } from './budget-import-config-envelope-block';
import { BudgetImportConfigBudgetLineBlock } from './budget-import-config-budget-line-block';
import { BudgetImportConfigOrdersBlock } from './budget-import-config-orders-block';
import { BudgetImportConfigInvoicesBlock } from './budget-import-config-invoices-block';
import { BudgetImportConfigOptionsBlock } from './budget-import-config-options-block';
import type { AnalyzeResult } from '../types/budget-imports.types';

const BLOCK_LABELS: Record<BudgetImportConfigBlockId, string> = {
  file_sheet: 'Fichier et feuille',
  envelope: 'Enveloppe',
  budget_line: 'Ligne budgétaire',
  orders: 'Commandes',
  invoices: 'Factures',
  options: 'Options',
};

export interface BudgetImportMappingStepProps {
  configBlock: BudgetImportConfigBlockId;
  analyzeResult: AnalyzeResult;
  excelSheetValue: string | undefined;
  sheetChangeLoading: boolean;
  sheetChangeError: string | null;
  onExcelSheetChange: (sheetName: string) => void;
  onChangeFile: () => void;
  columns: string[];
  budgetCurrency: string;
  envelopes: BudgetEnvelope[];
  mapping: MappingConfig;
  options: BudgetImportOptionsConfig;
  onMappingChange: (m: MappingConfig) => void;
  onOptionsChange: (o: BudgetImportOptionsConfig) => void;
  validationMessage: string | null;
  validationBlock: BudgetImportConfigBlockId | null;
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
  onCreateEnvelope: (input: {
    name: string;
    code?: string;
    description?: string;
    type: string;
  }) => Promise<BudgetEnvelope>;
  ordersSectionEnabled: boolean;
  onOrdersSectionEnabledChange: (v: boolean) => void;
  invoicesSectionEnabled: boolean;
  onInvoicesSectionEnabledChange: (v: boolean) => void;
}

export function BudgetImportMappingStep({
  configBlock,
  analyzeResult,
  excelSheetValue,
  sheetChangeLoading,
  sheetChangeError,
  onExcelSheetChange,
  onChangeFile,
  columns,
  budgetCurrency,
  envelopes,
  mapping,
  options,
  onMappingChange,
  onOptionsChange,
  validationMessage,
  validationBlock,
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
  onCreateEnvelope,
  ordersSectionEnabled,
  onOrdersSectionEnabledChange,
  invoicesSectionEnabled,
  onInvoicesSectionEnabledChange,
}: BudgetImportMappingStepProps) {
  const libelleMappingSauvegarde =
    selectedSavedId == null
      ? 'Aucun'
      : (savedMappings.find((m) => m.id === selectedSavedId)?.name ?? '—');

  const idx = budgetImportConfigBlockIndex(configBlock);
  const total = BUDGET_IMPORT_CONFIG_BLOCK_ORDER.length;
  const showGeneralAmounts = !ordersSectionEnabled && !invoicesSectionEnabled;

  const showValidationHere = validationMessage && (!validationBlock || validationBlock === configBlock);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="mb-3 text-sm font-semibold">Reprendre un mapping</h3>
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
              <Button type="button" variant="outline" onClick={onEnterEditMode} disabled={!selectedSavedId}>
                Modifier…
              </Button>
              <Button type="button" variant="destructive" onClick={onDeleteSaved} disabled={!selectedSavedId}>
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
          <p className="mt-2 text-xs text-muted-foreground">
            Mode édition : les changements sont enregistrés sur ce mapping.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Étape {idx + 1} / {total} — {BLOCK_LABELS[configBlock]}
        </span>
      </div>

      {showValidationHere && validationMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}

      {configBlock === 'file_sheet' ? (
        <BudgetImportConfigFileSheetBlock
          analyzeResult={analyzeResult}
          excelSheetValue={excelSheetValue}
          sheetChangeLoading={sheetChangeLoading}
          sheetChangeError={sheetChangeError}
          onExcelSheetChange={onExcelSheetChange}
          onChangeFile={onChangeFile}
        />
      ) : null}

      {configBlock === 'envelope' ? (
        <BudgetImportConfigEnvelopeBlock
          columns={columns}
          envelopes={envelopes}
          mapping={mapping}
          options={options}
          envelopeImportMode={envelopeImportMode}
          onMappingChange={onMappingChange}
          onOptionsChange={onOptionsChange}
          onEnvelopeImportModeChange={onEnvelopeImportModeChange}
          onCreateEnvelope={onCreateEnvelope}
        />
      ) : null}

      {configBlock === 'budget_line' ? (
        <BudgetImportConfigBudgetLineBlock
          columns={columns}
          mapping={mapping}
          onMappingChange={onMappingChange}
          showGeneralAmounts={showGeneralAmounts}
        />
      ) : null}

      {configBlock === 'orders' ? (
        <BudgetImportConfigOrdersBlock
          columns={columns}
          mapping={mapping}
          onMappingChange={onMappingChange}
          ordersSectionEnabled={ordersSectionEnabled}
          onOrdersSectionEnabledChange={onOrdersSectionEnabledChange}
        />
      ) : null}

      {configBlock === 'invoices' ? (
        <BudgetImportConfigInvoicesBlock
          columns={columns}
          mapping={mapping}
          onMappingChange={onMappingChange}
          invoicesSectionEnabled={invoicesSectionEnabled}
          onInvoicesSectionEnabledChange={onInvoicesSectionEnabledChange}
        />
      ) : null}

      {configBlock === 'options' ? (
        <BudgetImportConfigOptionsBlock
          columns={columns}
          budgetCurrency={budgetCurrency}
          mapping={mapping}
          options={options}
          onMappingChange={onMappingChange}
          onOptionsChange={onOptionsChange}
          mappingName={mappingName}
          onMappingNameChange={onMappingNameChange}
          isEditingSaved={isEditingSaved}
          onSaveAsNew={onSaveAsNew}
          onUpdateSaved={onUpdateSaved}
          canMutateMappings={canMutateMappings}
        />
      ) : null}
    </div>
  );
}
