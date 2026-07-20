'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { listMicrosoftTeams } from '@/features/microsoft-365/api/microsoft-resources.api';

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
  enabled: boolean;
  value: string;
  onValueChange: (teamId: string) => void;
  /** Libellé de repli si la liste Graph n’est pas encore chargée. */
  fallbackTeamName?: string | null;
  id?: string;
  label?: string;
};

export function MicrosoftTeamPicker({
  enabled,
  value,
  onValueChange,
  fallbackTeamName,
  id = 'microsoft-team-picker',
  label = 'Équipe Teams',
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const teamsQuery = useQuery({
    queryKey: ['microsoft-teams', clientId],
    queryFn: () => listMicrosoftTeams(authFetch),
    enabled: enabled && Boolean(clientId),
    retry: false,
  });

  const teamLabel = useMemo(() => {
    const fromList = teamsQuery.data?.items?.find((t) => t.teamId === value)?.teamName;
    if (fromList) return fromList;
    if (fallbackTeamName && value) return fallbackTeamName;
    if (value && teamsQuery.isLoading) return 'Chargement…';
    return '';
  }, [teamsQuery.data?.items, teamsQuery.isLoading, value, fallbackTeamName]);

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">Connexion Microsoft 365 requise.</p>
    );
  }

  if (teamsQuery.isLoading) {
    return <LoadingState rows={1} />;
  }

  if (teamsQuery.isError) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertTitle>Impossible de charger les équipes Teams</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{graphQueryErrorMessage(teamsQuery.error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 border-border/70"
            onClick={() => void teamsQuery.refetch()}
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={(v) => onValueChange(v ?? '')}>
        <SelectTrigger id={id} className="w-full min-h-11">
          <SelectValue placeholder="Choisir une équipe">{teamLabel || undefined}</SelectValue>
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
  );
}
