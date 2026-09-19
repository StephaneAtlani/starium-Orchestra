'use client';

import { use } from 'react';
import { AlertCircle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { ProcedureTemplateEditor } from '@/features/procedures/components/procedure-template-editor';
import { usePermissions } from '@/hooks/use-permissions';

export default function ProcedureTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { has, isLoading, isSuccess } = usePermissions();
  const canManage = has('procedures.templates.manage');

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          title="Édition du modèle"
          description="Nom, catégorie optionnelle et outline de titres."
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
          <ProcedureTemplateEditor templateId={id} />
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
