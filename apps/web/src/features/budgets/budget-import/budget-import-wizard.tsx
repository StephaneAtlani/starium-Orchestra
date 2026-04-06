'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { createEnvelope } from '../api/budget-management.api';
import { useBudgetDetail } from '../hooks/use-budgets';
import { useBudgetEnvelopesAll } from '../hooks/use-budget-envelopes';
import {
  analyzeImport,
  analyzeImportSheet,
  createBudgetImportMapping,
  deleteBudgetImportMapping,
  executeImport,
  listBudgetImportMappings,
  previewImport,
  updateBudgetImportMapping,
} from '../api/budget-imports.api';
import type {
  AnalyzeResult,
  BudgetImportOptionsConfig,
  ExecuteResult,
  MappingConfig,
  PreviewResult,
} from '../types/budget-imports.types';
import {
  BUDGET_IMPORT_CONFIG_BLOCK_ORDER,
  type BudgetImportConfigBlockId,
  budgetImportConfigBlockIndex,
} from './budget-import-config-types';
import {
  deriveOrdersInvoicesSectionSwitches,
  inferEnvelopeImportModeFromMapping,
  validateMappingForPreview,
  type EnvelopeImportMode,
} from './budget-import-mapping-validation';
import { guessMappingFromColumnHeaders } from './budget-import-guess-mapping';
import { BudgetImportUploadStep } from './budget-import-upload-step';
import { BudgetImportMappingStep } from './budget-import-mapping-step';
import { BudgetImportPreviewStep } from './budget-import-preview-step';
import { BudgetImportExecuteStep } from './budget-import-execute-step';
import { budgetDetail } from '../constants/budget-routes';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'execute';

function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Une erreur est survenue.';
}

/** Onglet Excel à envoyer au preview / execute (aligné sur l’analyse). */
function sheetNameForImportPayload(ar: AnalyzeResult): string | undefined {
  if (ar.sourceType !== 'XLSX') return undefined;
  return ar.activeSheetName ?? ar.sheetNames?.[0];
}

export interface BudgetImportWizardProps {
  budgetId: string;
}

