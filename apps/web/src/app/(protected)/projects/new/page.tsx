'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { ProjectCreateForm } from '@/features/projects/components/project-create-form';
import { projectsList } from '@/features/projects/constants/project-routes';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

export default function NewProjectPage() {
  const { has, isLoading } = usePermissions();

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start lg:gap-x-10 xl:gap-x-12">
            <Link
              href={projectsList()}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                '-ml-2 inline-flex w-fit shrink-0 gap-1 text-muted-foreground lg:pt-0.5',
              )}
            >
              <ChevronLeft className="size-4 shrink-0" />
              Retour au portefeuille
            </Link>
            <PageHeader
              title="Nouveau projet"
              description="Créez un projet pour le client actif. Les champs obligatoires sont indiqués par une astérisque."
            />
          </div>

          {!isLoading && !has('projects.create') && (
            <Alert>
              <AlertTitle>Création non autorisée</AlertTitle>
              <AlertDescription>
                Vous n&apos;avez pas la permission de créer un projet pour ce client (
                <code className="rounded bg-muted px-1 font-mono text-xs">projects.create</code>
                ).
              </AlertDescription>
            </Alert>
          )}

          <PermissionGate permission="projects.create">
            <ProjectCreateForm />
          </PermissionGate>
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
