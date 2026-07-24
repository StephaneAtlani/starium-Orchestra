'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import {
  useCapacityAllocationMutations,
  useCapacityAllocations,
} from '@/features/capacity/hooks/use-capacity-mutations';

export default function CapacityAllocationsPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('capacity.read');
  const canManage = has('capacity.allocations.manage');
  const list = useCapacityAllocations({ limit: 50, offset: 0 }, { enabled: permsSuccess && canRead });
  const mutations = useCapacityAllocationMutations();
  const teams = useWorkTeamsList({ limit: 100, includeArchived: false }, { enabled: canManage });

  const [targetKind, setTargetKind] = useState<'workTeam' | 'resource'>('workTeam');
  const [workTeamId, setWorkTeamId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState('10');
  const [comment, setComment] = useState('');

  return (
    <RequireActiveClient>
      <PageHeader
        title="Capacité — affectations"
        description="Charge J/H sur une période, répartie automatiquement sur les mois."
      />
      {permsLoading ? <LoadingState message="Vérification des droits…" /> : null}
      {permsSuccess && !canRead ? (
        <Alert variant="destructive">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>Permission capacity.read requise.</AlertDescription>
        </Alert>
      ) : null}
      {permsSuccess && canRead ? (
        <div className="flex flex-col gap-6">
          {canManage ? (
            <form
              className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                mutations.create.mutate({
                  startDate,
                  endDate,
                  totalDays: Number(totalDays),
                  comment: comment || null,
                  workTeamId: targetKind === 'workTeam' ? workTeamId || null : null,
                  resourceId: targetKind === 'resource' ? resourceId || null : null,
                  sourceType: 'MANUAL',
                  sourceId: null,
                });
              }}
            >
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Cible</Label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target"
                      checked={targetKind === 'workTeam'}
                      onChange={() => setTargetKind('workTeam')}
                    />
                    WorkTeam
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target"
                      checked={targetKind === 'resource'}
                      onChange={() => setTargetKind('resource')}
                    />
                    Ressource
                  </label>
                </div>
              </div>
              {targetKind === 'workTeam' ? (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="alloc-team">WorkTeam</Label>
                  <select
                    id="alloc-team"
                    className="border-input bg-background h-11 rounded-md border px-3 text-sm"
                    value={workTeamId}
                    onChange={(e) => setWorkTeamId(e.target.value)}
                    required
                  >
                    <option value="">— Choisir —</option>
                    {(teams.data?.items ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <HumanResourceCombobox
                    id="alloc-resource"
                    value={resourceId}
                    dialogOpen
                    label="Ressource HUMAN"
                    onChange={setResourceId}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alloc-start">Début</Label>
                <Input
                  id="alloc-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alloc-end">Fin</Label>
                <Input
                  id="alloc-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alloc-days">J/H</Label>
                <Input
                  id="alloc-days"
                  inputMode="decimal"
                  value={totalDays}
                  onChange={(e) => setTotalDays(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alloc-comment">Commentaire</Label>
                <Input
                  id="alloc-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={mutations.create.isPending}>
                  Créer l’affectation
                </Button>
              </div>
            </form>
          ) : null}

          {list.isLoading ? <LoadingState message="Chargement…" /> : null}
          {list.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{(list.error as Error)?.message ?? 'Échec'}</AlertDescription>
            </Alert>
          ) : null}
          {!list.isLoading && (list.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="Aucune affectation" description="Créez une charge sur une période." />
          ) : null}
          {(list.data?.items.length ?? 0) > 0 ? (
            <ul className="flex flex-col gap-3">
              {list.data!.items.map((a) => (
                <li key={a.id} className="rounded-md border p-4 text-sm">
                  <div className="font-medium">
                    {a.workTeamName ?? a.resourceName ?? 'Cible'} — {a.totalDays} J/H
                  </div>
                  <div className="text-muted-foreground">
                    {a.startDate.slice(0, 10)} → {a.endDate.slice(0, 10)}
                    {a.comment ? ` · ${a.comment}` : ''}
                  </div>
                  <div className="mt-1 text-xs">
                    Mois :{' '}
                    {a.months.map((m) => `${m.yearMonth}=${m.days}`).join(', ')}
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="mt-3"
                      disabled={mutations.remove.isPending}
                      onClick={() => mutations.remove.mutate(a.id)}
                    >
                      Supprimer
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </RequireActiveClient>
  );
}
