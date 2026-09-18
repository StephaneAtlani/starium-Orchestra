'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { ComplianceCampaignWorkspace } from '@/features/compliance/components/compliance-campaign-workspace';

export default function ComplianceCampaignPage() {
  const params = useParams();
  const campaignId = typeof params.id === 'string' ? params.id : '';

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        {campaignId ? (
          <ComplianceCampaignWorkspace campaignId={campaignId} />
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
