'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listComplianceRequirements } from '@/features/compliance/api/compliance.api';
import { ComplianceRequirementsList } from '@/features/compliance/components/compliance-requirements-list';

export default function ComplianceRequirementsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const q = useQuery({
    queryKey: ['compliance', 'requirements', clientId],
    queryFn: () => listComplianceRequirements(authFetch),
    enabled: Boolean(clientId),
  });

  return (
    <RequireActiveClient>
      <PageContainer
        className={cn(
          'flex w-full min-w-0 flex-col gap-4',
          /* Viewport utile : topbar + padding workspace (py-6/8) */
          'md:h-[calc(100dvh-var(--topbar-height,56px)-5rem)] md:min-h-0 md:overflow-hidden',
        )}
      >
        <PageHeader
          className="shrink-0"
          eyebrow="Gouvernance › Conformité"
          title="Exigences"
          description="Contrôles à évaluer par référentiel — filtrez les écarts et les exigences à évaluer."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/compliance/dashboard"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Tableau de bord
              </Link>
              <Link
                href="/compliance/frameworks"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Référentiels
              </Link>
            </div>
          }
        />
        <ComplianceRequirementsList
          rows={q.data}
          isLoading={q.isLoading}
          error={q.error instanceof Error ? q.error : null}
          onRetry={() => void q.refetch()}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
