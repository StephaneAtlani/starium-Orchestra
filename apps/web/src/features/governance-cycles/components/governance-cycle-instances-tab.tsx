'use client';

import { useMemo, useState } from 'react';
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
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import {
  getApiErrorMessage,
  useCloseGovernanceCycleInstanceMutation,
  useCreateGovernanceCycleInstanceMutation,
  useGenerateInstancesMutation,
  useGovernanceCycleInstanceDetailQuery,
  useGovernanceCycleInstancesQuery,
  useOpenGovernanceCycleInstanceMutation,
  usePatchInstanceDecisionsMutation,
} from '../api/governance-cycle-instances.queries';
import { useGovernanceCycleDetailQuery, useGovernanceCycleItemsQuery } from '../api/governance-cycles.queries';
import {
  getGovernanceCycleInstanceModeLabel,
  getGovernanceCycleInstanceStatusLabel,
  getGovernanceCycleItemDecisionLabel,
  GOVERNANCE_CYCLE_ITEM_DECISION_OPTIONS,
} from '../lib/governance-cycle-labels';
import type { GovernanceCycleItemDecisionStatus } from '../types/governance-cycle.types';
import { formatGovernanceCycleDateTime } from '../lib/governance-cycle-formatters';
import { InstanceDecisionPanel } from './instance-decision-panel';

const FINAL_DECISIONS: GovernanceCycleItemDecisionStatus[] = [
  'ACCEPTED',
  'DEFERRED',
  'REJECTED',
  'NEEDS_INFORMATION',
  'ACCEPTED_WITH_RESERVE',
];

export function GovernanceCycleInstancesTab({
  cycleId,
  enabled,
}: {
  cycleId: string;
  enabled: boolean;
}) {
  const { has } = usePermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const cycleQuery = useGovernanceCycleDetailQuery(cycleId, { enabled });
  const instancesQuery = useGovernanceCycleInstancesQuery(cycleId, { enabled });
  const instanceDetailQuery = useGovernanceCycleInstanceDetailQuery(cycleId, selectedId, {
    enabled: enabled && Boolean(selectedId),
  });
  const itemsQuery = useGovernanceCycleItemsQuery(cycleId, { limit: 200 }, { enabled });

  const createMutation = useCreateGovernanceCycleInstanceMutation(cycleId);
  const openMutation = useOpenGovernanceCycleInstanceMutation(cycleId);
  const closeMutation = useCloseGovernanceCycleInstanceMutation(cycleId);
  const generateMutation = useGenerateInstancesMutation(cycleId);

  const scheduleEnabled =
    cycleQuery.data?.governanceConfig?.instanceSchedule?.enabled === true;

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data?.items ?? []).map((i) => ({
        id: i.id,
        label: i.sourceRef?.label ? `${i.title} (${i.sourceRef.label})` : i.title,
      })),
    [itemsQuery.data?.items],
  );

  if (!enabled) return null;

  if (instancesQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  async function handleCreate() {
    try {
      const created = await createMutation.mutateAsync({
        ...(periodLabel.trim() ? { periodLabel: periodLabel.trim() } : {}),
        ...(scheduledAt ? { scheduledDecisionAt: new Date(scheduledAt).toISOString() } : {}),
        mode: 'MEETING',
      });
      toast.success('Séance créée');
      setSelectedId(created.id);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Séances de décision</h2>
          <PermissionGate permission="governance_cycles.update">
            <div className="flex flex-wrap gap-2">
              {scheduleEnabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generateMutation.isPending}
                  onClick={async () => {
                    try {
                      await generateMutation.mutateAsync();
                      toast.success('Instances générées');
                      void instancesQuery.refetch();
                    } catch (e) {
                      toast.error(getApiErrorMessage(e));
                    }
                  }}
                >
                  Générer le trimestre
                </Button>
              ) : null}
            </div>
          </PermissionGate>
        </div>

        <PermissionGate permission="governance_cycles.update">
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Nouvelle séance</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="inst-period">Période arbitrée</Label>
                <Input
                  id="inst-period"
                  placeholder="T1 2026"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inst-date">Date de décision</Label>
                <Input
                  id="inst-date"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              + Séance de décision
            </Button>
          </div>
        </PermissionGate>

        <ul className="space-y-2">
          {(instancesQuery.data?.items ?? []).map((inst) => (
            <li key={inst.id}>
              <button
                type="button"
                onClick={() => setSelectedId(inst.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === inst.id ? 'border-primary bg-muted/40' : 'hover:bg-muted/30'
                }`}
              >
                <div className="font-medium">
                  {inst.periodLabel ?? 'Sans période'}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {getGovernanceCycleInstanceStatusLabel(inst.status)}
                  </span>
                </div>
                {inst.scheduledDecisionAt ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Date de décision : {formatGovernanceCycleDateTime(inst.scheduledDecisionAt)}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {getGovernanceCycleInstanceModeLabel(inst.mode)} · Agenda {inst.agendaCount}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-[200px] rounded-lg border p-4">
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">Sélectionnez une séance pour la gérer.</p>
        ) : instanceDetailQuery.isLoading || !instanceDetailQuery.data ? (
          <LoadingState rows={4} />
        ) : (
          <InstanceDecisionPanel
            cycleId={cycleId}
            instance={instanceDetailQuery.data}
            itemOptions={itemOptions}
            canUpdate={has('governance_cycles.update')}
            canArbitrate={has('governance_cycles.arbitrate')}
            finalDecisionOptions={GOVERNANCE_CYCLE_ITEM_DECISION_OPTIONS.filter((o) =>
              FINAL_DECISIONS.includes(o.value as GovernanceCycleItemDecisionStatus),
            )}
            onOpen={async () => {
              try {
                await openMutation.mutateAsync(selectedId);
                toast.success('Séance ouverte');
                void instanceDetailQuery.refetch();
              } catch (e) {
                toast.error(getApiErrorMessage(e));
              }
            }}
            onClose={async () => {
              try {
                await closeMutation.mutateAsync(selectedId);
                toast.success('Séance clôturée');
                void instancesQuery.refetch();
                void instanceDetailQuery.refetch();
              } catch (e) {
                toast.error(getApiErrorMessage(e));
              }
            }}
            getDecisionLabel={getGovernanceCycleItemDecisionLabel}
          />
        )}
      </div>
    </div>
  );
}
