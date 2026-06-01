'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast';
import {
  formatGovernancePriorityScore,
  getGovernanceCycleItemDisplayLabel,
} from '../lib/governance-cycle-formatters';
import {
  groupProjectBudgetCycleItems,
  isAgendaCandidateItem,
} from '../lib/governance-cycle-agenda-candidates';
import {
  getApiErrorMessage,
  usePatchGovernanceCycleItemArbitrationMutation,
} from '../hooks/use-governance-cycles';
import type { GovernanceCycleInstanceStatus } from '../types/governance-cycle-instance.types';
import type { GovernanceCycleItemResponseDto } from '../types/governance-cycle.types';
import { GovernanceCycleDecisionBadge } from './governance-cycle-decision-badge';

function PreparationRow({
  item,
  inAgenda,
  canEditAgenda,
  canArbitrate,
  savingAgenda,
  onToggleAgenda,
  onMarkCandidate,
}: {
  item: GovernanceCycleItemResponseDto;
  inAgenda: boolean;
  canEditAgenda: boolean;
  canArbitrate: boolean;
  savingAgenda: boolean;
  onToggleAgenda: (checked: boolean) => void;
  onMarkCandidate: () => Promise<void>;
}) {
  const candidate = isAgendaCandidateItem(item);
  const [marking, setMarking] = useState(false);

  return (
    <TableRow>
      <TableCell className="w-10">
        {candidate ? (
          <Checkbox
            checked={inAgenda}
            disabled={!canEditAgenda || savingAgenda}
            onCheckedChange={(v) => onToggleAgenda(v === true)}
            aria-label={`Inclure ${getGovernanceCycleItemDisplayLabel(item)} à l'ordre du jour`}
          />
        ) : (
          <span className="text-muted-foreground text-xs" title="Non candidat">
            —
          </span>
        )}
      </TableCell>
      <TableCell className="min-w-0 max-w-[280px]">
        <span className="block truncate text-sm">
          {getGovernanceCycleItemDisplayLabel(item)}
        </span>
      </TableCell>
      <TableCell>
        <GovernanceCycleDecisionBadge status={item.decisionStatus} />
      </TableCell>
      <TableCell className="tabular-nums text-right text-sm text-muted-foreground">
        {formatGovernancePriorityScore(item.priorityScore)}
      </TableCell>
      <TableCell className="text-right">
        {!candidate && canArbitrate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={marking}
            onClick={async () => {
              setMarking(true);
              try {
                await onMarkCandidate();
              } finally {
                setMarking(false);
              }
            }}
          >
            Remettre en candidat
          </Button>
        ) : !candidate ? (
          <span className="text-xs text-muted-foreground">Arbitrage requis</span>
        ) : inAgenda ? (
          <span className="text-xs text-primary">À l&apos;ODJ</span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function PreparationTable({
  title,
  items,
  agendaSelection,
  canEditAgenda,
  canArbitrate,
  savingAgenda,
  onToggleAgenda,
  onMarkCandidate,
}: {
  title: string;
  items: GovernanceCycleItemResponseDto[];
  agendaSelection: string[];
  canEditAgenda: boolean;
  canArbitrate: boolean;
  savingAgenda: boolean;
  onToggleAgenda: (itemId: string, checked: boolean) => void;
  onMarkCandidate: (itemId: string) => Promise<void>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-1">{title}</p>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">ODJ</TableHead>
              <TableHead>Élément</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right w-[140px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <PreparationRow
                key={item.id}
                item={item}
                inAgenda={agendaSelection.includes(item.id)}
                canEditAgenda={canEditAgenda}
                canArbitrate={canArbitrate}
                savingAgenda={savingAgenda}
                onToggleAgenda={(checked) => onToggleAgenda(item.id, checked)}
                onMarkCandidate={() => onMarkCandidate(item.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function InstanceSessionPreparation({
  cycleId,
  instanceStatus,
  cycleItems,
  itemsLoading,
  itemsError,
  onRetryItems,
  agendaSelection,
  agendaCount,
  canEditAgenda,
  canUpdate,
  canArbitrate,
  savingAgenda,
  onToggleAgenda,
  onSelectAllCandidates,
  onSaveAgenda,
  onGoToArbitration,
}: {
  cycleId: string;
  instanceStatus: GovernanceCycleInstanceStatus;
  cycleItems: GovernanceCycleItemResponseDto[];
  itemsLoading: boolean;
  itemsError: unknown;
  onRetryItems: () => void;
  agendaSelection: string[];
  agendaCount: number;
  canEditAgenda: boolean;
  canUpdate: boolean;
  canArbitrate: boolean;
  savingAgenda: boolean;
  onToggleAgenda: (itemId: string, checked: boolean) => void;
  onSelectAllCandidates: () => void;
  onSaveAgenda: () => void;
  onGoToArbitration?: () => void;
}) {
  const arbitrateMutation = usePatchGovernanceCycleItemArbitrationMutation(cycleId);
  const { projects, budgets } = useMemo(
    () => groupProjectBudgetCycleItems(cycleItems),
    [cycleItems],
  );
  const projectBudgetCount = projects.length + budgets.length;
  const candidateInAgendaCount = agendaSelection.length;

  async function markAsCandidate(itemId: string) {
    try {
      await arbitrateMutation.mutateAsync({
        itemId,
        body: { decisionStatus: 'CANDIDATE' },
      });
      toast.success('Élément remis en candidat — vous pouvez l’ajouter à l’ODJ');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  if (!canUpdate) {
    return (
      <p className="text-sm text-muted-foreground">
        Permission <code className="text-xs">governance_cycles.update</code> requise pour
        préparer l&apos;ordre du jour.
      </p>
    );
  }

  if (itemsLoading) {
    return <LoadingState rows={3} />;
  }

  if (itemsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-2">
          <span>
            {getApiErrorMessage(itemsError, 'Impossible de charger les éléments du cycle.')}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onRetryItems}>
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const preparing =
    instanceStatus === 'DRAFT' ||
    instanceStatus === 'PLANNED' ||
    instanceStatus === 'OPEN';

  if (!preparing) return null;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div>
        <h4 className="text-sm font-medium">Préparation de la séance</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Étape 1 — Cochez les points à examiner (statut <strong>Candidat</strong>).
          Étape 2 — Enregistrez l&apos;ordre du jour. Étape 3 — Ouvrez la séance quand vous êtes
          prêt.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border bg-background px-2 py-0.5">
          {projectBudgetCount} projet(s) / budget(s)
        </span>
        <span className="rounded-full border bg-background px-2 py-0.5">
          {candidateInAgendaCount} point(s) à l&apos;ODJ
        </span>
        {agendaCount !== candidateInAgendaCount ? (
          <span className="text-muted-foreground">(enregistré : {agendaCount})</span>
        ) : null}
      </div>

      {projectBudgetCount === 0 ? (
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Aucun projet ni budget dans ce cycle.</p>
          <p className="text-xs">
            Ajoutez des éléments via « Ajouter un élément » ou proposez un projet depuis sa fiche
            (« Soumettre au cycle de pilotage »).
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[min(420px,50vh)] overflow-y-auto pr-1">
          <PreparationTable
            title={`Projets (${projects.length})`}
            items={projects}
            agendaSelection={agendaSelection}
            canEditAgenda={canEditAgenda}
            canArbitrate={canArbitrate}
            savingAgenda={savingAgenda}
            onToggleAgenda={onToggleAgenda}
            onMarkCandidate={markAsCandidate}
          />
          <PreparationTable
            title={`Budgets (${budgets.length})`}
            items={budgets}
            agendaSelection={agendaSelection}
            canEditAgenda={canEditAgenda}
            canArbitrate={canArbitrate}
            savingAgenda={savingAgenda}
            onToggleAgenda={onToggleAgenda}
            onMarkCandidate={markAsCandidate}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canEditAgenda || savingAgenda}
          onClick={onSelectAllCandidates}
        >
          Tous les candidats
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canEditAgenda || savingAgenda}
          onClick={onSaveAgenda}
        >
          Enregistrer l&apos;ordre du jour
        </Button>
        {onGoToArbitration ? (
          <Button type="button" size="sm" variant="ghost" onClick={onGoToArbitration}>
            Matrice d&apos;arbitrage
          </Button>
        ) : null}
      </div>

      {instanceStatus === 'PLANNED' && agendaCount === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          L&apos;ordre du jour est vide : cochez au moins un candidat puis enregistrez avant
          d&apos;ouvrir la séance.
        </p>
      ) : null}
    </div>
  );
}
