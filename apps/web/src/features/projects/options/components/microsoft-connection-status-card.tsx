'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ConnectionDto = {
  id: string;
  status: string;
  tenantName: string | null;
} | null;

type Props = {
  connection: ConnectionDto;
  isLoading: boolean;
  canEdit: boolean;
  onConnect: () => void;
};

export function MicrosoftConnectionStatusCard({
  connection,
  isLoading,
  canEdit,
  onConnect,
}: Props) {
  const active = connection?.status === 'ACTIVE';

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Connexion client Microsoft 365</CardTitle>
        <CardDescription>
          État de la connexion OAuth pour le client actif (identique au paramétrage
          d’administration).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : active ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">ACTIVE</Badge>
            {connection?.tenantName ? (
              <span className="text-sm text-muted-foreground">{connection.tenantName}</span>
            ) : null}
          </div>
        ) : (
          <Alert>
            <AlertTitle>Non connecté</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span>Aucune connexion Microsoft active pour ce client.</span>
              {canEdit ? (
                <Button type="button" size="sm" className="w-fit shrink-0" onClick={onConnect}>
                  Connecter Microsoft
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
