'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { HumanResourceCombobox } from '@/features/teams/work-teams/components/human-resource-combobox';
import { useWorkTeamsList } from '@/features/teams/work-teams/hooks/use-work-teams-list';
import {
  useCapacityAllocationMutations,
  useCapacityAllocations,
} from '../hooks/use-capacity-mutations';
import { allocationTargetLabel, formatCapacityDays, toDaysString } from '../lib/allocation-display';

type Props = {
  canManage: boolean;
};

export function CapacityAllocationsPanel({ canManage }: Props) {
  const list = useCapacityAllocations({ limit: 50, offset: 0 });
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
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Affectations</h3>
        <p className="text-xs text-muted-foreground">
          Posez de la charge (J/H) sur une équipe ou une personne pour une période. Le reste se
          calcule tout seul.
        </p>
      </div>

      {canManage ? (
        <form
          className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const days = toDaysString(totalDays);
            if (!days) {
              toast.error('Indiquez un total J/H');
              return;
            }
            if (targetKind === 'workTeam' && !workTeamId) {
              toast.error('Choisissez une équipe');
              return;
            }
            if (targetKind === 'resource' && !resourceId) {
              toast.error('Choisissez une personne');
              return;
            }
            mutations.create.mutate(
              {
                startDate,
                endDate,
                totalDays: days,
                comment: comment || null,
                workTeamId: targetKind === 'workTeam' ? workTeamId || null : null,
                resourceId: targetKind === 'resource' ? resourceId || null : null,
                sourceType: 'MANUAL',
                sourceId: null,
              },
              {
                onSuccess: () => {
                  toast.success('Affectation créée');
                  setComment('');
                },
                onError: (err: Error) => toast.error(err.message || 'Échec création'),
              },
            );
          }}
        >
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Cible</Label>
            <div className="flex flex-wrap gap-3">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="capa-target"
                  checked={targetKind === 'workTeam'}
                  onChange={() => setTargetKind('workTeam')}
                />
                Équipe
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="capa-target"
                  checked={targetKind === 'resource'}
                  onChange={() => setTargetKind('resource')}
                />
                Personne
              </label>
            </div>
          </div>
          {targetKind === 'workTeam' ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="alloc-team">Équipe</Label>
              <Select value={workTeamId || undefined} onValueChange={(v) => setWorkTeamId(v ?? '')}>
                <SelectTrigger id="alloc-team" className="min-h-11">
                  <SelectValue placeholder="— Choisir une équipe —" />
                </SelectTrigger>
                <SelectContent>
                  {(teams.data?.items ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <HumanResourceCombobox
                id="alloc-resource"
                value={resourceId}
                dialogOpen
                label="Personne"
                onChange={setResourceId}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alloc-start">Début</Label>
            <Input
              id="alloc-start"
              type="date"
              className="min-h-11"
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
              className="min-h-11"
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
              className="min-h-11"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alloc-comment">Commentaire</Label>
            <Input
              id="alloc-comment"
              className="min-h-11"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="min-h-11" disabled={mutations.create.isPending}>
              Créer l’affectation
            </Button>
          </div>
        </form>
      ) : null}

      {list.isLoading ? <LoadingState rows={2} /> : null}
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
        <ul className="flex flex-col gap-3" aria-live="polite">
          {list.data!.items.map((a) => (
            <li key={a.id} className="rounded-md border p-4 text-sm">
              <div className="font-medium">
                {allocationTargetLabel(a)} — {formatCapacityDays(a.totalDays)} J/H
              </div>
              <div className="text-muted-foreground">
                {a.startDate.slice(0, 10)} → {a.endDate.slice(0, 10)}
                {a.comment ? ` · ${a.comment}` : ''}
              </div>
              <div className="mt-1 text-xs">
                Mois :{' '}
                {a.months
                  .map((m) => `${m.yearMonth}=${formatCapacityDays(m.days)}`)
                  .join(', ')}
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-3 min-h-11"
                  disabled={mutations.remove.isPending}
                  onClick={() =>
                    mutations.remove.mutate(a.id, {
                      onSuccess: () => toast.success('Affectation supprimée'),
                      onError: (err: Error) => toast.error(err.message || 'Échec'),
                    })
                  }
                >
                  Supprimer
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
