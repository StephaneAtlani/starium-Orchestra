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
  filesDriveId: string | null;
  filesFolderId: string | null;
  canEdit: boolean;
  configureDisabled: boolean;
  dissociateDisabled: boolean;
  onConfigure: () => void;
  onDissociate: () => void;
};

export function MicrosoftDocumentsCard({
  filesDriveId,
  filesFolderId,
  canEdit,
  configureDisabled,
  dissociateDisabled,
  onConfigure,
  onDissociate,
}: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Documents (SharePoint / OneDrive)</CardTitle>
        <CardDescription>
          Cible de synchronisation des documents (optionnel en MVP).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-1 text-sm">
          <div>
            <dt className="text-muted-foreground">Drive</dt>
            <dd className="font-mono text-xs break-all">{filesDriveId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dossier</dt>
            <dd className="font-mono text-xs break-all">{filesFolderId ?? '—'}</dd>
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
