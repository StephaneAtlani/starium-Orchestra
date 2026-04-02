'use client';

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { SkillsCatalog } from '@/features/teams/skills/components/skills-catalog';

export default function TeamsSkillsPage() {
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('skills.read');

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Catalogue compétences"
          description="Référentiel des catégories et compétences du client actif."
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
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle>Accès au catalogue compétences</AlertTitle>
            <AlertDescription>
              Votre rôle n&apos;inclut pas la permission <code>skills.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canRead && <SkillsCatalog />}
      </PageContainer>
    </RequireActiveClient>
  );
}
