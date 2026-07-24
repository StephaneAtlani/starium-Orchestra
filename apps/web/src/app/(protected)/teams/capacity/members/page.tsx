'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
  useMemberMonthlyCapacity,
  usePatchPrimaryWorkTeam,
  usePutMemberMonthlyCapacity,
} from '@/features/capacity/hooks/use-capacity-mutations';

export default function CapacityMembersPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('capacity.read');
  const canManage = has('capacity.members.manage');
  const [resourceId, setResourceId] = useState('');
  const [resourceLabel, setResourceLabel] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const from = `${year}-01`;
  const to = `${year}-12`;
  const member = useMemberMonthlyCapacity(resourceId || undefined, { from, to }, {
    enabled: permsSuccess && canRead && !!resourceId,
  });
  const put = usePutMemberMonthlyCapacity(resourceId);
  const patchPrimary = usePatchPrimaryWorkTeam(resourceId);
  const teams = useWorkTeamsList({ limit: 100, includeArchived: false }, { enabled: canManage });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [primaryId, setPrimaryId] = useState<string>('');

  const rows = useMemo(() => {
    const items = member.data?.items ?? [];
    return items.map((it) => ({
      ...it,
      edit: draft[it.yearMonth] ?? (it.inherits ? '' : String(it.days ?? '')),
    }));
  }, [member.data?.items, draft]);

  return (
    <RequireActiveClient>
      <PageHeader
        title="Capacité — membres"
        description="Exceptions mensuelles et WorkTeam principale (centre de capacité)."
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
          <div className="max-w-xl">
            <HumanResourceCombobox
              id="capa-resource"
              value={resourceId}
              fallbackLabel={resourceLabel ?? member.data?.resourceName}
              dialogOpen
              label="Collaborateur (ressource HUMAN)"
              onChange={(id) => {
                setResourceId(id);
                setDraft({});
                setPrimaryId('');
              }}
              onPickResource={(r) => {
                const label = [r.firstName, r.name].filter(Boolean).join(' ') || r.name;
                setResourceLabel(label);
              }}
            />
          </div>
          {member.isLoading ? <LoadingState message="Chargement…" /> : null}
          {member.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                {(member.error as Error)?.message ?? 'Ressource introuvable ou non HUMAN'}
              </AlertDescription>
            </Alert>
          ) : null}
          {member.data ? (
            <>
              <p className="text-sm text-muted-foreground">
                {member.data.resourceName}
                {member.data.primaryCapacityWorkTeamName
                  ? ` — WorkTeam : ${member.data.primaryCapacityWorkTeamName}`
                  : ' — Sans WorkTeam principale'}
              </p>
              {canManage ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
                    <Label htmlFor="capa-primary-team">WorkTeam principale</Label>
                    <select
                      id="capa-primary-team"
                      className="border-input bg-background h-11 rounded-md border px-3 text-sm"
                      value={primaryId || member.data.primaryCapacityWorkTeamId || ''}
                      onChange={(e) => setPrimaryId(e.target.value)}
                    >
                      <option value="">— Aucune —</option>
                      {(teams.data?.items ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    disabled={patchPrimary.isPending}
                    onClick={() =>
                      patchPrimary.mutate(primaryId || null, {
                        onSuccess: () => member.refetch(),
                      })
                    }
                  >
                    Enregistrer la WorkTeam
                  </Button>
                </div>
              ) : null}
              {rows.length === 0 ? (
                <EmptyState
                  title="Pas de mois"
                  description="Générez d’abord la capacité client (paramètres)."
                />
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="p-3 font-medium">Mois</th>
                        <th className="p-3 font-medium">Exception (vide = hérite)</th>
                        <th className="p-3 font-medium">Résolu</th>
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
                                aria-label={`Exception ${r.yearMonth}`}
                                value={r.edit}
                                placeholder="Hérite"
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [r.yearMonth]: e.target.value,
                                  }))
                                }
                              />
                            ) : r.inherits ? (
                              '—'
                            ) : (
                              r.days
                            )}
                          </td>
                          <td className="p-3">{r.resolvedDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canManage && rows.length > 0 ? (
                <Button
                  type="button"
                  disabled={put.isPending}
                  onClick={() =>
                    put.mutate(
                      rows.map((r) => ({
                        yearMonth: r.yearMonth,
                        days: r.edit.trim() === '' ? null : Number(r.edit),
                      })),
                    )
                  }
                >
                  Enregistrer les exceptions
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </RequireActiveClient>
  );
}
