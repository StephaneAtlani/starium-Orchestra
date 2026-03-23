'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EditResourceForm } from '../_components/edit-resource-form';

export default function ResourceDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Modifier la ressource"
          description="Édition du catalogue pour le client actif."
          actions={
            <Link href="/resources" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              Liste
            </Link>
          }
        />
        {id ? (
          <EditResourceForm
            resourceId={id}
            formIdPrefix="edit-resource"
            onSaved={() => router.refresh()}
          />
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
