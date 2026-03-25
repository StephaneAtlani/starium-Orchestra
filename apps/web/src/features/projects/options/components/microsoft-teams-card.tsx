'use client';

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
  configureDisabled: boolean;
  dissociateDisabled: boolean;
  onConfigure: () => void;
  onDissociate: () => void;
};

export function MicrosoftTeamsCard({
  teamName,
  channelName,
  canEdit,
  configureDisabled,
  dissociateDisabled,
  onConfigure,
  onDissociate,
}: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Microsoft Teams</CardTitle>
        <CardDescription>Équipe et canal liés au projet.</CardDescription>
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
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onConfigure} disabled={configureDisabled}>
              Configurer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDissociate}
              disabled={dissociateDisabled}
            >
              Dissocier
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
