'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { toast } from '@/lib/toast';
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
  getBudgetImportMapping,
  listBudgetImportMappings,
  previewImport,
  updateBudgetImportMapping,
} from '../api/budget-imports.api';
import type {
  AnalyzeResult,
  BudgetImportOptionsConfig,
  BudgetImportPurpose,
  ExecuteResult,
  MappingConfig,
  PreviewResult,
} from '../types/budget-imports.types';
import type { BudgetImportConfigBlockId } from './budget-import-config-types';
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
import { BudgetImportWizardStepper, type BudgetImportWizardStepId } from './budget-import-wizard-stepper';
import {
  budgetDetail,
  budgetImportJobDetail,
} from '../constants/budget-routes';
import { displayLabel } from '@/lib/display-label';

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
  budgetLabel?: string;
}

export function BudgetImportWizard({ budgetId, budgetLabel = 'Budget' }: BudgetImportWizardProps) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const profileIdParam = searchParams.get('profileId');
  const purposeParam = searchParams.get('purpose');
  const profileBootstrapped = useRef(false);
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

  const [step, setStep] = useState<BudgetImportWizardStepId>('upload');
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [fileToken, setFileToken] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [mapping, setMapping] = useState<MappingConfig>({ fields: {} });
  const [options, setOptions] = useState<BudgetImportOptionsConfig>({
    importMode: 'UPSERT',
    trimValues: true,
    ignoreEmptyRows: true,
    dateFormat: 'DD/MM/YYYY',
    createMissingEnvelopes: true,
  });
  const [activeImportPurpose, setActiveImportPurpose] =
    useState<BudgetImportPurpose>('MIXED');

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

  const [ordersSectionEnabled, setOrdersSectionEnabled] = useState(false);
  const [invoicesSectionEnabled, setInvoicesSectionEnabled] = useState(false);

  const budgetCurrency = budget?.currency ?? 'EUR';
  const showMidYearStructureWarning =
    activeImportPurpose === 'STRUCTURE' && budget?.status === 'VALIDATED';

  useEffect(() => {
    if (budget?.currency) {
      setOptions((o) => ({
        ...o,
        defaultCurrency: o.defaultCurrency ?? budget.currency,
      }));
    }
  }, [budget?.currency]);

  useEffect(() => {
    if (profileBootstrapped.current || !clientId || !hasRead) return;

    if (purposeParam === 'REALITY') {
      setOptions((o) => ({ ...o, importMode: 'UPDATE_ONLY' }));
      setOrdersSectionEnabled(true);
      setInvoicesSectionEnabled(true);
      setActiveImportPurpose('REALITY');
    }

    if (!profileIdParam) {
      profileBootstrapped.current = true;
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const profile = await getBudgetImportMapping(authFetch, profileIdParam);
        if (cancelled) return;
        const mc = profile.mappingConfig as MappingConfig;
        setMapping(mc);
        setSelectedSavedId(profile.id);
        setMappingName(profile.name);
        setActiveImportPurpose(profile.importPurpose ?? 'MIXED');
        if (profile.optionsConfig && typeof profile.optionsConfig === 'object') {
          setOptions((o) => ({
            ...o,
            ...(profile.optionsConfig as BudgetImportOptionsConfig),
          }));
        }
        const derived = deriveOrdersInvoicesSectionSwitches(mc.fields ?? {});
        setOrdersSectionEnabled(derived.ordersSectionEnabled);
        setInvoicesSectionEnabled(derived.invoicesSectionEnabled);
        setEnvelopeImportMode(inferEnvelopeImportModeFromMapping(mc));
        if (purposeParam === 'REALITY' || profile.importPurpose === 'REALITY') {
          setOptions((o) => ({
            ...o,
            importMode: purposeParam === 'REALITY' ? 'UPDATE_ONLY' : (o.importMode ?? 'UPSERT'),
          }));
        }
      } catch {
        // Profil introuvable : wizard sans préremplissage.
      } finally {
        profileBootstrapped.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, clientId, hasRead, profileIdParam, purposeParam]);

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
        delete f.envelopeName;
        delete (f as Record<string, string | undefined>).envelope;
        const m = prev.matching;
        let nextMatching = prev.matching;
        if (m?.strategy === 'COMPOSITE' && m.keys?.length) {
          const nextKeys = m.keys.filter(
            (k) => !['envelopeCode', 'envelopeId', 'envelope', 'envelopeName'].includes(k),
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
    setSourceFileName(null);
    setFileToken(null);
    setAnalyzeResult(null);
    setMapping({ fields: {} });
    setOptions({
      importMode: 'UPSERT',
      trimValues: true,
      ignoreEmptyRows: true,
      defaultCurrency: budget?.currency,
      dateFormat: 'DD/MM/YYYY',
      createMissingEnvelopes: true,
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
    setOrdersSectionEnabled(false);
    setInvoicesSectionEnabled(false);
  }, [budget?.currency]);

  const handleAnalyzeFile = async (file: File) => {
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      setSourceFileName(file.name);
      const r = await analyzeImport(authFetch, file);
      setAnalyzeResult(r);
      setFileToken(r.fileToken);
      setPreviewResult(null);
      setExecuteResult(null);
      setMapping({ fields: guessMappingFromColumnHeaders(r.columns) });
      const derived = deriveOrdersInvoicesSectionSwitches(guessMappingFromColumnHeaders(r.columns));
      setOrdersSectionEnabled(derived.ordersSectionEnabled);
      setInvoicesSectionEnabled(derived.invoicesSectionEnabled);
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

  const runPreview = async (optionsOverride?: BudgetImportOptionsConfig) => {
    const previewOptions = optionsOverride ?? options;
    if (!fileToken || !budgetId || !analyzeResult) return;
    const v = validateMappingForPreview(
      mapping,
      previewOptions,
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
      toast.error(v.message);
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
        options: previewOptions,
      });
      if (optionsOverride) {
        setOptions(previewOptions);
      }
      setPreviewResult(r);
      toast.success(
        `Aperçu calculé — ${r.stats.createRows} création(s), ${r.stats.updateRows} mise(s) à jour, ${r.stats.errorRows} erreur(s).`,
      );
      setStep('preview');
    } catch (e) {
      const msg = errMessage(e);
      setPreviewError(msg);
      toast.error(msg);
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
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.budgetImportJobsList(clientId),
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
    setActiveImportPurpose(sel.importPurpose ?? 'MIXED');
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
      status?: string;
    }) => {
      const created = await createEnvelope(authFetch, {
        budgetId,
        name: input.name,
        code: input.code,
        description: input.description,
        type: input.type,
        status: input.status,
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

  const handleStepChange = (next: BudgetImportWizardStepId) => {
    if (next === 'upload') {
      setStep('upload');
      return;
    }
    if (next === 'mapping' && analyzeResult) {
      setStep('mapping');
      return;
    }
    if (next === 'preview' && previewResult) {
      setStep('preview');
      return;
    }
    if (next === 'execute' && previewResult) {
      setStep('execute');
    }
  };

  return (
    <section className="starium-module space-y-5">
      <BudgetImportWizardStepper
        activeStep={step}
        canGoToMapping={!!analyzeResult}
        canGoToPreview={!!previewResult}
        canGoToExecute={!!previewResult}
        onStepChange={handleStepChange}
      />

      {analyzeResult && step !== 'upload' ? (
        <p className="text-sm text-muted-foreground">
          Fichier :{' '}
          <span className="font-medium text-foreground">
            {displayLabel(sourceFileName, 'Fichier')}
          </span>
          {' · '}
          Budget :{' '}
          <span className="font-medium text-foreground">{budgetLabel}</span>
        </p>
      ) : null}

      {showMidYearStructureWarning ? (
        <Alert>
          <AlertTitle>Import structurel sur budget validé</AlertTitle>
          <AlertDescription>
            Les lignes seront créées en brouillon ; pas d’activation de prévision d’atterrissage
            (PA) automatique. Vous pouvez poursuivre l’import.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="starium-panel rounded-lg border border-border bg-card p-4 sm:p-6 shadow-[var(--shadow-1)]">
        {step === 'upload' ? (
          <BudgetImportUploadStep
            onAnalyzeFile={handleAnalyzeFile}
            isLoading={analyzeLoading}
            errorMessage={analyzeError}
          />
        ) : null}

        {step === 'mapping' && analyzeResult ? (
          previewLoading ? (
            <div aria-live="polite">
              <LoadingState rows={4} />
              <p className="mt-3 text-sm text-muted-foreground">
                Calcul de l’aperçu en cours — analyse des lignes sans écriture en base.
              </p>
            </div>
          ) : (
            <BudgetImportMappingStep
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
          )
        ) : null}

        {step === 'preview' && previewResult ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Résultat du calcul d’aperçu — aucune donnée n’a été écrite. Vérifiez les lignes
              en erreur avant de lancer l’import.
            </p>
            <BudgetImportPreviewStep
            preview={previewResult}
            options={options}
            envelopes={envelopes}
            errorMessage={previewError}
            isLoading={previewLoading}
            ordersSectionEnabled={ordersSectionEnabled}
            invoicesSectionEnabled={invoicesSectionEnabled}
            onCreateEnvelope={handleCreateEnvelopeInline}
            onSelectDefaultEnvelope={(envelopeId) => {
              void runPreview({ ...options, defaultEnvelopeId: envelopeId });
            }}
            onRefreshPreview={() => runPreview()}
            onEditConfiguration={() => setStep('mapping')}
            onSwitchToUpsert={() => {
              const next = { ...options, importMode: 'UPSERT' as const };
              void runPreview(next);
            }}
            onContinue={() => setStep('execute')}
            onBack={() => setStep('mapping')}
          />
          </div>
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
            historyJobHref={
              executeResult?.jobId ? budgetImportJobDetail(executeResult.jobId) : null
            }
            onExecute={() => void runExecute()}
            onBack={() => setStep('preview')}
            onResetWizard={resetWizard}
          />
        ) : null}
      </div>

      {step === 'mapping' && analyzeResult ? (
        <div className="space-y-3 border-t border-border pt-4">
          {(mappingValidationError || previewError) && !previewLoading ? (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertTitle>Prévisualisation impossible</AlertTitle>
              <AlertDescription>{previewError ?? mappingValidationError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setStep('upload')}
              disabled={previewLoading}
            >
              Changer de fichier
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-9"
              onClick={() => void runPreview()}
              disabled={previewLoading || sheetChangeLoading || !hasRead || mappingMutationBusy}
            >
              {previewLoading ? 'Calcul de l’aperçu…' : 'Calculer l’aperçu'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'upload' ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-9 text-muted-foreground"
            onClick={resetWizard}
          >
            Réinitialiser
          </Button>
        </div>
      ) : null}

      {step !== 'upload' && step !== 'execute' && !executeResult ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 sm:min-h-9 text-muted-foreground"
            onClick={resetWizard}
          >
            Recommencer
          </Button>
        </div>
      ) : null}

      {!hasRead && step === 'mapping' ? (
        <p className="text-xs text-muted-foreground">Lecture budget requise.</p>
      ) : null}
    </section>
  );
}
