'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  listMicrosoftTeams,
  listMicrosoftChannels,
  listMicrosoftPlansForTeam,
  type MicrosoftChannelOption,
  type MicrosoftPlannerPlanOption,
  type MicrosoftTeamOption,
} from '../api/microsoft-resources.api';

type MicrosoftConnectionDto = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  status: string;
  tokenExpiresAt: string | null;
  connectedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ProjectMicrosoftResourceSelectorsCard({
  canEdit,
}: {
  canEdit: boolean;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [localError, setLocalError] = useState<string | null>(null);

  const connectionQuery = useQuery({
    queryKey: ['microsoft-connection', clientId],
    enabled: canEdit && Boolean(clientId),
    queryFn: async () => {
      const res = await authFetch('/api/microsoft/connection');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string })?.message ??
            'Impossible de charger l’état de la connexion Microsoft.',
        );
      }
      return (await res.json()) as {
        connection: MicrosoftConnectionDto | null;
      };
    },
  });

  const connection = connectionQuery.data?.connection ?? null;
  const canLoadTeams =
    canEdit &&
    Boolean(clientId) &&
    connectionQuery.isSuccess &&
    connection !== null;

  const teamsQuery = useQuery({
    queryKey: ['microsoft-teams', clientId],
    enabled: canLoadTeams,
    queryFn: () => listMicrosoftTeams(authFetch),
  });

  // Cascade UX : Team -> Channel -> Plan.
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const canLoadChannels = canLoadTeams && Boolean(selectedTeamId);

  const channelsQuery = useQuery({
    queryKey: ['microsoft-channels', clientId, selectedTeamId],
    enabled: canLoadChannels,
    queryFn: () => listMicrosoftChannels(authFetch, selectedTeamId),
  });

  const canLoadPlans =
    canLoadTeams &&
    Boolean(selectedTeamId) &&
    Boolean(selectedChannelId) &&
    (channelsQuery.isSuccess ?? false);

  const plansQuery = useQuery({
    queryKey: ['microsoft-plans', clientId, selectedTeamId],
    enabled: canLoadPlans,
    queryFn: () => listMicrosoftPlansForTeam(authFetch, selectedTeamId),
  });

  useEffect(() => {
    if (!canLoadTeams) return;
    if (!selectedTeamId && (teamsQuery.data?.items.length ?? 0) > 0) {
      setSelectedTeamId(teamsQuery.data!.items[0].teamId);
    }
  }, [canLoadTeams, teamsQuery.data, selectedTeamId]);

  useEffect(() => {
    if (!canLoadChannels) return;
    if (!selectedChannelId && (channelsQuery.data?.items.length ?? 0) > 0) {
      setSelectedChannelId(channelsQuery.data!.items[0].channelId);
    }
  }, [canLoadChannels, channelsQuery.data, selectedChannelId]);

  useEffect(() => {
    if (!plansQuery.data?.items?.length) return;
    if (!selectedPlanId) {
      setSelectedPlanId(plansQuery.data.items[0].plannerPlanId);
    }
  }, [plansQuery.data, selectedPlanId]);

  const handleConnect = useCallback(async () => {
    setLocalError(null);
    try {
      const res = await authFetch('/api/microsoft/auth/url');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string })?.message ??
            'Impossible de démarrer le consentement Microsoft.',
        );
      }
      const json = (await res.json()) as { authorizationUrl: string };
      window.location.href = json.authorizationUrl;
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : 'Connexion impossible.');
    }
  }, [authFetch]);

  const disabled = !canEdit || connection === null;

  const teams: MicrosoftTeamOption[] = useMemo(
    () => teamsQuery.data?.items ?? [],
    [teamsQuery.data],
  );
  const channels: MicrosoftChannelOption[] = useMemo(
    () => channelsQuery.data?.items ?? [],
    [channelsQuery.data],
  );
  const plans: MicrosoftPlannerPlanOption[] = useMemo(
    () => plansQuery.data?.items ?? [],
    [plansQuery.data],
  );

  return (
    <Card className="max-w-2xl border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Microsoft 365 — Sélection ressources</CardTitle>
        <p className="text-xs text-muted-foreground">
          Sélectionnez une équipe Teams et un canal (contexte UX), puis un plan Planner.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {localError ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        ) : null}

        {connectionQuery.isLoading ? (
          <LoadingState rows={3} />
        ) : connection === null ? (
          <div className="space-y-2">
            <Alert>
              <AlertTitle>Connexion Microsoft requise</AlertTitle>
              <AlertDescription>
                Connectez votre client Microsoft 365 pour lister Teams, canaux et plans.
              </AlertDescription>
            </Alert>
            {canEdit ? (
              <Button type="button" onClick={() => void handleConnect()}>
                Connecter Microsoft 365
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {teamsQuery.isLoading ? <LoadingState rows={1} /> : null}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Team (équipes)</p>
              <Select
                value={selectedTeamId}
                onValueChange={(v) => {
                  const next = v ?? '';
                  setSelectedTeamId(next);
                  setSelectedChannelId('');
                  setSelectedPlanId('');
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  disabled={disabled || teamsQuery.isLoading}
                >
                  <SelectValue placeholder="Choisir une équipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId}>
                      {t.teamName}
                    </SelectItem>
                  ))}
                  {teams.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Aucune équipe accessible
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Canal (Teams)</p>
              {selectedTeamId ? (
                channelsQuery.isLoading ? (
                  <LoadingState rows={1} />
                ) : (
                  <Select
                    value={selectedChannelId}
                    onValueChange={(v) => {
                      const next = v ?? '';
                      setSelectedChannelId(next);
                      setSelectedPlanId('');
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      disabled={disabled || channelsQuery.isLoading}
                    >
                      <SelectValue placeholder="Choisir un canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.channelId} value={c.channelId}>
                          {c.channelName}
                        </SelectItem>
                      ))}
                      {channels.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          Aucun canal accessible
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Choisissez d’abord une équipe.</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Plan (Planner)
              </p>
              {selectedChannelId ? (
                plansQuery.isLoading ? (
                  <LoadingState rows={1} />
                ) : (
                  <Select
                    value={selectedPlanId}
                    onValueChange={(v) => setSelectedPlanId(v ?? '')}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      disabled={disabled || plansQuery.isLoading}
                    >
                      <SelectValue placeholder="Choisir un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.plannerPlanId} value={p.plannerPlanId}>
                          {p.plannerPlanTitle}
                        </SelectItem>
                      ))}
                      {plans.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          Aucun plan accessible
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Choisissez d’abord un canal.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

