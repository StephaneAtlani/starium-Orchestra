'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { getGovernanceCycleItemDisplayLabel } from '../lib/governance-cycle-formatters';
import {
  filterAgendaSelectionToCandidates,
  isAgendaCandidateItem,
} from '../lib/governance-cycle-agenda-candidates';
import { getGovernanceCycleInstanceStatusLabel } from '../lib/governance-cycle-labels';
import { InstanceSessionPreparation } from './instance-session-preparation';
import { useGovernanceCycleItemsQuery } from '../api/governance-cycles.queries';
import {
  getApiErrorMessage,
  usePatchInstanceDecisionsMutation,
  useReplaceInstanceAgendaMutation,
  useUpdateGovernanceCycleInstanceMutation,
} from '../api/governance-cycle-instances.queries';
import type { GovernanceCycleInstanceDetailDto } from '../types/governance-cycle-instance.types';
import type {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemResponseDto,
} from '../types/governance-cycle.types';
import { GovernanceCycleDecisionBadge } from './governance-cycle-decision-badge';

function sameIdList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, index) => id === sb[index]);
}

const EMPTY_CYCLE_ITEMS: GovernanceCycleItemResponseDto[] = [];
/** API max @see ListGovernanceCycleItemsQueryDto */
const CYCLE_ITEMS_LIST_PARAMS = { limit: 100, offset: 0 } as const;

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InstanceDecisionPanel({
  cycleId,
  instance,
  canUpdate,
  canArbitrate,
  finalDecisionOptions,
  onOpen,
  onClose,
  getDecisionLabel,
  onGoToArbitration,
}: {
  cycleId: string;
  instance: GovernanceCycleInstanceDetailDto;
  canUpdate: boolean;
  canArbitrate: boolean;
  finalDecisionOptions: Array<{ value: string; label: string }>;
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  getDecisionLabel: (s: GovernanceCycleItemDecisionStatus) => string;
  onGoToArbitration?: () => void;
}) {
  const [agendaSelection, setAgendaSelection] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<
    Record<string, { status: string; reason?: string }>
  >({});
  const [draftPeriodLabel, setDraftPeriodLabel] = useState(instance.periodLabel ?? '');
  const [draftScheduledAt, setDraftScheduledAt] = useState(
    toDatetimeLocalValue(instance.scheduledDecisionAt),
  );

  const itemsQuery = useGovernanceCycleItemsQuery(cycleId, CYCLE_ITEMS_LIST_PARAMS, {
    eager: true,
  });
  const cycleItems = useMemo(
    () => itemsQuery.data?.items ?? EMPTY_CYCLE_ITEMS,
    [itemsQuery.data?.items],
  );
  const cycleItemsReady = itemsQuery.isFetched;

  const replaceAgenda = useReplaceInstanceAgendaMutation(cycleId, instance.id);
  const updateInstance = useUpdateGovernanceCycleInstanceMutation(cycleId, instance.id);
  const patchDecisions = usePatchInstanceDecisionsMutation(cycleId, instance.id);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pruneAttemptedRef = useRef<string | null>(null);

  const agendaSignature = useMemo(
    () =>
      instance.agenda
        .map((a) => `${a.itemId}:${a.sortOrder}:${a.item.decisionStatus}`)
        .join('|'),
    [instance.agenda],
  );

  const serverAgendaIds = useMemo(
    () => instance.agenda.map((a) => a.itemId),
    [agendaSignature],
  );

  const cycleItemsSignature = useMemo(
    () => cycleItems.map((i) => `${i.id}:${i.decisionStatus}`).join('|'),
    [cycleItems],
  );

  const decisionsSignature = useMemo(
    () => JSON.stringify(instance.decisions),
    [instance.decisions],
  );

  const agendaEntries = useMemo(
    () => [...instance.agenda].sort((a, b) => a.sortOrder - b.sortOrder),
    [instance.agenda],
  );

  const canEditAgenda =
    canUpdate &&
    (instance.status === 'DRAFT' ||
      instance.status === 'PLANNED' ||
      instance.status === 'OPEN');

  const persistAgenda = useCallback(
    async (ids: string[]) => {
      const filtered = filterAgendaSelectionToCandidates(ids, cycleItems);
      try {
        await replaceAgenda.mutateAsync(filtered);
      } catch (e) {
        toast.error(getApiErrorMessage(e));
      }
    },
    [cycleItems, replaceAgenda],
  );

  const scheduleAgendaSave = useCallback(
    (next: string[]) => {
      const filtered = filterAgendaSelectionToCandidates(next, cycleItems);
      setAgendaSelection(filtered);
      if (!canEditAgenda) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistAgenda(filtered);
      }, 400);
    },
    [canEditAgenda, cycleItems, persistAgenda],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setDraftPeriodLabel(instance.periodLabel ?? '');
    setDraftScheduledAt(toDatetimeLocalValue(instance.scheduledDecisionAt));
  }, [instance.id, instance.periodLabel, instance.scheduledDecisionAt]);

  useEffect(() => {
    pruneAttemptedRef.current = null;
  }, [instance.id]);

  useEffect(() => {
    if (!cycleItemsReady) {
      setAgendaSelection((prev) =>
        sameIdList(prev, serverAgendaIds) ? prev : serverAgendaIds,
      );
      return;
    }

    const synced = filterAgendaSelectionToCandidates(serverAgendaIds, cycleItems);
    setAgendaSelection((prev) => (sameIdList(prev, synced) ? prev : synced));

    const map: Record<string, { status: string; reason?: string }> = {};
    for (const d of instance.decisions) {
      map[d.itemId] = { status: d.decisionStatus, reason: d.decisionReason ?? undefined };
    }
    for (const a of instance.agenda) {
      if (!map[a.itemId]) {
        map[a.itemId] = { status: a.item.decisionStatus };
      }
    }
    setDecisions((prev) => {
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(map);
      return prevJson === nextJson ? prev : map;
    });

    if (!cycleItemsReady || !canEditAgenda || replaceAgenda.isPending) return;

    const serverKey = [...serverAgendaIds].sort().join(',');
    const syncedKey = [...synced].sort().join(',');
    if (serverKey === syncedKey) return;

    const pruneToken = `${instance.id}|${serverKey}|${syncedKey}`;
    if (pruneAttemptedRef.current === pruneToken) return;
    pruneAttemptedRef.current = pruneToken;

    void replaceAgenda.mutateAsync(synced).catch((e) => {
      pruneAttemptedRef.current = null;
      toast.error(getApiErrorMessage(e));
    });
  }, [
    serverAgendaIds,
    cycleItemsSignature,
    decisionsSignature,
    agendaSignature,
    instance.id,
    instance.updatedAt,
    canEditAgenda,
    replaceAgenda.isPending,
    cycleItems,
    cycleItemsReady,
  ]);

  function toggleAgendaItem(itemId: string, checked: boolean) {
    const next = checked
      ? [...agendaSelection, itemId]
      : agendaSelection.filter((id) => id !== itemId);
    scheduleAgendaSave(next);
  }

  function selectAllCandidates() {
    scheduleAgendaSave(cycleItems.filter(isAgendaCandidateItem).map((i) => i.id));
  }

  function saveAgendaNow() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistAgenda(agendaSelection);
  }

  async function planInstance() {
    const periodLabel = draftPeriodLabel.trim();
    if (!periodLabel || !draftScheduledAt) {
      toast.error('Période et date de décision sont requises pour programmer la séance');
      return;
    }
    try {
      await updateInstance.mutateAsync({
        periodLabel,
        scheduledDecisionAt: new Date(draftScheduledAt).toISOString(),
      });
      toast.success('Séance programmée');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  async function saveDecisions() {
    const orderedIds = agendaEntries.map((a) => a.itemId);
    const payload = orderedIds
      .filter((itemId) => decisions[itemId]?.status)
      .map((itemId) => ({
        itemId,
        decisionStatus: decisions[itemId].status,
        decisionReason: decisions[itemId].reason ?? null,
      }));
    if (payload.length === 0) {
      toast.error('Aucune décision à enregistrer');
      return;
    }
    try {
      await patchDecisions.mutateAsync(payload);
      toast.success('Décisions enregistrées');
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{instance.periodLabel ?? 'Séance'}</h3>
        <p className="text-xs text-muted-foreground">
          Statut : {getGovernanceCycleInstanceStatusLabel(instance.status)}
        </p>
      </div>

      {instance.status === 'DRAFT' && canUpdate ? (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            Complétez la période et la date pour passer en{' '}
            <strong>programmée</strong>, puis ouvrez la séance.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="panel-period">Période arbitrée</Label>
              <Input
                id="panel-period"
                placeholder="T1 2026"
                value={draftPeriodLabel}
                onChange={(e) => setDraftPeriodLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="panel-date">Date de décision</Label>
              <Input
                id="panel-date"
                type="datetime-local"
                value={draftScheduledAt}
                onChange={(e) => setDraftScheduledAt(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={updateInstance.isPending}
            onClick={() => void planInstance()}
          >
            Programmer la séance
          </Button>
        </div>
      ) : null}

      {agendaEntries.length > 0 ? (
        <div className="space-y-2">
          <Label>Ordre du jour enregistré ({agendaEntries.length})</Label>
          <ol className="space-y-2 rounded-md border p-3 text-sm">
            {agendaEntries.map((entry, index) => (
              <li key={entry.itemId} className="flex items-center gap-2">
                <span className="text-muted-foreground tabular-nums w-5">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  {getGovernanceCycleItemDisplayLabel(entry.item)}
                </span>
                <GovernanceCycleDecisionBadge status={entry.item.decisionStatus} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <InstanceSessionPreparation
        cycleId={cycleId}
        instanceStatus={instance.status}
        cycleItems={cycleItems}
        itemsLoading={itemsQuery.isLoading && cycleItems.length === 0}
        itemsError={itemsQuery.isError ? itemsQuery.error : null}
        onRetryItems={() => void itemsQuery.refetch()}
        agendaSelection={agendaSelection}
        agendaCount={agendaEntries.length}
        canEditAgenda={canEditAgenda}
        canUpdate={canUpdate}
        canArbitrate={canArbitrate}
        savingAgenda={replaceAgenda.isPending}
        onToggleAgenda={toggleAgendaItem}
        onSelectAllCandidates={selectAllCandidates}
        onSaveAgenda={saveAgendaNow}
        onGoToArbitration={onGoToArbitration}
      />

      {replaceAgenda.isPending ? (
        <p className="text-xs text-muted-foreground">Mise à jour de l&apos;ordre du jour…</p>
      ) : null}

      {instance.status === 'PLANNED' && canUpdate ? (
        <Button
          size="sm"
          onClick={onOpen}
          disabled={agendaEntries.length === 0}
          title={
            agendaEntries.length === 0
              ? 'Incluez au moins un candidat à l’ordre du jour'
              : undefined
          }
        >
          Ouvrir la séance
        </Button>
      ) : null}

      {instance.status === 'OPEN' && canArbitrate ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Décisions (séance ouverte)</p>
          {agendaEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              L&apos;ordre du jour est vide — incluez des candidats avant d&apos;arbitrer.
            </p>
          ) : (
            agendaEntries.map((entry) => {
              const itemId = entry.itemId;
              const label = getGovernanceCycleItemDisplayLabel(entry.item);
              return (
                <div key={itemId} className="grid gap-2 sm:grid-cols-2 items-end border-b pb-3">
                  <div className="sm:col-span-2 flex items-center gap-2 min-w-0">
                    <p className="text-sm truncate flex-1">{label}</p>
                    <GovernanceCycleDecisionBadge status={entry.item.decisionStatus} />
                  </div>
                  <Select
                    value={decisions[itemId]?.status ?? ''}
                    onValueChange={(v) => {
                      if (!v) return;
                      setDecisions((d) => ({ ...d, [itemId]: { ...d[itemId], status: v } }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Décision de séance" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalDecisionOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={saveDecisions}
              disabled={patchDecisions.isPending || agendaEntries.length === 0}
            >
              Enregistrer les décisions
            </Button>
            <Button size="sm" onClick={onClose} disabled={agendaEntries.length === 0}>
              Clôturer la séance
            </Button>
          </div>
        </div>
      ) : null}

      {instance.status === 'CLOSED' ? (
        <ul className="text-sm space-y-2">
          {instance.decisions.length === 0 && agendaEntries.length > 0
            ? agendaEntries.map((entry) => (
                <li key={entry.itemId} className="flex flex-wrap items-center gap-2">
                  <span className="truncate">
                    {getGovernanceCycleItemDisplayLabel(entry.item)}
                  </span>
                  <GovernanceCycleDecisionBadge status={entry.item.decisionStatus} />
                </li>
              ))
            : instance.decisions.map((d) => {
                const item =
                  instance.agenda.find((a) => a.itemId === d.itemId)?.item ??
                  agendaEntries.find((a) => a.itemId === d.itemId)?.item;
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="truncate">
                      {item ? getGovernanceCycleItemDisplayLabel(item) : d.itemId} :{' '}
                      {getDecisionLabel(d.decisionStatus as GovernanceCycleItemDecisionStatus)}
                    </span>
                  </li>
                );
              })}
        </ul>
      ) : null}
    </div>
  );
}
