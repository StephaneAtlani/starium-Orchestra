'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/use-permissions';
import { ChevronLeft } from 'lucide-react';
import {
  formatGovernanceCycleDateRange,
} from '../lib/governance-cycle-formatters';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import { getApiErrorMessage, useGovernanceCycleDetailQuery } from '../hooks/use-governance-cycles';
import { GovernanceCycleFormDialog } from './governance-cycle-form-dialog';
import { GovernanceCycleStatusBadge } from './governance-cycle-status-badge';
import { GovernanceCycleOverviewTab } from './governance-cycle-overview-tab';
import {
  GovernanceCycleArbitrationTable,
  GovernanceCycleItemsReadTable,
} from './governance-cycle-arbitration-table';
import { AddCycleItemDialog } from './add-cycle-item-dialog';
import { GovernanceCycleInstancesTab } from './governance-cycle-instances-tab';
import { GovernanceCycleDetailActions } from './governance-cycle-detail-actions';

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
    enabled: Boolean(cycleId),
    eager: true,
  });
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

  const cycle = detailQuery.data;
  const headerLoading = detailQuery.isLoading && !cycle;
  const headerError =
    permsSuccess &&
    canRead &&
    !headerLoading &&
    (detailQuery.isError || !cycle);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href="/cycles">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Cycles de pilotage
          </Link>
        </Button>
        {headerError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(detailQuery.error, 'Cycle introuvable.')}
            </AlertDescription>
          </Alert>
        ) : headerLoading ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-8 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ) : cycle ? (
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
                  Items : {cycle.summary.itemsCount} · Retenus :{' '}
                  {cycle.summary.acceptedItemsCount} · Différés :{' '}
                  {cycle.summary.deferredItemsCount}
                </span>
              </div>
            </div>
            <GovernanceCycleDetailActions
              cycle={cycle}
              onEdit={() => setEditOpen(true)}
              onAddItem={() => setAddItemOpen(true)}
            />
          </div>
        ) : null}
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
          {tab === 'overview' ? (
            <GovernanceCycleOverviewTab cycleId={cycleId} enabled eager />
          ) : null}
        </TabsContent>
        <TabsContent value="instances" className="mt-4">
          {tab === 'instances' ? (
            <GovernanceCycleInstancesTab cycleId={cycleId} enabled />
          ) : null}
        </TabsContent>
        <TabsContent value="arbitration" className="mt-4">
          {tab === 'arbitration' ? (
            <GovernanceCycleArbitrationTable cycleId={cycleId} enabled />
          ) : null}
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          {tab === 'projects' ? (
            <GovernanceCycleItemsReadTable
              cycleId={cycleId}
              enabled
              filter={(item) => item.sourceType === 'PROJECT'}
              emptyTitle="Aucun projet candidat"
            />
          ) : null}
        </TabsContent>
        <TabsContent value="budget" className="mt-4">
          {tab === 'budget' ? (
            <GovernanceCycleItemsReadTable
              cycleId={cycleId}
              enabled
              filter={(item) => item.sourceType === 'BUDGET'}
              emptyTitle="Aucun élément budget"
            />
          ) : null}
        </TabsContent>
        <TabsContent value="risks" className="mt-4">
          {tab === 'risks' ? (
            <GovernanceCycleItemsReadTable
              cycleId={cycleId}
              enabled
              filter={(item) => (item.riskScore ?? 0) >= 4}
              emptyTitle="Aucun item à haut risque"
              emptyDescription="Items avec score risque ≥ 4."
            />
          ) : null}
        </TabsContent>
        <TabsContent value="decisions" className="mt-4">
          {tab === 'decisions' ? (
            <GovernanceCycleItemsReadTable
              cycleId={cycleId}
              enabled
              filter={(item) => item.decisionStatus !== 'CANDIDATE'}
              emptyTitle="Aucune décision enregistrée"
            />
          ) : null}
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          {tab === 'documents' ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Documents du cycle — à venir.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>

      {cycle ? (
        <GovernanceCycleFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          cycle={cycle}
        />
      ) : null}
      <AddCycleItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} cycleId={cycleId} />
    </div>
  );
}
