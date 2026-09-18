'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/lib/toast';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { getClientMembers } from '@/features/client-rbac/api/user-roles';
import {
  getProcedureSettings,
  updateProcedureSettings,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';

export function ProcedureSettingsPanel() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const canConfigure = has('procedures.configure');
  const queryClient = useQueryClient();
  const [pickUserId, setPickUserId] = useState<string>('');

  const settingsQ = useQuery({
    queryKey: procedureQueryKeys.settings(clientId),
    queryFn: () => getProcedureSettings(authFetch),
    enabled: Boolean(clientId),
  });

  const membersQ = useQuery({
    queryKey: [...procedureQueryKeys.all(clientId), 'members'],
    queryFn: () => getClientMembers(authFetch),
    enabled: Boolean(clientId) && canConfigure,
  });

  const saveMut = useMutation({
    mutationFn: (input: {
      usePilotageCycle?: boolean;
      validatorUserIds?: string[];
    }) => updateProcedureSettings(authFetch, input),
    onSuccess: async () => {
      toast.success('Configuration enregistrée');
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.settings(clientId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMembers = useMemo(
    () => (membersQ.data ?? []).filter((m) => m.status === 'ACTIVE'),
    [membersQ.data],
  );

  const selectedIds = settingsQ.data?.validators.map((v) => v.userId) ?? [];
  const availableToAdd = activeMembers.filter((m) => !selectedIds.includes(m.id));

  if (settingsQ.isLoading) return <LoadingState rows={4} />;
  if (settingsQ.isError || !settingsQ.data) {
    return (
      <ErrorState
        message="Impossible de charger la configuration."
        onRetry={() => void settingsQ.refetch()}
      />
    );
  }

  const settings = settingsQ.data;
  const cycleOn = settings.usePilotageCycle;

  return (
    <div className="flex flex-col gap-5">
      <section className="starium-section space-y-4 p-4 sm:p-5" aria-labelledby="pr-cfg-cycle">
        <div>
          <h2 id="pr-cfg-cycle" className="text-base font-bold text-foreground">
            Cycle de publication
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Oui : brouillon → en revue → publiée (pilotage). Non : l’auteur
            soumet, un validateur de la liste approuve (même enchaînement
            d’états).
          </p>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4">
          <Label htmlFor="pr-use-pilotage" className="text-[13.5px] font-semibold">
            Passer par le cycle de pilotage (En revue)
          </Label>
          <Switch
            id="pr-use-pilotage"
            checked={cycleOn}
            disabled={!canConfigure || saveMut.isPending}
            onCheckedChange={(checked) => {
              if (!checked && selectedIds.length < 1) {
                toast.error(
                  'Ajoutez au moins un validateur avant de désactiver le cycle',
                );
                return;
              }
              saveMut.mutate({
                usePilotageCycle: checked,
                validatorUserIds: selectedIds,
              });
            }}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {saveMut.isPending ? 'Enregistrement…' : ''}
        </p>
      </section>

      <section
        className="starium-section space-y-4 p-4 sm:p-5"
        aria-labelledby="pr-cfg-validators"
      >
        <div>
          <h2
            id="pr-cfg-validators"
            className="text-base font-bold text-foreground"
          >
            Validateurs
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cycleOn
              ? 'Non applicable tant que le cycle de pilotage est actif.'
              : 'Membres autorisés à approuver une procédure en revue (au moins un).'}
          </p>
        </div>

        {cycleOn ? (
          <p className="rounded-[var(--radius-md)] border border-border/70 bg-muted/30 px-3 py-3 text-[13px] text-muted-foreground">
            Activez le mode sans cycle de pilotage pour gérer la liste des
            validateurs.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/60 rounded-[var(--radius-md)] border border-border/70">
              {settings.validators.length === 0 ? (
                <li className="px-3 py-4 text-[13px] text-muted-foreground">
                  Aucun validateur — ajoutez-en un pour enregistrer ce mode.
                </li>
              ) : (
                settings.validators.map((v) => (
                  <li
                    key={v.userId}
                    className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2.5 text-[13.5px] font-semibold text-foreground">
                      <span
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-ink)] text-[10px] font-extrabold text-[var(--brand-gold)]"
                        aria-hidden
                      >
                        {initials(v.label)}
                      </span>
                      {displayLabel(v.label, 'Membre')}
                    </span>
                    {canConfigure ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-[var(--state-danger)]"
                        aria-label={`Retirer ${displayLabel(v.label, 'le validateur')}`}
                        disabled={saveMut.isPending}
                        onClick={() => {
                          const next = selectedIds.filter((id) => id !== v.userId);
                          if (next.length < 1) {
                            toast.error(
                              'Conservez au moins un validateur, ou réactivez le cycle de pilotage',
                            );
                            return;
                          }
                          saveMut.mutate({
                            usePilotageCycle: false,
                            validatorUserIds: next,
                          });
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>

            {canConfigure ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="starium-form-field min-w-0 flex-1">
                  <Label htmlFor="pr-add-validator">Ajouter un validateur</Label>
                  <Select
                    value={pickUserId || undefined}
                    onValueChange={(v) => setPickUserId(v ?? '')}
                    disabled={membersQ.isLoading || saveMut.isPending}
                  >
                    <SelectTrigger id="pr-add-validator" className="min-h-11">
                      <SelectValue placeholder="Choisir un membre…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          Aucun membre disponible
                        </SelectItem>
                      ) : (
                        availableToAdd.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {firstDisplayLabel(
                              [
                                [m.firstName, m.lastName]
                                  .filter(Boolean)
                                  .join(' ')
                                  .trim(),
                                m.email,
                              ],
                              'Membre',
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  className="min-h-11 sm:min-h-9"
                  disabled={
                    !pickUserId ||
                    pickUserId === '__none' ||
                    saveMut.isPending
                  }
                  onClick={() => {
                    if (!pickUserId) return;
                    saveMut.mutate({
                      usePilotageCycle: false,
                      validatorUserIds: [...selectedIds, pickUserId],
                    });
                    setPickUserId('');
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="starium-section space-y-2 p-4 sm:p-5 opacity-70">
        <h2 className="text-base font-bold text-foreground">Catégories</h2>
        <p className="text-[13px] text-muted-foreground">
          Référentiel configurable par client — prochain lot (F2).
        </p>
      </section>
    </div>
  );
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (label.slice(0, 2) || '?').toUpperCase();
}
