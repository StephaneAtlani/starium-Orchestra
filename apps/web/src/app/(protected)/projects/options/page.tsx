'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { projectsList } from '@/features/projects/constants/project-routes';

/**
 * Ecran placeholder pour les options du module Projets (navigation latérale).
 * À enrichir lorsque des réglages métier seront définis.
 */
export default function ProjectsOptionsPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <div className="mb-4">
          <Link
            href={projectsList()}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Portefeuille
          </Link>
        </div>
        <PageHeader
          title="Option — Projets"
          description="Paramètres et options du module Projets pour ce client."
        />
        <p className="text-sm text-muted-foreground">
          Aucune option configurable pour le moment.
        </p>
      </PageContainer>
    </RequireActiveClient>
  );
}
