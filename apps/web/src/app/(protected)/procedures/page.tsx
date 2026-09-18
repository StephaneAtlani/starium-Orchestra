'use client';

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { ProceduresCatalog } from '@/features/procedures/components/procedures-catalog';

export default function ProceduresPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('procedures.read');

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          backHref="/compliance/dashboard"
          eyebrow="Gouvernance › Procédures"
          title="Procédures"
          description="Catalogue des procédures internes du client actif."
        />

        {permsLoading && <LoadingState rows={2} />}
        {permsError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>Impossible de charger vos permissions.</AlertDescription>
          </Alert>
        )}

        {permsSuccess && !canRead && (
          <Alert className="border-amber-500/35 bg-amber-500/5">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertTitle>Accès aux procédures</AlertTitle>
            <AlertDescription>
              Votre rôle n&apos;inclut pas la permission de lecture des procédures.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canRead && <ProceduresCatalog />}
      </PageContainer>
    </RequireActiveClient>
  );
}
