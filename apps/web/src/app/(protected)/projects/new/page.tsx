'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PermissionGate } from '@/components/PermissionGate';
import { ProjectCreateForm } from '@/features/projects/components/project-create-form';
import { projectsList } from '@/features/projects/constants/project-routes';
import { usePermissions } from '@/hooks/use-permissions';

export default function NewProjectPage() {
  const { has, isLoading } = usePermissions();

  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            backHref={projectsList()}
            eyebrow={
              <Link
                href={projectsList()}
                className="rounded-sm outline-none transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retour au portefeuille
              </Link>
            }
            title="Nouveau projet"
            description="Configurez votre projet étape par étape — type, équipe, planification. Les champs obligatoires sont indiqués par une astérisque."
          />

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
            <div className="space-y-6">
              <Alert className="border-border/70 bg-muted/25" role="status">
                <Info className="size-4 shrink-0" aria-hidden />
                <AlertTitle className="text-sm">Complétez ensuite la fiche projet</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed sm:text-sm">
                  Ce parcours enregistre l&apos;identité et le cadrage initial du projet. Après la
                  création, ouvrez la <strong>fiche projet</strong> pour renseigner l&apos;équipe, le
                  budget, les risques, le planning détaillé, les documents et le pilotage (arbitrage,
                  points projet, synthèse CODIR).
                </AlertDescription>
              </Alert>
              <ProjectCreateForm />
            </div>
          </PermissionGate>
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
