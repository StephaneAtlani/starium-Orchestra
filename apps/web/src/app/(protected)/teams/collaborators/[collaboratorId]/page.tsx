'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useCollaboratorDetail } from '@/features/teams/collaborators/hooks/use-collaborator-detail';
import { CollaboratorDetailHeader } from '@/features/teams/collaborators/components/collaborator-detail-header';
import { CollaboratorEditForm } from '@/features/teams/collaborators/components/collaborator-edit-form';

export default function CollaboratorDetailPage() {
  const params = useParams<{ collaboratorId: string }>();
  const collaboratorId = params?.collaboratorId ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('collaborators.read');
  const canUpdate = has('collaborators.update');

  const query = useCollaboratorDetail(collaboratorId);
  const errorMessage = (query.error as Error | undefined)?.message ?? null;
  const status = (query.error as { status?: number } | undefined)?.status;

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Détail collaborateur"
          description="Consultation et édition des champs métier autorisés."
          actions={
            <Link
              href="/teams/collaborators"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <ArrowLeft className="size-4" />
              Retour liste
            </Link>
          }
        />

        {permsLoading && <LoadingState rows={2} />}
        {permsSuccess && !canRead && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription>
              Permission requise: <code>collaborators.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canRead && query.isLoading && <LoadingState rows={4} />}
        {permsSuccess && canRead && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{errorMessage}</AlertTitle>
            <AlertDescription>
              {status === 404
                ? 'Le collaborateur est introuvable ou hors scope client.'
                : status === 403
                  ? 'Accès refusé par les permissions/API.'
                  : 'Impossible de charger le collaborateur.'}
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canRead && query.data && (
          <div className="space-y-4">
            <CollaboratorDetailHeader collaborator={query.data} />
            <Card size="sm">
              <CardHeader>
                <CardTitle>Édition</CardTitle>
              </CardHeader>
              <CardContent>
                <CollaboratorEditForm collaborator={query.data} canUpdate={canUpdate} />
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}

