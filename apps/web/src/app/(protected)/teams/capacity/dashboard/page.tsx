'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { useCapacityDashboard } from '@/features/capacity/hooks/use-capacity-mutations';
import type { CapacityDashboardRow, CapacityPortfolioSummary } from '@/features/capacity/types/capacity.types';

type Tab = 'resources' | 'work-teams' | 'portfolio';

export default function CapacityDashboardPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('capacity.read');
  const [tab, setTab] = useState<Tab>('portfolio');
  const [includeArchived, setIncludeArchived] = useState(false);
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const ym = `${year}-${month}`;
  const params = useMemo(
    () => ({ from: ym, to: ym, includeArchivedWorkTeams: includeArchived }),
    [ym, includeArchived],
  );
  const dash = useCapacityDashboard(tab, params, { enabled: permsSuccess && canRead });

  const rows = (dash.data as { items: Array<CapacityDashboardRow | CapacityPortfolioSummary> } | undefined)
    ?.items;

  return (
    <RequireActiveClient>
      <PageHeader
        title="Capacité — pilotage"
        description="Capacité, charge allouée et disponible par mois."
      />
      {permsLoading ? <LoadingState message="Vérification des droits…" /> : null}
      {permsSuccess && !canRead ? (
        <Alert variant="destructive">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>Permission capacity.read requise.</AlertDescription>
        </Alert>
      ) : null}
      {permsSuccess && canRead ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vues pilotage">
            {(
              [
                ['portfolio', 'Portefeuille'],
                ['work-teams', 'WorkTeams'],
                ['resources', 'Ressources'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`min-h-11 rounded-md border px-4 text-sm ${
                  tab === id ? 'bg-primary text-primary-foreground' : 'bg-background'
                }`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              id="capa-include-archived"
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
            <Label htmlFor="capa-include-archived">Inclure WorkTeams archivées (historique)</Label>
          </div>
          <p className="text-sm text-muted-foreground">Mois : {ym}</p>
          {dash.isLoading ? <LoadingState message="Chargement…" /> : null}
          {dash.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{(dash.error as Error)?.message ?? 'Échec'}</AlertDescription>
            </Alert>
          ) : null}
          {!dash.isLoading && (rows?.length ?? 0) === 0 ? (
            <EmptyState title="Aucune donnée" description="Générez la capacité et créez des affectations." />
          ) : null}
          {(rows?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-3 font-medium">Libellé</th>
                    <th className="p-3 font-medium">Capacité</th>
                    <th className="p-3 font-medium">Alloué</th>
                    <th className="p-3 font-medium">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {rows!.map((r, idx) => {
                    const label =
                      'label' in r && r.label
                        ? r.label
                        : tab === 'portfolio'
                          ? (r as CapacityPortfolioSummary).yearMonth
                          : (r as CapacityDashboardRow).id;
                    return (
                      <tr key={`${label}-${idx}`} className="border-b">
                        <td className="p-3">{label}</td>
                        <td className="p-3">{r.capacity}</td>
                        <td className="p-3">{r.allocated}</td>
                        <td className="p-3">{r.available}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </RequireActiveClient>
  );
}
