'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProjectScenarioFinancialLine,
  deleteProjectScenarioFinancialLine,
  getProjectScenarioFinancialSummary,
  listProjectScenarioFinancialLines,
  updateProjectScenarioFinancialLine,
} from './project-scenario-dimensions.api';
import { useProjectBudgetLinksQuery } from '../hooks/use-project-budget-links-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useBudgetDetail, useBudgetsList } from '@/features/budgets/hooks/use-budgets';
import { useBudgetExerciseOptionsQuery } from '@/features/budgets/hooks/use-budget-exercise-options-query';
import { useBudgetLinesByBudget } from '@/features/budgets/hooks/use-budget-lines';
import { useBudgetEnvelopesAll } from '@/features/budgets/hooks/use-budget-envelopes';
import { formatBudgetExerciseOptionLabel } from '@/features/budgets/lib/budget-exercise-option-label';
import type { BudgetExerciseSummary } from '@/features/budgets/types/budget-list.types';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectBudgetLinkItem, ProjectScenarioApi } from '../types/project.types';
import type { BudgetLine } from '@/features/budgets/types/budget-management.types';
import { invalidateScenarioWorkspaceCaches } from './invalidate-scenario-workspace-caches';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';
import type { ProjectScenarioFinancialLineApi } from './project-scenario-dimensions.types';
import {
  defaultLabelFromProjectLink,
  formatAllocationRule,
  formatProjectBudgetAllocation,
  groupLinksByEnvelopeId,
  plannedAmountHintFromProjectLink,
} from './scenario-budget-project-links';

const SELECT_NO_LINK = '__none__';

type AttachmentTab = 'link' | 'line';

type Props = {
  scenario: ProjectScenarioApi;
  canMutate: boolean;
};

function exerciseCycleLabel(status: BudgetExerciseSummary['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'En cours';
    case 'DRAFT':
      return 'Brouillon';
    case 'CLOSED':
      return 'Clôturé';
    case 'ARCHIVED':
      return 'Archivé';
    default:
      return status;
  }
}

function formatBudgetOptionLabel(b: { code: string | null; name: string }): string {
  return b.code ? `${b.code} — ${b.name}` : b.name;
}

function formatEnvelopeOptionLabel(e: { code: string | null; name: string }): string {
  return e.code ? `${e.code} — ${e.name}` : e.name;
}

function formatLineOptionLabel(l: { code: string | null; name: string }): string {
  return l.code ? `${l.code} — ${l.name}` : l.name;
}

function lineDisplayLabel(line: {
  label: string;
  budgetLine: { name: string } | null;
  projectBudgetLink: { budgetLine: { name: string } } | null;
}): string {
  return line.projectBudgetLink?.budgetLine.name ?? line.budgetLine?.name ?? line.label;
}

function formatMoney(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
}

