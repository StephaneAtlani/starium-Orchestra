'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PortfolioGanttPage } from '@/features/projects/components/portfolio-gantt-page';

export default function ProjectsPortfolioGanttRoutePage() {
  return (
    <RequireActiveClient>
      <PageContainer>
        <PortfolioGanttPage />
      </PageContainer>
    </RequireActiveClient>
  );
}
