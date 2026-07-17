'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
  onConfigure: () => void;
  onDissociate: () => void;
  onProvision: () => void;
};

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
  onConfigure,
  onDissociate,
  onProvision,
}: Props) {
  const hasTeam = Boolean(teamName);
  const showCreatePath = canEdit && !hasTeam;

  return (
    <Card className="border-border/70" aria-busy={provisioningInProgress || undefined}>
      <CardHeader>
        <CardTitle>Microsoft Teams</CardTitle>
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
