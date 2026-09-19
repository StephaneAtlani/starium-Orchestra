'use client';

import { AlertCircle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { ProcedureTemplatesCatalog } from '@/features/procedures/components/procedure-templates-catalog';
import { usePermissions } from '@/hooks/use-permissions';

export default function ProcedureTemplatesPage() {
  const { has, isLoading, isSuccess } = usePermissions();
  const canManage = has('procedures.templates.manage');

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          title="Modèles de procédures"
          description="Structures de titres (H1, H2, H3) réutilisables à la création d’une procédure."
        />
        {isLoading ? (
          <LoadingState />
        ) : isSuccess && !canManage ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden />
            <AlertTitle>Accès refusé</AlertTitle>
            <AlertDescription>
              Vous n’avez pas la permission de gérer les modèles de procédures.
            </AlertDescription>
          </Alert>
        ) : (
          <ProcedureTemplatesCatalog />
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
