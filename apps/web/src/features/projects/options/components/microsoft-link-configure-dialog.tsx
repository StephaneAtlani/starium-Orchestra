'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  listMicrosoftChannels,
  listMicrosoftPlansForTeam,
  listMicrosoftTeams,
} from '@/features/microsoft-365/api/microsoft-resources.api';
import type { ProjectMicrosoftLinkDto } from '../types/project-options.types';
import type { UpdateProjectMicrosoftLinkPayload } from '../types/project-options.types';

function graphQueryErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return 'Erreur inattendue.';
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: ProjectMicrosoftLinkDto | null;
  connectionActive: boolean;
  canEdit: boolean;
  isSubmitting: boolean;
  onSave: (payload: UpdateProjectMicrosoftLinkPayload) => void;
};

export function MicrosoftLinkConfigureDialog({
  open,
  onOpenChange,
  link,
  connectionActive,
  canEdit,
  isSubmitting,
  onSave,
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [teamId, setTeamId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [plannerPlanId, setPlannerPlanId] = useState('');
  const [filesDriveId, setFilesDriveId] = useState('');
  const [filesFolderId, setFilesFolderId] = useState('');
  const [useMsBuckets, setUseMsBuckets] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTeamId(link?.teamId ?? '');
    setChannelId(link?.channelId ?? '');
    setPlannerPlanId(link?.plannerPlanId ?? '');
    setFilesDriveId(link?.filesDriveId ?? '');
    setFilesFolderId(link?.filesFolderId ?? '');
    setUseMsBuckets(link?.useMicrosoftPlannerBuckets ?? false);
  }, [open, link]);

  const teamsQuery = useQuery({
    queryKey: ['microsoft-teams', clientId],
    queryFn: () => listMicrosoftTeams(authFetch),
    enabled: open && connectionActive && Boolean(clientId),
    retry: false,
  });

  const channelsQuery = useQuery({
    queryKey: ['microsoft-channels', clientId, teamId],
    queryFn: () => listMicrosoftChannels(authFetch, teamId),
    enabled: open && connectionActive && Boolean(clientId) && Boolean(teamId),
    retry: false,
  });

  const plansQuery = useQuery({
    queryKey: ['microsoft-plans', clientId, teamId],
    queryFn: () => listMicrosoftPlansForTeam(authFetch, teamId),
    enabled: open && connectionActive && Boolean(clientId) && Boolean(teamId) && Boolean(channelId),
    retry: false,
  });

  const teamName = useMemo(() => {
    const list = teamsQuery.data?.items ?? [];
    return list.find((t) => t.teamId === teamId)?.teamName ?? null;
  }, [teamsQuery.data, teamId]);

  const channelName = useMemo(() => {
    const list = channelsQuery.data?.items ?? [];
    return list.find((c) => c.channelId === channelId)?.channelName ?? null;
  }, [channelsQuery.data, channelId]);

  const plannerPlanTitle = useMemo(() => {
    const list = plansQuery.data?.items ?? [];
    return list.find((p) => p.plannerPlanId === plannerPlanId)?.plannerPlanTitle ?? null;
  }, [plansQuery.data, plannerPlanId]);

  const submit = useCallback(() => {
    if (!teamId?.trim() || !channelId?.trim() || !plannerPlanId?.trim()) {
      return;
    }
    const payload: UpdateProjectMicrosoftLinkPayload = {
      isEnabled: true,
      teamId: teamId.trim(),
      channelId: channelId.trim(),
      plannerPlanId: plannerPlanId.trim(),
      ...(teamName && { teamName }),
      ...(channelName && { channelName }),
      ...(plannerPlanTitle && { plannerPlanTitle }),
      ...(filesDriveId.trim() && { filesDriveId: filesDriveId.trim() }),
      ...(filesFolderId.trim() && { filesFolderId: filesFolderId.trim() }),
      useMicrosoftPlannerBuckets: useMsBuckets,
    };
    onSave(payload);
  }, [
    teamId,
    channelId,
    plannerPlanId,
    teamName,
    channelName,
    plannerPlanTitle,
    filesDriveId,
    filesFolderId,
    useMsBuckets,
    onSave,
  ]);

  const canSubmit =
    canEdit &&
    connectionActive &&
    Boolean(teamId?.trim()) &&
    Boolean(channelId?.trim()) &&
    Boolean(plannerPlanId?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,40rem)] max-w-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurer Microsoft 365</DialogTitle>
        </DialogHeader>
        {!connectionActive ? (
          <Alert variant="destructive">
            <AlertTitle>Connexion requise</AlertTitle>
            <AlertDescription>
              Connectez d’abord le client Microsoft 365 depuis la carte d’état ci-dessus.
            </AlertDescription>
          </Alert>
        ) : teamsQuery.isLoading ? (
          <LoadingState rows={3} />
        ) : teamsQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Impossible de charger les équipes Teams</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{graphQueryErrorMessage(teamsQuery.error)}</p>
              <p className="text-xs text-muted-foreground">
                Un refus Microsoft (403) indique souvent des droits ou consentements insuffisants sur
                le tenant (scopes Graph pour Teams / Planner). Vérifiez la connexion dans
                l’administration client Microsoft 365 ou demandez un consentement administrateur pour
                l’application Azure liée à Starium.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border/70"
                onClick={() => void teamsQuery.refetch()}
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Équipe Teams</p>
              <Select
                value={teamId}
                onValueChange={(v) => {
                  setTeamId(v ?? '');
                  setChannelId('');
                  setPlannerPlanId('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une équipe" />
                </SelectTrigger>
                <SelectContent>
                  {(teamsQuery.data?.items ?? []).map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Canal</p>
              {teamId ? (
                channelsQuery.isLoading ? (
                  <LoadingState rows={1} />
                ) : channelsQuery.isError ? (
                  <Alert variant="destructive" className="border-destructive/40 py-2">
                    <AlertDescription className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span>{graphQueryErrorMessage(channelsQuery.error)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-fit shrink-0 border-border/70"
                        onClick={() => void channelsQuery.refetch()}
                      >
                        Réessayer
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={channelId}
                    onValueChange={(v) => {
                      setChannelId(v ?? '');
                      setPlannerPlanId('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {(channelsQuery.data?.items ?? []).map((c) => (
                        <SelectItem key={c.channelId} value={c.channelId}>
                          {c.channelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Choisissez d’abord une équipe.</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Plan Planner</p>
              {channelId ? (
                plansQuery.isLoading ? (
                  <LoadingState rows={1} />
                ) : plansQuery.isError ? (
                  <Alert variant="destructive" className="border-destructive/40 py-2">
                    <AlertDescription className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span>{graphQueryErrorMessage(plansQuery.error)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-fit shrink-0 border-border/70"
                        onClick={() => void plansQuery.refetch()}
                      >
                        Réessayer
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={plannerPlanId} onValueChange={(v) => setPlannerPlanId(v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plansQuery.data?.items ?? []).map((p) => (
                        <SelectItem key={p.plannerPlanId} value={p.plannerPlanId}>
                          {p.plannerPlanTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Choisissez d’abord un canal.</p>
              )}
            </div>
            {Boolean(plannerPlanId?.trim()) && link?.syncTasksEnabled !== false ? (
              <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/25 p-3">
                <input
                  id="use-ms-buckets"
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
                  checked={useMsBuckets}
                  onChange={(e) => setUseMsBuckets(e.target.checked)}
                  disabled={!canEdit}
                />
                <label htmlFor="use-ms-buckets" className="cursor-pointer text-sm leading-snug">
                  <span className="font-medium text-foreground">
                    Remplacer les buckets Starium par ceux du plan Planner
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    Importe les colonnes du plan Microsoft sélectionné dans l’onglet Planning et les
                    utilise pour la sync des tâches vers Planner (sync tâches activée).
                  </span>
                </label>
              </div>
            ) : null}

            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Documents (optionnel, MVP)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="files-drive">Drive (ID)</Label>
                  <Input
                    id="files-drive"
                    value={filesDriveId}
                    onChange={(e) => setFilesDriveId(e.target.value)}
                    placeholder="filesDriveId"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="files-folder">Dossier (ID)</Label>
                  <Input
                    id="files-folder"
                    value={filesFolderId}
                    onChange={(e) => setFilesFolderId(e.target.value)}
                    placeholder="filesFolderId"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={() => void submit()}
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer et activer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
