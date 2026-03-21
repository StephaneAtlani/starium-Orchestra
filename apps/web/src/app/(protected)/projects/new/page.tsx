'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PermissionGate } from '@/components/PermissionGate';
import { ProjectCreateForm } from '@/features/projects/components/project-create-form';
import { projectsList } from '@/features/projects/constants/project-routes';
import { usePermissions } from '@/hooks/use-permissions';

export default function NewProjectPage() {
  const { has, isLoading } = usePermissions();

  return (
    <RequireActiveClient>
      <PageContainer>
        <Link
          href={projectsList()}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Retour au portefeuille
        </Link>
        <PageHeader
          title="Nouveau projet"
          description="Création simple — champs obligatoires marqués *."
        />
        {!isLoading && !has('projects.create') && (
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas la permission de créer un projet pour ce client.
          </p>
        )}
        <PermissionGate permission="projects.create">
          <ProjectCreateForm />
        </PermissionGate>
      </PageContainer>
    </RequireActiveClient>
  );
}
