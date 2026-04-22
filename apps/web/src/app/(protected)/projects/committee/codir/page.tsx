'use client';

import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CodirCommitteePresentation } from '@/features/projects/committee-presentation/components/codir-committee-presentation';
import { projectsList } from '@/features/projects/constants/project-routes';
import { ChevronLeft } from 'lucide-react';

export default function ProjectsCommitteeCodirPage() {
  return (
    <RequireActiveClient>
      <PageContainer className="w-full max-w-none space-y-6">
        <PageHeader
          title="Présentation CODIR"
          description="Mode comité : synthèse portefeuille puis navigation diaporama par projet — plein écran et menu latéral."
          actions={
            <Link
              href={projectsList()}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Portefeuille
            </Link>
          }
        />
        <CodirCommitteePresentation />
      </PageContainer>
    </RequireActiveClient>
  );
}