export function BudgetImportWizard({ budgetId }: BudgetImportWizardProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permLoading } = usePermissions();

  const hasRead = has('budgets.read');
  const hasUpdate = has('budgets.update');

  const { data: budget } = useBudgetDetail(budgetId);
  const { data: envelopes = [] } = useBudgetEnvelopesAll(budgetId);

  const { data: mappingsList } = useQuery({
    queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
    queryFn: () => listBudgetImportMappings(authFetch, { limit: 200, offset: 0 }),
    enabled: !!clientId && hasRead,
  });
  const savedMappings = mappingsList?.items ?? [];

  const [step, setStep] = useState<WizardStep>('upload');
  const [fileToken, setFileToken] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [mapping, setMapping] = useState<MappingConfig>({ fields: {} });
  const [options, setOptions] = useState<BudgetImportOptionsConfig>({
    importMode: 'UPSERT',
    trimValues: true,
    ignoreEmptyRows: true,
    dateFormat: 'DD/MM/YYYY',
  });

  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);

  const [mappingName, setMappingName] = useState('');
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [isEditingSaved, setIsEditingSaved] = useState(false);

  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [sheetChangeLoading, setSheetChangeLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);

  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [sheetChangeError, setSheetChangeError] = useState<string | null>(null);
  const [mappingValidationError, setMappingValidationError] = useState<string | null>(null);
  const [mappingValidationBlock, setMappingValidationBlock] = useState<BudgetImportConfigBlockId | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const [mappingMutationBusy, setMappingMutationBusy] = useState(false);

  const [envelopeImportMode, setEnvelopeImportMode] = useState<EnvelopeImportMode>('from_file_columns');

  const [configBlock, setConfigBlock] = useState<BudgetImportConfigBlockId>('file_sheet');
  const [ordersSectionEnabled, setOrdersSectionEnabled] = useState(false);
  const [invoicesSectionEnabled, setInvoicesSectionEnabled] = useState(false);

  const budgetCurrency = budget?.currency ?? 'EUR';

  useEffect(() => {
    if (budget?.currency) {
      setOptions((o) => ({
        ...o,
        defaultCurrency: o.defaultCurrency ?? budget.currency,
      }));
    }
  }, [budget?.currency]);

  /** Rafraîchir les enveloppes au retour onglet (ex. après création enveloppe). */
  useEffect(() => {
    const onFocus = () => {
      void queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId, { full: true }),
      });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [clientId, budgetId, queryClient]);

  const patchMapping = useCallback((m: MappingConfig) => {
    setMapping(m);
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
  }, []);

  const patchOptions = useCallback((o: BudgetImportOptionsConfig) => {
    setOptions(o);
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
  }, []);

  const handleEnvelopeImportModeChange = useCallback((mode: EnvelopeImportMode) => {
    setEnvelopeImportMode(mode);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
    setPreviewResult(null);
    setExecuteResult(null);
    if (mode === 'single_envelope') {
      setMapping((prev) => {
        const f = { ...(prev.fields ?? {}) };
        delete f.envelopeCode;
        delete f.envelopeId;
        delete (f as Record<string, string | undefined>).envelope;
        const m = prev.matching;
        let nextMatching = prev.matching;
        if (m?.strategy === 'COMPOSITE' && m.keys?.length) {
          const nextKeys = m.keys.filter(
            (k) => !['envelopeCode', 'envelopeId', 'envelope'].includes(k),
          );
          nextMatching =
            nextKeys.length > 0 ? { strategy: 'COMPOSITE' as const, keys: nextKeys } : { strategy: 'EXTERNAL_ID' };
        }
        return { ...prev, fields: f, matching: nextMatching };
      });
    }
  }, []);

  const resetWizard = useCallback(() => {
    setStep('upload');
    setFileToken(null);
    setAnalyzeResult(null);
    setMapping({ fields: {} });
    setOptions({
      importMode: 'UPSERT',
      trimValues: true,
      ignoreEmptyRows: true,
      defaultCurrency: budget?.currency,
      dateFormat: 'DD/MM/YYYY',
    });
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingName('');
    setSelectedSavedId(null);
    setIsEditingSaved(false);
    setAnalyzeError(null);
    setSheetChangeError(null);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
    setPreviewError(null);
    setExecuteError(null);
    setEnvelopeImportMode('from_file_columns');
    setConfigBlock('file_sheet');
    setOrdersSectionEnabled(false);
    setInvoicesSectionEnabled(false);
  }, [budget?.currency]);

  const goNextConfigBlock = useCallback(() => {
    const i = budgetImportConfigBlockIndex(configBlock);
    if (i < BUDGET_IMPORT_CONFIG_BLOCK_ORDER.length - 1) {
      setConfigBlock(BUDGET_IMPORT_CONFIG_BLOCK_ORDER[i + 1]!);
    }
  }, [configBlock]);

  const goPrevConfigBlock = useCallback(() => {
    const i = budgetImportConfigBlockIndex(configBlock);
    if (i > 0) {
      setConfigBlock(BUDGET_IMPORT_CONFIG_BLOCK_ORDER[i - 1]!);
    }
  }, [configBlock]);

  const handleAnalyzeFile = async (file: File) => {
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      const r = await analyzeImport(authFetch, file);
      setAnalyzeResult(r);
      setFileToken(r.fileToken);
      setPreviewResult(null);
      setExecuteResult(null);
      setMapping({ fields: guessMappingFromColumnHeaders(r.columns) });
      const derived = deriveOrdersInvoicesSectionSwitches(guessMappingFromColumnHeaders(r.columns));
      setOrdersSectionEnabled(derived.ordersSectionEnabled);
      setInvoicesSectionEnabled(derived.invoicesSectionEnabled);
      setConfigBlock('file_sheet');
      setStep('mapping');
    } catch (e) {
      setAnalyzeError(errMessage(e));
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleExcelSheetChange = async (sheetName: string) => {
    if (!fileToken || !analyzeResult || analyzeResult.sourceType !== 'XLSX') return;
    const current = sheetNameForImportPayload(analyzeResult);
    if (sheetName === current) return;
    setSheetChangeError(null);
    setSheetChangeLoading(true);
    try {
      const r = await analyzeImportSheet(authFetch, { fileToken, sheetName });
      setAnalyzeResult(r);
      setPreviewResult(null);
      setExecuteResult(null);
      const guessed = guessMappingFromColumnHeaders(r.columns);
      setMapping({ fields: guessed });
      const derived = deriveOrdersInvoicesSectionSwitches(guessed);
      setOrdersSectionEnabled(derived.ordersSectionEnabled);
      setInvoicesSectionEnabled(derived.invoicesSectionEnabled);
      setMappingValidationError(null);
      setMappingValidationBlock(null);
    } catch (e) {
      setSheetChangeError(errMessage(e));
    } finally {
      setSheetChangeLoading(false);
    }
  };

  const runPreview = async () => {
    if (!fileToken || !budgetId || !analyzeResult) return;
    const v = validateMappingForPreview(
      mapping,
      options,
      budgetCurrency,
      envelopeImportMode,
      {
        sourceType: analyzeResult.sourceType,
        activeSheetName: sheetNameForImportPayload(analyzeResult),
        ordersSectionEnabled,
        invoicesSectionEnabled,
      },
    );
    if (!v.ok) {
      setMappingValidationError(v.message);
      setMappingValidationBlock(v.block ?? null);
      if (v.block) {
        setConfigBlock(v.block);
      }
      return;
    }
    setMappingValidationError(null);
    setMappingValidationBlock(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const r = await previewImport(authFetch, {
        budgetId,
        fileToken,
        sheetName: sheetNameForImportPayload(analyzeResult),
        mapping,
        options,
      });
      setPreviewResult(r);
      setStep('preview');
    } catch (e) {
      setPreviewError(errMessage(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const runExecute = async () => {
    if (!fileToken || !budgetId || !previewResult || !analyzeResult) return;
    setExecuteError(null);
    setExecuteLoading(true);
    try {
      const r = await executeImport(authFetch, {
        budgetId,
        fileToken,
        sheetName: sheetNameForImportPayload(analyzeResult),
        mapping,
        mappingId: selectedSavedId ?? undefined,
        options,
      });
      setExecuteResult(r);

      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId, { full: true }),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetLinesByBudget(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetSummary(clientId, budgetId),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
    } catch (e) {
      setExecuteError(errMessage(e));
    } finally {
      setExecuteLoading(false);
    }
  };

  const applyDerivedSections = useCallback((mc: MappingConfig) => {
    const d = deriveOrdersInvoicesSectionSwitches(mc.fields ?? {});
    setOrdersSectionEnabled(d.ordersSectionEnabled);
    setInvoicesSectionEnabled(d.invoicesSectionEnabled);
  }, []);

  const onApplySaved = () => {
    const sel = savedMappings.find((m) => m.id === selectedSavedId);
    if (!sel) return;
    const mc = sel.mappingConfig as MappingConfig;
    const oc = (sel.optionsConfig as BudgetImportOptionsConfig | null) ?? {};
    setMapping(mc);
    applyDerivedSections(mc);
    setEnvelopeImportMode(inferEnvelopeImportModeFromMapping(mc));
    setOptions((prev) => ({
      ...prev,
      ...oc,
      defaultCurrency: oc.defaultCurrency ?? prev.defaultCurrency ?? budgetCurrency,
      importMode: oc.importMode ?? prev.importMode ?? 'UPSERT',
      trimValues: oc.trimValues ?? prev.trimValues ?? true,
      ignoreEmptyRows: oc.ignoreEmptyRows ?? prev.ignoreEmptyRows ?? true,
      dateFormat: oc.dateFormat ?? prev.dateFormat ?? 'DD/MM/YYYY',
      decimalSeparator: oc.decimalSeparator ?? prev.decimalSeparator ?? '.',
    }));
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
    setMappingName(sel.name);
    setIsEditingSaved(false);
  };

  const onEnterEditMode = () => {
    const sel = savedMappings.find((m) => m.id === selectedSavedId);
    if (!sel) return;
    const mc = sel.mappingConfig as MappingConfig;
    const oc = (sel.optionsConfig as BudgetImportOptionsConfig | null) ?? {};
    setMapping(mc);
    applyDerivedSections(mc);
    setEnvelopeImportMode(inferEnvelopeImportModeFromMapping(mc));
    setOptions((prev) => ({
      ...prev,
      ...oc,
      defaultCurrency: oc.defaultCurrency ?? prev.defaultCurrency ?? budgetCurrency,
      importMode: oc.importMode ?? prev.importMode ?? 'UPSERT',
      dateFormat: oc.dateFormat ?? prev.dateFormat ?? 'DD/MM/YYYY',
      decimalSeparator: oc.decimalSeparator ?? prev.decimalSeparator ?? '.',
    }));
    setPreviewResult(null);
    setExecuteResult(null);
    setMappingValidationError(null);
    setMappingValidationBlock(null);
    setMappingName(sel.name);
    setIsEditingSaved(true);
  };

  const onSaveAsNew = async () => {
    if (!mappingName.trim() || !analyzeResult) return;
    setMappingMutationBusy(true);
    try {
      await createBudgetImportMapping(authFetch, {
        name: mappingName.trim(),
        sourceType: analyzeResult.sourceType,
        entityType: 'BUDGET_LINES',
        headerRowIndex: 1,
        mappingConfig: mapping,
        optionsConfig: options as Record<string, unknown>,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
      setIsEditingSaved(false);
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  const onUpdateSaved = async () => {
    if (!mappingName.trim() || !selectedSavedId) return;
    setMappingMutationBusy(true);
    try {
      await updateBudgetImportMapping(authFetch, selectedSavedId, {
        name: mappingName.trim(),
        mappingConfig: mapping,
        optionsConfig: options as Record<string, unknown>,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  const onDeleteSaved = async () => {
    if (!selectedSavedId) return;
    if (!window.confirm('Supprimer ce mapping enregistré ?')) return;
    setMappingMutationBusy(true);
    try {
      await deleteBudgetImportMapping(authFetch, selectedSavedId);
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
      });
      setSelectedSavedId(null);
      setIsEditingSaved(false);
    } catch (e) {
      setMappingValidationError(errMessage(e));
    } finally {
      setMappingMutationBusy(false);
    }
  };

  const handleCreateEnvelopeInline = useCallback(
    async (input: {
      name: string;
      code?: string;
      description?: string;
      type: string;
    }) => {
      const created = await createEnvelope(authFetch, {
        budgetId,
        name: input.name,
        code: input.code,
        description: input.description,
        type: input.type,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetEnvelopes(clientId, budgetId, { full: true }),
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetDetail(clientId, budgetId),
      });
      return created;
    },
    [authFetch, budgetId, clientId, queryClient],
  );

  if (!permLoading && !hasRead) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Vous n’avez pas les droits de lecture sur les budgets pour utiliser l’import.
        </AlertDescription>
      </Alert>
    );
  }

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'upload', label: 'Fichier' },
    { id: 'mapping', label: 'Configuration' },
    { id: 'preview', label: 'Aperçu' },
    { id: 'execute', label: 'Import' },
  ];

  const configIdx = budgetImportConfigBlockIndex(configBlock);
  const atStartConfig = configIdx === 0;
  const atEndConfig = configIdx === BUDGET_IMPORT_CONFIG_BLOCK_ORDER.length - 1;

  return (
    <div className="space-y-6">
      <nav aria-label="Étapes du wizard" className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={step === s.id}
            onClick={() => {
              if (s.id === 'upload') setStep('upload');
              if (s.id === 'mapping' && analyzeResult) setStep('mapping');
              if (s.id === 'preview' && previewResult) setStep('preview');
              if (s.id === 'execute' && previewResult) setStep('execute');
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              step === s.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {step === 'upload' ? (
        <BudgetImportUploadStep
          onAnalyzeFile={handleAnalyzeFile}
          isLoading={analyzeLoading}
          errorMessage={analyzeError}
        />
      ) : null}

      {step === 'mapping' && analyzeResult ? (
        <div className="space-y-4">
          <BudgetImportMappingStep
            configBlock={configBlock}
            analyzeResult={analyzeResult}
            excelSheetValue={sheetNameForImportPayload(analyzeResult)}
            sheetChangeLoading={sheetChangeLoading}
            sheetChangeError={sheetChangeError}
            onExcelSheetChange={handleExcelSheetChange}
            onChangeFile={() => setStep('upload')}
            columns={analyzeResult.columns}
            budgetCurrency={budgetCurrency}
            envelopes={envelopes}
            mapping={mapping}
            options={options}
            onMappingChange={patchMapping}
            onOptionsChange={patchOptions}
            validationMessage={mappingValidationError}
            validationBlock={mappingValidationBlock}
            savedMappings={savedMappings}
            mappingName={mappingName}
            onMappingNameChange={setMappingName}
            selectedSavedId={selectedSavedId}
            onSelectSaved={(id) => {
              setSelectedSavedId(id);
              setIsEditingSaved(false);
            }}
            isEditingSaved={isEditingSaved}
            onApplySaved={onApplySaved}
            onEnterEditMode={onEnterEditMode}
            onSaveAsNew={onSaveAsNew}
            onUpdateSaved={onUpdateSaved}
            onDeleteSaved={onDeleteSaved}
            canMutateMappings={hasUpdate}
            envelopeImportMode={envelopeImportMode}
            onEnvelopeImportModeChange={handleEnvelopeImportModeChange}
            onCreateEnvelope={handleCreateEnvelopeInline}
            ordersSectionEnabled={ordersSectionEnabled}
            onOrdersSectionEnabledChange={(v) => {
              setOrdersSectionEnabled(v);
              setMappingValidationError(null);
              setMappingValidationBlock(null);
              setPreviewResult(null);
              setExecuteResult(null);
            }}
            invoicesSectionEnabled={invoicesSectionEnabled}
            onInvoicesSectionEnabledChange={(v) => {
              setInvoicesSectionEnabled(v);
              setMappingValidationError(null);
              setMappingValidationBlock(null);
              setPreviewResult(null);
              setExecuteResult(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('upload')}>
              Retour fichier
            </Button>
            <Button type="button" variant="outline" onClick={goPrevConfigBlock} disabled={atStartConfig}>
              Précédent
            </Button>
            <Button type="button" variant="outline" onClick={goNextConfigBlock} disabled={atEndConfig}>
              Suivant
            </Button>
            <Button
              type="button"
              onClick={() => void runPreview()}
              disabled={previewLoading || sheetChangeLoading || !hasRead || mappingMutationBusy}
            >
              {previewLoading ? 'Prévisualisation…' : 'Prévisualiser'}
            </Button>
          </div>
          {!hasRead ? (
            <p className="text-xs text-muted-foreground">Lecture budget requise.</p>
          ) : null}
        </div>
      ) : null}

      {step === 'preview' && previewResult ? (
        <BudgetImportPreviewStep
          preview={previewResult}
          errorMessage={previewError}
          isLoading={previewLoading}
          ordersSectionEnabled={ordersSectionEnabled}
          invoicesSectionEnabled={invoicesSectionEnabled}
          onContinue={() => setStep('execute')}
          onBack={() => setStep('mapping')}
        />
      ) : null}

      {step === 'execute' && previewResult ? (
        <BudgetImportExecuteStep
          previewStats={previewResult.stats}
          executeResult={executeResult}
          isExecuting={executeLoading}
          errorMessage={executeError}
          canExecute={hasUpdate && !!fileToken && !!previewResult}
          readOnlyReason={
            !hasUpdate
              ? 'Droits d’écriture budget requis pour lancer l’import (budgets.update).'
              : null
          }
          budgetDetailHref={budgetDetail(budgetId)}
          onExecute={() => void runExecute()}
          onBack={() => setStep('preview')}
          onResetWizard={resetWizard}
        />
      ) : null}

      <div className="border-t border-border pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={resetWizard}>
          Recommencer depuis le début
        </Button>
      </div>
    </div>
  );
}
