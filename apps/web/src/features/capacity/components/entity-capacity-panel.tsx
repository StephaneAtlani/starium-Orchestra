'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { listAllocations } from '../api/capacity.api';
import { capacityQueryKeys } from '../lib/capacity-query-keys';

export type CapacitySourceType = 'PROJECT' | 'PROJECT_RISK' | 'ACTION_PLAN';

type EntityCapacityPanelProps = {
  sourceType: CapacitySourceType;
  sourceId: string;
  /** Valeur persistée (null = héritage). */
  consumesCapacity: boolean | null;
  /** Valeur effective après résolution. */
  effectiveConsumesCapacity: boolean;
  canEdit: boolean;
  onPersistConsumes: (next: boolean | null) => Promise<void>;
  helperText?: string;
};

export function EntityCapacityPanel({
  sourceType,
  sourceId,
  consumesCapacity,
  effectiveConsumesCapacity,
  canEdit,
  onPersistConsumes,
  helperText,
}: EntityCapacityPanelProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canReadCapacity = has('capacity.read');
  const qc = useQueryClient();

  const allocations = useQuery({
    queryKey: capacityQueryKeys.allocationsBySource(clientId, sourceType, sourceId),
    queryFn: () =>
      listAllocations(authFetch, {
        sourceType,
        sourceId,
        limit: 20,
        offset: 0,
      }),
    enabled: !!clientId && canReadCapacity && !!sourceId,
  });

  const persist = useMutation({
    mutationFn: (next: boolean | null) => onPersistConsumes(next),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: capacityQueryKeys.all(clientId) });
    },
  });

  if (!canReadCapacity) {
    return null;
  }

  return (
    <section
      className="space-y-4 rounded-md border p-4"
      aria-labelledby={`capa-panel-${sourceId}`}
    >
      <div className="space-y-1">
        <h3 id={`capa-panel-${sourceId}`} className="text-sm font-semibold text-foreground">
          Capacité (J/H)
        </h3>
        <p className="text-xs text-muted-foreground">
          {helperText ??
            'Indique si cette entité porte sa propre charge d’affectation capacité.'}
        </p>
      </div>

      <div className="flex min-h-11 flex-wrap items-center gap-3">
        <Switch
          id={`capa-consumes-${sourceId}`}
          checked={effectiveConsumesCapacity}
          disabled={!canEdit || persist.isPending}
          onCheckedChange={(checked) => {
            persist.mutate(checked);
          }}
        />
        <Label htmlFor={`capa-consumes-${sourceId}`} className="cursor-pointer text-sm">
          Porte sa capacité
        </Label>
        {consumesCapacity == null ? (
          <span className="text-xs text-muted-foreground">(héritage / défaut)</span>
        ) : null}
      </div>
      <p id={`capa-consumes-hint-${sourceId}`} className="text-xs text-muted-foreground">
        {effectiveConsumesCapacity
          ? 'Les affectations liées à cette source sont autorisées.'
          : 'Cette source n’émet pas de capacité — création d’affectation refusée.'}
      </p>

      {persist.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Enregistrement impossible</AlertTitle>
          <AlertDescription>
            {(persist.error as Error)?.message ?? 'Erreur inconnue'}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium">Affectations liées</h4>
          <Link
            href="/teams/capacity/allocations"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11')}
          >
            Gérer les affectations
          </Link>
        </div>
        {allocations.isLoading ? <LoadingState message="Chargement des affectations…" /> : null}
        {allocations.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              {(allocations.error as Error)?.message ?? 'Impossible de charger les affectations.'}
            </AlertDescription>
          </Alert>
        ) : null}
        {allocations.isSuccess && allocations.data.items.length === 0 ? (
          <EmptyState
            title="Aucune affectation"
            description="Pas d’affectation capacité liée à cette source."
          />
        ) : null}
        {allocations.isSuccess && allocations.data.items.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {allocations.data.items.map((a) => (
              <li
                key={a.id}
                className="flex min-h-11 flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span>
                  {a.workTeamName ?? a.resourceName ?? 'Cible'}
                  <span className="text-muted-foreground">
                    {' '}
                    · {a.startDate.slice(0, 10)} → {a.endDate.slice(0, 10)}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{a.totalDays} j/h</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
