'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissions } from '@/hooks/use-permissions';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { useCapacityMonthlySettings } from '@/features/capacity/hooks/use-capacity-monthly-settings';
import {
  useGenerateCapacityMonthly,
  usePutCapacityMonthlySettings,
} from '@/features/capacity/hooks/use-capacity-mutations';

export default function CapacitySettingsPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('capacity.read');
  const canManage = has('capacity.settings.manage');
  const year = new Date().getFullYear();
  const from = `${year}-01`;
  const to = `${year}-12`;
  const { data, isLoading, isError, error } = useCapacityMonthlySettings(
    { from, to },
    { enabled: permsSuccess && canRead },
  );
  const generate = useGenerateCapacityMonthly();
  const put = usePutCapacityMonthlySettings();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const items = data?.items ?? [];
  const rows = useMemo(() => {
    if (items.length === 0) return [];
    return items.map((it) => ({
      ...it,
      edit: draft[it.yearMonth] ?? String(it.days),
    }));
  }, [items, draft]);

  return (
    <RequireActiveClient>
      <PageHeader
        title="Capacité — paramètres"
        description="Capacité mensuelle par défaut du client (jours/homme)."
      />
      {permsLoading ? <LoadingState message="Vérification des droits…" /> : null}
      {permsError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Impossible de charger les permissions.</AlertDescription>
        </Alert>
      ) : null}
      {permsSuccess && !canRead ? (
        <Alert variant="destructive">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>Permission capacity.read requise.</AlertDescription>
        </Alert>
      ) : null}
      {permsSuccess && canRead ? (
        <div className="flex flex-col gap-4">
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={generate.isPending}
                onClick={() => generate.mutate({ year })}
              >
                Générer {year} (calendrier FR)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={put.isPending || rows.length === 0}
                onClick={() => {
                  put.mutate(
                    rows.map((r) => ({
                      yearMonth: r.yearMonth,
                      days: Number(r.edit),
                    })),
                  );
                }}
              >
                Enregistrer les overrides
              </Button>
            </div>
          ) : null}
          {isLoading ? <LoadingState message="Chargement…" /> : null}
          {isError ? (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{(error as Error)?.message ?? 'Échec'}</AlertDescription>
            </Alert>
          ) : null}
          {!isLoading && !isError && rows.length === 0 ? (
            <EmptyState
              title="Aucune capacité mensuelle"
              description="Générez l’année à partir du calendrier français."
            />
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="p-3 font-medium">Mois</th>
                    <th className="p-3 font-medium">J/H</th>
                    <th className="p-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.yearMonth} className="border-b">
                      <td className="p-3">{r.yearMonth}</td>
                      <td className="p-3">
                        {canManage ? (
                          <Input
                            className="max-w-[8rem]"
                            inputMode="decimal"
                            aria-label={`Capacité ${r.yearMonth}`}
                            value={r.edit}
                            onChange={(e) =>
                              setDraft((prev) => ({ ...prev, [r.yearMonth]: e.target.value }))
                            }
                          />
                        ) : (
                          r.days
                        )}
                      </td>
                      <td className="p-3">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </RequireActiveClient>
  );
}
