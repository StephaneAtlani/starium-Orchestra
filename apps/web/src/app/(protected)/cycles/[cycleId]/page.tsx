'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { GovernanceCycleDetailPage } from '@/features/governance-cycles/components/governance-cycle-detail-page';

export default function CycleDetailRoutePage() {
  const params = useParams();
  const cycleId = typeof params.cycleId === 'string' ? params.cycleId : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex min-h-0 w-full flex-col gap-6">
        <GovernanceCycleDetailPage cycleId={cycleId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
