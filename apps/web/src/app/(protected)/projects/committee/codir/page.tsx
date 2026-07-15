'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { CodirCommitteePresentation } from '@/features/projects/committee-presentation/components/codir-committee-presentation';

export default function ProjectsCommitteeCodirPage() {
  return (
    <RequireActiveClient>
      <PageContainer className="w-full max-w-none space-y-6">
        <CodirCommitteePresentation />
      </PageContainer>
    </RequireActiveClient>
  );
}
