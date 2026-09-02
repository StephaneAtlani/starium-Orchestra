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
import type { EnvelopeImportMode } from './budget-import-mapping-validation';
import { BudgetImportConfigFileSheetBlock } from './budget-import-config-file-sheet-block';
import { BudgetImportConfigEnvelopeBlock } from './budget-import-config-envelope-block';
import { BudgetImportConfigBudgetLineBlock } from './budget-import-config-budget-line-block';
import { BudgetImportConfigOrdersBlock } from './budget-import-config-orders-block';
import { BudgetImportConfigInvoicesBlock } from './budget-import-config-invoices-block';
import { BudgetImportConfigDocumentFilterBlock } from './budget-import-config-document-filter-block';
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

function MappingSection({
  id,
  title,
  validationMessage,
  validationBlock,
  blockId,
  children,
}: {
  id: BudgetImportConfigBlockId;
  title: string;
  validationMessage: string | null;
  validationBlock: BudgetImportConfigBlockId | null;
  blockId: BudgetImportConfigBlockId;
  children: React.ReactNode;
}) {
  const showError =
    validationMessage && (validationBlock === blockId || (!validationBlock && blockId === id));

  return (
    <section id={`import-mapping-${blockId}`} className="space-y-3 scroll-mt-6">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {showError ? (
        <Alert variant="destructive">
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </section>
  );
}

export interface BudgetImportMappingStepProps {
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
    status: string;
  }) => Promise<BudgetEnvelope>;
  ordersSectionEnabled: boolean;
  onOrdersSectionEnabledChange: (v: boolean) => void;
  invoicesSectionEnabled: boolean;
  onInvoicesSectionEnabledChange: (v: boolean) => void;
}

export function BudgetImportMappingStep({
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
      : (savedMappings.find((m) => m.id === selectedSavedId)?.name ?? 'Profil supprimé');

  const showGeneralAmounts = !ordersSectionEnabled && !invoicesSectionEnabled;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
        <h3 className="mb-3 text-sm font-semibold">Reprendre un profil</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="import-saved-mapping">Charger un profil enregistré</Label>
            <Select
              value={selectedSavedId ?? EMPTY_SELECT_VALUE}
              onValueChange={(id) => onSelectSaved(id === EMPTY_SELECT_VALUE ? null : id)}
            >
              <SelectTrigger id="import-saved-mapping" className="w-full min-w-0">
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
              Écriture budget requise pour modifier ou supprimer un profil.
            </p>
          )}
        </div>
        {isEditingSaved ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Mode édition : les changements sont enregistrés sur ce profil.
          </p>
        ) : null}
      </div>

      {validationMessage && !validationBlock ? (
        <Alert variant="destructive">
          <AlertDescription>{validationMessage}</AlertDescription>
        </Alert>
      ) : null}

      <MappingSection
        id="file_sheet"
        blockId="file_sheet"
        title={BLOCK_LABELS.file_sheet}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
        <BudgetImportConfigFileSheetBlock
          analyzeResult={analyzeResult}
          excelSheetValue={excelSheetValue}
          sheetChangeLoading={sheetChangeLoading}
          sheetChangeError={sheetChangeError}
          onExcelSheetChange={onExcelSheetChange}
          onChangeFile={onChangeFile}
        />
      </MappingSection>

      <MappingSection
        id="envelope"
        blockId="envelope"
        title={BLOCK_LABELS.envelope}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
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
      </MappingSection>

      <MappingSection
        id="budget_line"
        blockId="budget_line"
        title={BLOCK_LABELS.budget_line}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
        <BudgetImportConfigBudgetLineBlock
          columns={columns}
          mapping={mapping}
          onMappingChange={onMappingChange}
          showGeneralAmounts={showGeneralAmounts}
        />
      </MappingSection>

      <MappingSection
        id="orders"
        blockId="orders"
        title={BLOCK_LABELS.orders}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
        <div className="space-y-4">
          <BudgetImportConfigDocumentFilterBlock
            columns={columns}
            mapping={mapping}
            onMappingChange={onMappingChange}
            enabled={ordersSectionEnabled || invoicesSectionEnabled}
          />
          <BudgetImportConfigOrdersBlock
            columns={columns}
            mapping={mapping}
            onMappingChange={onMappingChange}
            ordersSectionEnabled={ordersSectionEnabled}
            onOrdersSectionEnabledChange={onOrdersSectionEnabledChange}
          />
        </div>
      </MappingSection>

      <MappingSection
        id="invoices"
        blockId="invoices"
        title={BLOCK_LABELS.invoices}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
        <BudgetImportConfigInvoicesBlock
          columns={columns}
          mapping={mapping}
          onMappingChange={onMappingChange}
          invoicesSectionEnabled={invoicesSectionEnabled}
          onInvoicesSectionEnabledChange={onInvoicesSectionEnabledChange}
        />
      </MappingSection>

      <MappingSection
        id="options"
        blockId="options"
        title={BLOCK_LABELS.options}
        validationMessage={validationMessage}
        validationBlock={validationBlock}
      >
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
      </MappingSection>
    </div>
  );
}
