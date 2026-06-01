'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/feedback/loading-state';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import { ChevronLeft, Plus } from 'lucide-react';
import {
  formatGovernanceCycleDateRange,
} from '../lib/governance-cycle-formatters';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import {
  getApiErrorMessage,
  useArchiveGovernanceCycleMutation,
  useGovernanceCycleDetailQuery,
  useUpdateGovernanceCycleMutation,
} from '../hooks/use-governance-cycles';
import { GovernanceCycleFormDialog } from './governance-cycle-form-dialog';
import { GovernanceCycleStatusBadge } from './governance-cycle-status-badge';
import { GovernanceCycleOverviewTab } from './governance-cycle-overview-tab';
import {
  GovernanceCycleArbitrationTable,
  GovernanceCycleItemsReadTable,
} from './governance-cycle-arbitration-table';
import { AddCycleItemDialog } from './add-cycle-item-dialog';
import { GovernanceCycleInstancesTab } from './governance-cycle-instances-tab';

type TabValue =
  | 'overview'
  | 'instances'
  | 'arbitration'
  | 'projects'
  | 'budget'
  | 'risks'
  | 'decisions'
  | 'documents';

export function GovernanceCycleDetailPage({ cycleId }: { cycleId: string }) {
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('governance_cycles.read');
  const detailQuery = useGovernanceCycleDetailQuery(cycleId, {
    enabled: permsSuccess && canRead && Boolean(cycleId),
  });
  const updateMutation = useUpdateGovernanceCycleMutation(cycleId);
  const archiveMutation = useArchiveGovernanceCycleMutation();
  const [tab, setTab] = useState<TabValue>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  if (!canRead && permsSuccess) {
    return (
      <Alert>
        <AlertDescription>
          Permission <code className="text-xs">governance_cycles.read</code> requise.
        </AlertDescription>
      </Alert>
    );
  }

  if (!cycleId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Identifiant de cycle invalide.</AlertDescription>
      </Alert>
    );
  }

  if (detailQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(detailQuery.error, 'Cycle introuvable.')}
        </AlertDescription>
      </Alert>
    );
  }

  const cycle = detailQuery.data;

  async function patchStatus(status: 'TO_ARBITRATE' | 'CLOSED') {
    try {
      await updateMutation.mutateAsync({ status });
      toast.success(status === 'TO_ARBITRATE' ? 'Cycle validé pour arbitrage' : 'Cycle clôturé');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Archiver le cycle « ${cycle.name} » ?`)) return;
    try {
      await archiveMutation.mutateAsync(cycle.id);
      toast.success('Cycle archivé');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const tabEnabled = (value: TabValue) => tab === value;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href="/cycles">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Cycles de pilotage
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{cycle.name}</h1>
              <GovernanceCycleStatusBadge status={cycle.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {cycle.code ? <span>Code : {cycle.code}</span> : null}
              <span>Cadence : {getGovernanceCycleCadenceLabel(cycle.cadence)}</span>
              <span>
                Période : {formatGovernanceCycleDateRange(cycle.startDate, cycle.endDate)}
              </span>
              {cycle.sponsorLabel ? <span>Sponsor : {cycle.sponsorLabel}</span> : null}
              <span>
                Items : {cycle.summary.itemsCount} · Retenus : {cycle.summary.acceptedItemsCount}{' '}
                · Différés : {cycle.summary.deferredItemsCount}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="governance_cycles.create">
              <Button variant="outline" onClick={() => setAddItemOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un élément
              </Button>
            </PermissionGate>
            <PermissionGate permission="governance_cycles.update">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Modifier
              </Button>
              {cycle.status !== 'TO_ARBITRATE' && cycle.status !== 'CLOSED' ? (
                <Button variant="outline" onClick={() => patchStatus('TO_ARBITRATE')}>
                  Valider pour arbitrage
                </Button>
              ) : null}
              {cycle.status !== 'CLOSED' && cycle.status !== 'ARCHIVED' ? (
                <Button variant="outline" onClick={() => patchStatus('CLOSED')}>
                  Clôturer
                </Button>
              ) : null}
            </PermissionGate>
            <PermissionGate permission="governance_cycles.delete">
              <Button variant="destructive" onClick={handleArchive}>
                Archiver
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList variant="line" className="h-auto min-h-9 w-full flex-wrap justify-start gap-0 p-0">
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="instances">Séances de décision</TabsTrigger>
          <TabsTrigger value="arbitration">Matrice d&apos;arbitrage</TabsTrigger>
          <TabsTrigger value="projects">Projets candidats</TabsTrigger>
          <TabsTrigger value="budget">Budget &amp; capacité</TabsTrigger>
          <TabsTrigger value="risks">Risques</TabsTrigger>
          <TabsTrigger value="decisions">Décisions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <GovernanceCycleOverviewTab cycleId={cycleId} enabled={tabEnabled('overview')} />
        </TabsContent>
        <TabsContent value="instances" className="mt-4">
          <GovernanceCycleInstancesTab cycleId={cycleId} enabled={tabEnabled('instances')} />
        </TabsContent>
        <TabsContent value="arbitration" className="mt-4">
          <GovernanceCycleArbitrationTable cycleId={cycleId} />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <GovernanceCycleItemsReadTable
            cycleId={cycleId}
            enabled={tabEnabled('projects')}
            filter={(item) => item.sourceType === 'PROJECT'}
            emptyTitle="Aucun projet candidat"
          />
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          <GovernanceCycleItemsReadTable
            cycleId={cycleId}
            enabled={tabEnabled('budget')}
            filter={(item) => item.sourceType === 'BUDGET'}
            emptyTitle="Aucun élément budget"
          />
        </TabsContent>
        <TabsContent value="risks" className="mt-4">
          <GovernanceCycleItemsReadTable
            cycleId={cycleId}
            enabled={tabEnabled('risks')}
            filter={(item) => (item.riskScore ?? 0) >= 4}
            emptyTitle="Aucun item à haut risque"
            emptyDescription="Items avec score risque ≥ 4."
          />
        </TabsContent>
        <TabsContent value="decisions" className="mt-4">
          <GovernanceCycleItemsReadTable
            cycleId={cycleId}
            enabled={tabEnabled('decisions')}
            filter={(item) => item.decisionStatus !== 'CANDIDATE'}
            emptyTitle="Aucune décision enregistrée"
          />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Documents du cycle — à venir.
          </p>
        </TabsContent>
      </Tabs>

      <GovernanceCycleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        cycle={cycle}
      />
      <AddCycleItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} cycleId={cycleId} />
    </div>
  );
}
