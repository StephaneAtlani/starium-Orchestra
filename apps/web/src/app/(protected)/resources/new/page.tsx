'use client';

import { useRouter } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { NewResourceForm } from '../_components/new-resource-form';

export default function NewResourcePage() {
  const router = useRouter();

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader title="Nouvelle ressource" description="Création dans le client actif." />
        <NewResourceForm
          formIdPrefix="page-new-resource"
          onSuccess={(created) => router.push(`/resources/${created.id}`)}
        />
      </PageContainer>
    </RequireActiveClient>
  );
}
