'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ProjectMicrosoftTeamsProvisioningDto } from '../types/project-options.types';

type Props = {
  teamName: string | null;
  channelName: string | null;
  canEdit: boolean;
  /** Settings client : provisioning Teams activé. */
  provisioningFeatureEnabled: boolean;
  connectionActive: boolean;
  configureDisabled: boolean;
  dissociateDisabled: boolean;
  provisionDisabled: boolean;
  /** Run PENDING / IN_PROGRESS ou mutation en vol. */
  provisioningInProgress?: boolean;
  provisioningStatusLabel?: string | null;
  provisioning?: ProjectMicrosoftTeamsProvisioningDto | null;
  onConfigure: () => void;
  onDissociate: () => void;
  onProvision: () => void;
};

function provisioningBadge(
  status: ProjectMicrosoftTeamsProvisioningDto['status'] | undefined,
): { label: string; variant: 'secondary' | 'outline' } | null {
  if (status === 'PENDING') {
    return { label: 'Provisioning en attente', variant: 'secondary' };
  }
  if (status === 'IN_PROGRESS') {
    return { label: 'Provisioning en cours', variant: 'secondary' };
  }
  return null;
}

export function MicrosoftTeamsCard({
  teamName,
  channelName,
  canEdit,
  provisioningFeatureEnabled,
  connectionActive,
  configureDisabled,
  dissociateDisabled,
  provisionDisabled,
  provisioningInProgress = false,
  provisioningStatusLabel,
  provisioning = null,
  onConfigure,
  onDissociate,
  onProvision,
}: Props) {
  const hasTeam = Boolean(teamName);
  const showCreatePath = canEdit && !hasTeam;
  const badge = provisioningBadge(provisioning?.status);
  const showTeamWebUrl =
    provisioning?.status === 'COMPLETED' &&
    Boolean(provisioning.teamWebUrl?.trim());

  return (
    <Card className="border-border/70" aria-busy={provisioningInProgress || undefined}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Microsoft Teams</CardTitle>
          {badge ? (
            <Badge variant={badge.variant} className="min-h-6">
              {badge.label}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          {hasTeam
            ? 'Équipe et canal liés au projet.'
            : 'Deux parcours : créer une nouvelle équipe, ou rattacher une équipe déjà existante.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-1 text-sm">
          <div>
            <dt className="text-muted-foreground">Équipe</dt>
            <dd className="font-medium">{teamName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Canal</dt>
            <dd className="font-medium">{channelName ?? '—'}</dd>
          </div>
        </dl>

        {showTeamWebUrl && provisioning?.teamWebUrl ? (
          <a
            href={provisioning.teamWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ouvrir dans Teams
            <ExternalLink className="size-4 shrink-0" aria-hidden />
          </a>
        ) : null}

        {provisioningStatusLabel ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {provisioningStatusLabel}
          </p>
        ) : null}

        {showCreatePath && !provisioningFeatureEnabled && !provisioningInProgress ? (
          <p className="text-xs text-muted-foreground">
            La création d’équipe est désactivée pour ce client. Activez-la dans{' '}
            <Link className="underline" href="/projects/options">
              Options projets → Équipes Microsoft
            </Link>
            , puis revenez ici. Le rattachement d’une équipe existante reste disponible.
          </p>
        ) : null}

        {showCreatePath && !connectionActive && !provisioningInProgress ? (
          <p className="text-xs text-muted-foreground">Connexion Microsoft 365 inactive.</p>
        ) : null}

        {canEdit ? (
          <div className="space-y-2">
            {!hasTeam && !provisioningInProgress ? (
              <p className="text-xs text-muted-foreground">
                Créer = nouvelle équipe selon la configuration module. Rattacher = lier une équipe
                déjà présente dans votre organisation.
              </p>
            ) : null}
            <div
              className={`flex flex-wrap gap-2 ${provisioningInProgress ? 'opacity-60' : ''}`}
            >
              {!hasTeam ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  onClick={onProvision}
                  disabled={provisionDisabled || provisioningInProgress}
                  aria-disabled={provisionDisabled || provisioningInProgress}
                >
                  Créer l’équipe Teams
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={hasTeam ? 'default' : 'outline'}
                className="min-h-11"
                onClick={onConfigure}
                disabled={configureDisabled}
                aria-disabled={configureDisabled}
              >
                {hasTeam ? 'Configurer' : 'Rattacher une équipe existante'}
              </Button>
              {hasTeam ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={onDissociate}
                  disabled={dissociateDisabled}
                  aria-disabled={dissociateDisabled}
                >
                  Dissocier
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