export function ScenarioBudgetPanel({ scenario, canMutate }: Props) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const projectId = scenario.projectId;
  const scenarioId = scenario.id;
  const readOnly = isScenarioWorkspaceReadOnly(scenario) || !canMutate;

  const projectLinksQuery = useProjectBudgetLinksQuery(projectId);
  const projectLinks = useMemo(
    () => projectLinksQuery.data?.items ?? [],
    [projectLinksQuery.data?.items],
  );
  const budgetIdFromFirstLink = projectLinks[0]?.budgetLine.budgetId ?? null;

  const exerciseOptionsQuery = useBudgetExerciseOptionsQuery();
  const linkBudgetDetailQuery = useBudgetDetail(budgetIdFromFirstLink);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const budgetsListQuery = useBudgetsList(
    selectedExerciseId ? { exerciseId: selectedExerciseId, limit: 100 } : undefined,
    { enabled: Boolean(clientId && selectedExerciseId) },
  );
  const firstBudgetId = budgetsListQuery.data?.items[0]?.id ?? null;

  const exerciseOptionsSorted = useMemo(() => {
    const items = [...(exerciseOptionsQuery.data ?? [])];
    items.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return a.name.localeCompare(b.name, 'fr');
    });
    return items;
  }, [exerciseOptionsQuery.data]);

  useEffect(() => {
    const opts = exerciseOptionsQuery.data;
    if (!opts?.length) return;
    setSelectedExerciseId((prev) => {
      if (prev) return prev;
      const active = opts.find((e) => e.status === 'ACTIVE');
      return (active ?? opts[0])!.id;
    });
  }, [exerciseOptionsQuery.data]);

  const [scopeBudgetAfterDirectLine, setScopeBudgetAfterDirectLine] = useState<string | null>(null);
  const resolvedBudgetIdForMaps =
    budgetIdFromFirstLink ?? scopeBudgetAfterDirectLine ?? firstBudgetId ?? null;

  const mapLinesQuery = useBudgetLinesByBudget(resolvedBudgetIdForMaps);
  const mapEnvelopesQuery = useBudgetEnvelopesAll(resolvedBudgetIdForMaps);

  const lineById = useMemo(() => {
    const m = new Map<string, BudgetLine>();
    for (const l of mapLinesQuery.data ?? []) {
      m.set(l.id, l);
    }
    return m;
  }, [mapLinesQuery.data]);

  const envelopeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of mapEnvelopesQuery.data ?? []) {
      m.set(e.id, e.name);
    }
    return m;
  }, [mapEnvelopesQuery.data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<AttachmentTab>('link');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [directBudgetId, setDirectBudgetId] = useState<string>(SELECT_NO_LINK);
  const [directEnvelopeId, setDirectEnvelopeId] = useState<string>(SELECT_NO_LINK);
  const [directBudgetLineId, setDirectBudgetLineId] = useState<string>(SELECT_NO_LINK);
  const [label, setLabel] = useState('');
  const [amountPlanned, setAmountPlanned] = useState('');
  const [currencyCode, setCurrencyCode] = useState('EUR');

  const directLinesQuery = useBudgetLinesByBudget(
    directBudgetId !== SELECT_NO_LINK ? directBudgetId : null,
  );
  const directEnvelopesQuery = useBudgetEnvelopesAll(
    directBudgetId !== SELECT_NO_LINK ? directBudgetId : null,
  );

  const linesInEnvelope = useMemo(() => {
    if (directEnvelopeId === SELECT_NO_LINK) return [];
    return (directLinesQuery.data ?? []).filter((l) => l.envelopeId === directEnvelopeId);
  }, [directLinesQuery.data, directEnvelopeId]);

  const selectedLink = useMemo(
    () => (selectedLinkId ? projectLinks.find((l) => l.id === selectedLinkId) : undefined),
    [projectLinks, selectedLinkId],
  );

  const selectedDirectLine = useMemo(() => {
    if (directBudgetLineId === SELECT_NO_LINK) return undefined;
    return (directLinesQuery.data ?? []).find((l) => l.id === directBudgetLineId);
  }, [directBudgetLineId, directLinesQuery.data]);

  const wasDialogOpen = useRef(false);
  useEffect(() => {
    const justOpened = createOpen && !wasDialogOpen.current;
    wasDialogOpen.current = createOpen;
    if (!justOpened) return;
    const opts = exerciseOptionsQuery.data;
    const exFromLink = linkBudgetDetailQuery.data?.exerciseId;
    if (projectLinks.length > 0 && exFromLink && opts?.some((o) => o.id === exFromLink)) {
      setSelectedExerciseId(exFromLink);
    }
    setDirectBudgetId(SELECT_NO_LINK);
    setDirectEnvelopeId(SELECT_NO_LINK);
    setDirectBudgetLineId(SELECT_NO_LINK);
    setSelectedLinkId('');
    setLabel('');
    setAmountPlanned('');
    setCurrencyCode('EUR');
    setAttachmentTab(projectLinks.length > 0 ? 'link' : 'line');
  }, [
    createOpen,
    projectLinks.length,
    budgetIdFromFirstLink,
    budgetsListQuery.data?.items,
    exerciseOptionsQuery.data,
    linkBudgetDetailQuery.data?.exerciseId,
  ]);

  useEffect(() => {
    if (!createOpen) return;
    if (directBudgetId !== SELECT_NO_LINK) return;
    const items = budgetsListQuery.data?.items ?? [];
    const def =
      budgetIdFromFirstLink && items.some((b) => b.id === budgetIdFromFirstLink)
        ? budgetIdFromFirstLink
        : items[0]?.id;
    if (def) setDirectBudgetId(def);
  }, [createOpen, budgetIdFromFirstLink, budgetsListQuery.data?.items, directBudgetId]);

  useEffect(() => {
    if (!createOpen) return;
    if (selectedLink) {
      setLabel(defaultLabelFromProjectLink(selectedLink));
      const hint = plannedAmountHintFromProjectLink(selectedLink);
      setAmountPlanned(hint ?? '');
      const bl = lineById.get(selectedLink.budgetLineId);
      if (bl?.currency) {
        setCurrencyCode(bl.currency.trim().toUpperCase().slice(0, 3));
      }
    } else if (!selectedLinkId && attachmentTab === 'link') {
      setLabel('');
      setAmountPlanned('');
    }
  }, [createOpen, selectedLink, selectedLinkId, attachmentTab, lineById]);

  useEffect(() => {
    if (!createOpen || attachmentTab !== 'line') return;
    if (directBudgetLineId === SELECT_NO_LINK) return;
    const bl = (directLinesQuery.data ?? []).find((l) => l.id === directBudgetLineId);
    if (bl) {
      setLabel(formatLineOptionLabel(bl));
      setCurrencyCode((bl.currency ?? 'EUR').trim().toUpperCase().slice(0, 3));
    }
  }, [createOpen, attachmentTab, directBudgetLineId, directLinesQuery.data]);

  const budgetQuery = useQuery({
    queryKey: projectQueryKeys.scenarioFinancialLines(clientId, projectId, scenarioId),
    queryFn: async () => {
      const [lines, summary] = await Promise.all([
        listProjectScenarioFinancialLines(authFetch, projectId, scenarioId, { limit: 100, offset: 0 }),
        getProjectScenarioFinancialSummary(authFetch, projectId, scenarioId),
      ]);
      return { lines, summary };
    },
    enabled: Boolean(clientId && projectId && scenarioId),
  });

  const deleteMutation = useMutation({
    mutationFn: (lineId: string) =>
      deleteProjectScenarioFinancialLine(authFetch, projectId, scenarioId, lineId),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Ligne supprimée');
    },
    onError: (e: Error) => toast.error(e.message || 'Suppression impossible'),
  });

  const updatePlannedMutation = useMutation({
    mutationFn: ({
      lineId,
      amountPlanned,
    }: {
      lineId: string;
      amountPlanned: string;
    }) =>
      updateProjectScenarioFinancialLine(authFetch, projectId, scenarioId, lineId, {
        amountPlanned,
      }),
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
    },
    onError: (e: Error) => toast.error(e.message || 'Mise à jour du montant impossible'),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const base = {
        label: label.trim(),
        amountPlanned: amountPlanned.trim(),
        currencyCode: currencyCode.trim() || 'EUR',
      };
      if (attachmentTab === 'line') {
        if (directBudgetLineId === SELECT_NO_LINK) {
          throw new Error('Choisis une ligne budgétaire');
        }
        return createProjectScenarioFinancialLine(authFetch, projectId, scenarioId, {
          ...base,
          budgetLineId: directBudgetLineId,
        });
      }
      if (selectedLinkId) {
        return createProjectScenarioFinancialLine(authFetch, projectId, scenarioId, {
          ...base,
          projectBudgetLinkId: selectedLinkId,
        });
      }
      return createProjectScenarioFinancialLine(authFetch, projectId, scenarioId, base);
    },
    onSuccess: async () => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      toast.success('Ligne budgétaire ajoutée');
      if (attachmentTab === 'line' && directBudgetId !== SELECT_NO_LINK) {
        setScopeBudgetAfterDirectLine(directBudgetId);
      }
      setCreateOpen(false);
      setSelectedLinkId('');
      setDirectBudgetId(SELECT_NO_LINK);
      setDirectEnvelopeId(SELECT_NO_LINK);
      setDirectBudgetLineId(SELECT_NO_LINK);
      setLabel('');
      setAmountPlanned('');
      setCurrencyCode('EUR');
    },
    onError: (e: Error) => toast.error(e.message || 'Création impossible'),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const links = projectLinksQuery.data?.items ?? [];
      const scenarioLines = budgetQuery.data?.lines.items ?? [];
      const existing = new Set(
        scenarioLines
          .map((l) => l.projectBudgetLinkId)
          .filter((id): id is string => Boolean(id)),
      );
      let created = 0;
      for (const link of links) {
        if (existing.has(link.id)) continue;
        const hint = plannedAmountHintFromProjectLink(link);
        await createProjectScenarioFinancialLine(authFetch, projectId, scenarioId, {
          projectBudgetLinkId: link.id,
          label: defaultLabelFromProjectLink(link),
          amountPlanned: hint ?? '0',
          currencyCode: 'EUR',
        });
        existing.add(link.id);
        created += 1;
      }
      return created;
    },
    onSuccess: async (created) => {
      await invalidateScenarioWorkspaceCaches(queryClient, clientId, projectId, scenarioId);
      if (created === 0) {
        toast.message('Aucune nouvelle ligne à importer', {
          description: 'Toutes les liaisons budget projet sont déjà présentes dans ce scénario.',
        });
      } else {
        toast.success(`${created} ligne(s) importée(s) depuis le budget projet.`);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Import impossible'),
  });

  const groupedLinks = useMemo(() => {
    const m = groupLinksByEnvelopeId(projectLinks);
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [projectLinks]);

  const linkSelectLabel = useMemo(() => {
    if (!selectedLinkId) return 'Sans liaison — saisie libre';
    const l = projectLinks.find((x) => x.id === selectedLinkId);
    return l
      ? `${l.budgetLine.code} — ${l.budgetLine.name} · ${formatProjectBudgetAllocation(l)}`
      : 'Liaison projet';
  }, [selectedLinkId, projectLinks]);

  const directExerciseLabel = useMemo(() => {
    if (!selectedExerciseId) return 'Chargement des exercices…';
    const ex = exerciseOptionsQuery.data?.find((e) => e.id === selectedExerciseId);
    if (!ex) return 'Exercice';
    return `${formatBudgetExerciseOptionLabel(ex)} · ${exerciseCycleLabel(ex.status)}`;
  }, [selectedExerciseId, exerciseOptionsQuery.data]);

  const directBudgetLabel = useMemo(() => {
    const b = (budgetsListQuery.data?.items ?? []).find((x) => x.id === directBudgetId);
    return b ? formatBudgetOptionLabel(b) : 'Choisir un budget…';
  }, [budgetsListQuery.data?.items, directBudgetId]);

  const directEnvelopeLabel = useMemo(() => {
    if (directEnvelopeId === SELECT_NO_LINK) return '— Choisir une enveloppe —';
    const e = (directEnvelopesQuery.data ?? []).find((x) => x.id === directEnvelopeId);
    return e ? formatEnvelopeOptionLabel(e) : 'Enveloppe';
  }, [directEnvelopesQuery.data, directEnvelopeId]);

  const directLineLabel = useMemo(() => {
    if (directBudgetLineId === SELECT_NO_LINK) return '— Choisir une ligne —';
    const l = (directLinesQuery.data ?? []).find((x) => x.id === directBudgetLineId);
    return l ? formatLineOptionLabel(l) : 'Ligne budgétaire';
  }, [directLinesQuery.data, directBudgetLineId]);

  const canSubmitCreate =
    Boolean(label.trim()) &&
    Boolean(amountPlanned.trim()) &&
    (attachmentTab === 'line'
      ? directBudgetLineId !== SELECT_NO_LINK
      : true);

  if (budgetQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (budgetQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {budgetQuery.error instanceof Error ? budgetQuery.error.message : 'Chargement impossible'}
        </AlertDescription>
      </Alert>
    );
  }

  const items = budgetQuery.data?.lines.items ?? [];
  const summary = budgetQuery.data?.summary;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rattache des lignes soit via les <strong>liaisons budget projet</strong> (fiche projet),
        soit en référençant une <strong>ligne budgétaire</strong> (enveloppe / ligne) sans liaison.
        Tu peux <strong>ajuster les montants</strong> dans le tableau ci-dessous : ce sont des
        valeurs <strong>prévisionnelles de scénario</strong> uniquement — elles ne modifient pas
        les montants du budget référentiel (enveloppes, engagements, consommations).
      </p>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Total planifié</p>
            <p className="text-sm font-semibold">{summary.plannedTotal}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Total prévisionnel</p>
            <p className="text-sm font-semibold">{summary.forecastTotal}</p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Réel (agrégé)</p>
            <p className="text-sm font-semibold">{summary.actualTotal}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            readOnly ||
            importMutation.isPending ||
            projectLinksQuery.isLoading ||
            projectLinks.length === 0
          }
          title={
            projectLinks.length === 0
              ? 'Aucune liaison budget projet — configurez les liens dans la fiche projet.'
              : undefined
          }
          onClick={() => importMutation.mutate()}
        >
          Importer depuis le budget projet
        </Button>
        <Button type="button" size="sm" disabled={readOnly} onClick={() => setCreateOpen(true)}>
          Ajouter une ligne
        </Button>
      </div>

      {projectLinksQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Liaisons budget projet</AlertTitle>
          <AlertDescription>
            Impossible de charger les liaisons projet ↔ budget. Vérifiez les permissions.
          </AlertDescription>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune ligne de projection. Importe les liaisons ou ajoute une ligne.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ligne</TableHead>
              <TableHead>Enveloppe</TableHead>
              <TableHead>Règle / référence</TableHead>
              <TableHead className="text-right">Engagé</TableHead>
              <TableHead className="text-right">Consommé</TableHead>
              <TableHead
                className="max-w-[11rem] text-right"
                title="Montant prévisionnel pour ce scénario uniquement — aucun impact sur le budget référentiel"
              >
                Prévisionnel scénario
              </TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((line) => (
              <ScenarioBudgetLineRow
                key={line.id}
                line={line}
                projectLinks={projectLinks}
                lineById={lineById}
                envelopeNameById={envelopeNameById}
                readOnly={readOnly}
                onDelete={() => deleteMutation.mutate(line.id)}
                deletePending={deleteMutation.isPending}
                onSavePlannedAmount={(amount) =>
                  updatePlannedMutation.mutateAsync({ lineId: line.id, amountPlanned: amount })
                }
                savePlannedPending={
                  updatePlannedMutation.isPending &&
                  updatePlannedMutation.variables?.lineId === line.id
                }
              />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          overlayClassName="backdrop-blur-md dark:backdrop-blur-lg"
          className={cn(
            'max-h-[90vh] overflow-y-auto',
            'w-[min(92vw,720px)] max-w-[min(92vw,720px)] sm:max-w-[min(92vw,720px)]',
            'border-border/50 bg-background/80 shadow-xl backdrop-blur-xl dark:bg-background/75',
          )}
        >
          <DialogHeader>
            <DialogTitle>Nouvelle ligne de projection</DialogTitle>
          </DialogHeader>
          <Tabs
            value={attachmentTab}
            onValueChange={(v) => setAttachmentTab(v as AttachmentTab)}
            className="gap-3"
          >
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1">
                Liaison budget projet
              </TabsTrigger>
              <TabsTrigger value="line" className="flex-1">
                Ligne budgétaire
              </TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="flex flex-col gap-3 pt-1">
              <div className="grid gap-2">
                <Label>Liaison budget projet (optionnel)</Label>
                <Select
                  value={selectedLinkId ? selectedLinkId : SELECT_NO_LINK}
                  onValueChange={(v) =>
                    setSelectedLinkId(v == null || v === SELECT_NO_LINK ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>{linkSelectLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NO_LINK}>Sans liaison — saisie libre</SelectItem>
                    {groupedLinks.map(([envelopeId, links]) => (
                      <SelectGroup key={envelopeId}>
                        <SelectLabel>
                          {envelopeNameById.get(envelopeId) ?? `Enveloppe ${envelopeId}`}
                        </SelectLabel>
                        {links.map((link) => (
                          <SelectItem key={link.id} value={link.id}>
                            {link.budgetLine.code} — {link.budgetLine.name} ·{' '}
                            {formatProjectBudgetAllocation(link)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedLink ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                  <p className="font-medium text-muted-foreground">Référence ligne budgétaire</p>
                  <p>
                    Engagé : {formatMoney(selectedLink.budgetLine.committedAmount)} · Consommé :{' '}
                    {formatMoney(selectedLink.budgetLine.consumedAmount)}
                  </p>
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value="line" className="flex flex-col gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Référence une ligne du budget (enveloppe + ligne) sans liaison budget projet. La
                liaison formelle pourra être ajoutée plus tard dans la fiche projet. Les enveloppes
                listées sont celles du budget choisi, lui-même filtré par exercice budgétaire.
              </p>
              <div className="grid gap-2">
                <Label>Exercice budgétaire</Label>
                <Select
                  value={selectedExerciseId ?? ''}
                  onValueChange={(v) => {
                    if (v == null || v === '') return;
                    setSelectedExerciseId(v);
                    setDirectBudgetId(SELECT_NO_LINK);
                    setDirectEnvelopeId(SELECT_NO_LINK);
                    setDirectBudgetLineId(SELECT_NO_LINK);
                  }}
                  disabled={
                    exerciseOptionsQuery.isLoading || exerciseOptionsSorted.length === 0
                  }
                >
                  <SelectTrigger className="w-full min-w-0 max-w-full justify-between">
                    <SelectValue placeholder="Choisir un exercice…">{directExerciseLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseOptionsSorted.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {`${formatBudgetExerciseOptionLabel(ex)} · ${exerciseCycleLabel(ex.status)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Budget</Label>
                <Select
                  value={directBudgetId}
                  onValueChange={(v) => {
                    if (v == null) return;
                    setDirectBudgetId(v);
                    setDirectEnvelopeId(SELECT_NO_LINK);
                    setDirectBudgetLineId(SELECT_NO_LINK);
                  }}
                  disabled={!selectedExerciseId || budgetsListQuery.isLoading}
                >
                  <SelectTrigger className="w-full min-w-0 max-w-full justify-between">
                    <SelectValue>{directBudgetLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(budgetsListQuery.data?.items ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {formatBudgetOptionLabel(b)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Enveloppe</Label>
                <Select
                  value={directEnvelopeId}
                  onValueChange={(v) => {
                    if (v == null) return;
                    setDirectEnvelopeId(v);
                    setDirectBudgetLineId(SELECT_NO_LINK);
                  }}
                  disabled={directBudgetId === SELECT_NO_LINK}
                >
                  <SelectTrigger className="w-full min-w-0 max-w-full justify-between">
                    <SelectValue>{directEnvelopeLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NO_LINK}>— Choisir une enveloppe —</SelectItem>
                    {(directEnvelopesQuery.data ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {formatEnvelopeOptionLabel(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Ligne budgétaire</Label>
                <Select
                  value={directBudgetLineId}
                  onValueChange={(v) => {
                    if (v == null) return;
                    setDirectBudgetLineId(v);
                  }}
                  disabled={directEnvelopeId === SELECT_NO_LINK}
                >
                  <SelectTrigger className="w-full min-w-0 max-w-full justify-between">
                    <SelectValue>{directLineLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NO_LINK}>— Choisir une ligne —</SelectItem>
                    {linesInEnvelope.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {formatLineOptionLabel(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDirectLine ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                  <p className="font-medium text-muted-foreground">Référence ligne budgétaire</p>
                  <p>
                    Engagé : {formatMoney(selectedDirectLine.committedAmount)} · Consommé :{' '}
                    {formatMoney(selectedDirectLine.consumedAmount)}
                  </p>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
          <div className="grid gap-3 border-t border-border/60 pt-3">
            <div className="grid gap-2">
              <Label htmlFor="fin-label">Libellé</Label>
              <Input
                id="fin-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Intitulé de la ligne"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fin-amt">Montant prévisionnel (scénario)</Label>
              <Input
                id="fin-amt"
                value={amountPlanned}
                onChange={(e) => setAmountPlanned(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Saisie libre pour la projection : ne met pas à jour le budget ni les lignes
                référentielles.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fin-ccy">Devise de la ligne</Label>
              <Input
                id="fin-ccy"
                value={currencyCode}
                onChange={(e) =>
                  setCurrencyCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, '')
                      .slice(0, 3),
                  )
                }
                maxLength={3}
                placeholder="EUR"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby="fin-ccy-hint"
              />
              <p id="fin-ccy-hint" className="text-[11px] leading-relaxed text-muted-foreground">
                Code ISO 4217 pour cette ligne de projection. Repris automatiquement de la{' '}
                <strong>ligne budgétaire</strong> lorsque tu en sélectionnes une ; tu peux l’ajuster
                pour le scénario (sans impact sur le budget référentiel).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || !canSubmitCreate}
              onClick={() => createMutation.mutate()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScenarioBudgetLineRow({
  line,
  projectLinks,
  lineById,
  envelopeNameById,
  readOnly,
  onDelete,
  deletePending,
  onSavePlannedAmount,
  savePlannedPending,
}: {
  line: ProjectScenarioFinancialLineApi;
  projectLinks: ProjectBudgetLinkItem[];
  lineById: Map<string, BudgetLine>;
  envelopeNameById: Map<string, string>;
  readOnly: boolean;
  onDelete: () => void;
  deletePending: boolean;
  onSavePlannedAmount: (amount: string) => Promise<unknown>;
  savePlannedPending: boolean;
}) {
  const [plannedDraft, setPlannedDraft] = useState(line.amountPlanned);
  useEffect(() => {
    setPlannedDraft(line.amountPlanned);
  }, [line.id, line.amountPlanned, line.updatedAt]);

  const link = line.projectBudgetLinkId
    ? projectLinks.find((l) => l.id === line.projectBudgetLinkId)
    : undefined;
  const bl = line.budgetLineId ? lineById.get(line.budgetLineId) ?? null : null;

  const envelopeId = link?.budgetLine.envelopeId ?? bl?.envelopeId ?? null;

  const rule =
    link != null
      ? formatProjectBudgetAllocation(link)
      : line.projectBudgetLink != null
        ? formatAllocationRule(
            line.projectBudgetLink.allocationType,
            line.projectBudgetLink.percentage,
            line.projectBudgetLink.amount,
          )
        : bl != null
          ? 'Ligne budgétaire (sans liaison projet)'
          : '—';

  const engaged = link?.budgetLine.committedAmount ?? bl?.committedAmount;
  const consumed = link?.budgetLine.consumedAmount ?? bl?.consumedAmount;

  return (
    <TableRow>
      <TableCell className="font-medium">{lineDisplayLabel(line)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {envelopeId ? envelopeNameById.get(envelopeId) ?? envelopeId : '—'}
      </TableCell>
      <TableCell className="max-w-[220px] text-xs">{rule}</TableCell>
      <TableCell className="text-right tabular-nums text-xs">{formatMoney(engaged)}</TableCell>
      <TableCell className="text-right tabular-nums text-xs">{formatMoney(consumed)}</TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <Input
            className="h-8 w-[7.5rem] text-right tabular-nums text-sm"
            value={plannedDraft}
            onChange={(e) => setPlannedDraft(e.target.value)}
            onBlur={() => {
              if (readOnly || savePlannedPending) return;
              const next = plannedDraft.trim();
              if (next === line.amountPlanned.trim()) return;
              if (next === '') {
                setPlannedDraft(line.amountPlanned);
                return;
              }
              void onSavePlannedAmount(next).catch(() => {
                setPlannedDraft(line.amountPlanned);
              });
            }}
            disabled={readOnly || savePlannedPending}
            aria-label={`Montant prévisionnel scénario pour ${lineDisplayLabel(line)}`}
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {line.currencyCode ?? '—'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={readOnly || deletePending || savePlannedPending}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </TableCell>
    </TableRow>
  );
}
