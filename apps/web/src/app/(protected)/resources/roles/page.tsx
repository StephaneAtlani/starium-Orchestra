'use client';

import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResourceRolesPanel } from '../_components/resource-roles-panel';

export default function ResourceRolesPage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Rôles métier"
          description="Catalogue ResourceRole pour ressources humaines."
          actions={
            <Link href="/resources" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Ressources
            </Link>
          }
        />
        <ResourceRolesPanel queryEnabled />
      </PageContainer>
    </RequireActiveClient>
  );
}
