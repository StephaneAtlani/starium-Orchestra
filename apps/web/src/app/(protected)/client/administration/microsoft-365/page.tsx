import { Suspense } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Microsoft365Settings } from '@/features/microsoft-365/components/microsoft-365-settings';

export default function Microsoft365AdminPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </PageContainer>
      }
    >
      <Microsoft365Settings />
    </Suspense>
  );
}
