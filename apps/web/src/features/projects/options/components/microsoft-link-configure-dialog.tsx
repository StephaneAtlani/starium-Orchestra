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

  useEffect(() => {
    if (!open) return;
    setTeamId(link?.teamId ?? '');
    setChannelId(link?.channelId ?? '');
    setPlannerPlanId(link?.plannerPlanId ?? '');
    setFilesDriveId(link?.filesDriveId ?? '');
    setFilesFolderId(link?.filesFolderId ?? '');
  }, [open, link]);

  const teamsQuery = useQuery({
    queryKey: ['microsoft-teams', clientId],
    queryFn: () => listMicrosoftTeams(authFetch),
    enabled: open && connectionActive && Boolean(clientId),
  });

  const channelsQuery = useQuery({
    queryKey: ['microsoft-channels', clientId, teamId],
    queryFn: () => listMicrosoftChannels(authFetch, teamId),
    enabled: open && connectionActive && Boolean(clientId) && Boolean(teamId),
  });

  const plansQuery = useQuery({
    queryKey: ['microsoft-plans', clientId, teamId],
    queryFn: () => listMicrosoftPlansForTeam(authFetch, teamId),
    enabled: open && connectionActive && Boolean(clientId) && Boolean(teamId) && Boolean(channelId),
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
      <DialogContent className="max-w-lg">
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
