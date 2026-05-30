'use client';

import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionGate } from '@/components/PermissionGate';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  formatGovernancePriorityScore,
  getGovernanceCycleItemDisplayLabel,
} from '../lib/governance-cycle-formatters';
import { getGovernanceCycleItemSourceTypeLabel } from '../lib/governance-cycle-labels';
import type {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemResponseDto,
} from '../types/governance-cycle.types';
import {
  getApiErrorMessage,
  useDeleteGovernanceCycleItemMutation,
  useGovernanceCycleItemsQuery,
  usePatchGovernanceCycleItemArbitrationMutation,
} from '../hooks/use-governance-cycles';
import { GovernanceCycleDecisionBadge } from './governance-cycle-decision-badge';
import { GovernanceCycleItemScoresDialog } from './governance-cycle-item-scores-dialog';

const ARBITRATION_ACTIONS: Array<{
  status: GovernanceCycleItemDecisionStatus;
  label: string;
}> = [
  { status: 'ACCEPTED', label: 'Retenir' },
  { status: 'DEFERRED', label: 'Différer' },
  { status: 'REJECTED', label: 'Refuser' },
  { status: 'NEEDS_INFORMATION', label: 'Demander complément' },
  { status: 'ACCEPTED_WITH_RESERVE', label: 'Accepter sous réserve' },
];

function ScoreCell({ value }: { value: number | null }) {
  return <span className="tabular-nums">{value ?? '—'}</span>;
}

function ItemActionsCell({
  item,
  cycleId,
  onEditScores,
}: {
  item: GovernanceCycleItemResponseDto;
  cycleId: string;
  onEditScores: (item: GovernanceCycleItemResponseDto) => void;
}) {
  const { has } = usePermissions();
  const canArbitrate = has('governance_cycles.arbitrate');
  const canUpdate = has('governance_cycles.update');
  const arbitrateMutation = usePatchGovernanceCycleItemArbitrationMutation(cycleId);
  const deleteMutation = useDeleteGovernanceCycleItemMutation(cycleId);
  const [actionKey, setActionKey] = useState('');

  if (!canArbitrate && !canUpdate) return null;

  async function handleArbitration(status: GovernanceCycleItemDecisionStatus) {
    try {
      await arbitrateMutation.mutateAsync({
        itemId: item.id,
        body: { decisionStatus: status },
      });
      toast.success('Décision enregistrée');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionKey('');
    }
  }

  async function handleDelete() {
    const label = getGovernanceCycleItemDisplayLabel(item);
    if (!window.confirm(`Retirer « ${label} » du cycle ?`)) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Élément retiré du cycle');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {canArbitrate ? (
        <Select
          value={actionKey}
          onValueChange={(v) => {
            if (v.startsWith('arb:')) {
              void handleArbitration(v.replace('arb:', '') as GovernanceCycleItemDecisionStatus);
            } else if (v === 'scores') {
              onEditScores(item);
              setActionKey('');
            } else if (v === 'delete') {
              void handleDelete();
              setActionKey('');
            } else {
              setActionKey(v);
            }
          }}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Arbitrer…" />
          </SelectTrigger>
          <SelectContent>
            {ARBITRATION_ACTIONS.map((action) => (
              <SelectItem key={action.status} value={`arb:${action.status}`}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {canUpdate ? (
        <>
          <Button variant="outline" size="sm" onClick={() => onEditScores(item)}>
            Scores
          </Button>
          <PermissionGate permission="governance_cycles.update">
            <Button variant="outline" size="sm" onClick={() => void handleDelete()}>
              Retirer
            </Button>
          </PermissionGate>
        </>
      ) : null}
    </div>
  );
}

export function GovernanceCycleArbitrationTable({ cycleId }: { cycleId: string }) {
  const itemsQuery = useGovernanceCycleItemsQuery(cycleId, { limit: 100, offset: 0 });
  const [scoresItem, setScoresItem] = useState<GovernanceCycleItemResponseDto | null>(null);
  const items = itemsQuery.data?.items ?? [];

  if (itemsQuery.isLoading) {
    return <LoadingState label="Chargement de la matrice…" />;
  }

  if (itemsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(itemsQuery.error, 'Impossible de charger les éléments.')}
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun élément"
        description="Ajoutez des projets, budgets ou éléments manuels pour préparer l'arbitrage."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élément</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Val.</TableHead>
              <TableHead className="text-center">Align.</TableHead>
              <TableHead className="text-center">Budg.</TableHead>
              <TableHead className="text-center">Cap.</TableHead>
              <TableHead className="text-center">Risq.</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{getGovernanceCycleItemDisplayLabel(item)}</TableCell>
                <TableCell>{getGovernanceCycleItemSourceTypeLabel(item.sourceType)}</TableCell>
                <TableCell className="text-center">
                  <ScoreCell value={item.valueScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell value={item.alignmentScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell value={item.budgetScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell value={item.capacityScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell value={item.riskScore} />
                </TableCell>
                <TableCell className="text-center font-semibold tabular-nums">
                  {formatGovernancePriorityScore(item.priorityScore)}
                </TableCell>
                <TableCell>
                  <GovernanceCycleDecisionBadge status={item.decisionStatus} />
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {item.decisionReason?.trim() || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <ItemActionsCell
                    item={item}
                    cycleId={cycleId}
                    onEditScores={setScoresItem}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <GovernanceCycleItemScoresDialog
        open={Boolean(scoresItem)}
        onOpenChange={(open) => {
          if (!open) setScoresItem(null);
        }}
        cycleId={cycleId}
        item={scoresItem}
      />
    </>
  );
}

/** Table lecture seule pour onglets secondaires. */
export function GovernanceCycleItemsReadTable({
  cycleId,
  enabled,
  filter,
  emptyTitle,
  emptyDescription,
}: {
  cycleId: string;
  enabled: boolean;
  filter: (item: GovernanceCycleItemResponseDto) => boolean;
  emptyTitle: string;
  emptyDescription?: string;
}) {
  const itemsQuery = useGovernanceCycleItemsQuery(
    cycleId,
    { limit: 100, offset: 0 },
    { enabled },
  );

  const filtered = useMemo(
    () => (itemsQuery.data?.items ?? []).filter(filter),
    [itemsQuery.data?.items, filter],
  );

  if (itemsQuery.isLoading) {
    return <LoadingState label="Chargement…" />;
  }

  if (itemsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(itemsQuery.error, 'Impossible de charger les éléments.')}
        </AlertDescription>
      </Alert>
    );
  }

  if (filtered.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Élément</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead>Décision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{getGovernanceCycleItemDisplayLabel(item)}</TableCell>
              <TableCell>{getGovernanceCycleItemSourceTypeLabel(item.sourceType)}</TableCell>
              <TableCell className="text-center tabular-nums">
                {formatGovernancePriorityScore(item.priorityScore)}
              </TableCell>
              <TableCell>
                <GovernanceCycleDecisionBadge status={item.decisionStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
