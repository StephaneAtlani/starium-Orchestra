'use client';

import { Suspense } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { LoadingState } from '@/components/feedback/loading-state';
import { StrategicDirectionStrategyPortfolioPage } from '@/features/strategic-direction-strategy/components/strategic-direction-strategy-portfolio-page';

export default function StrategicDirectionStrategyRoutePage() {
  return (
    <RequireActiveClient>
      <Suspense fallback={<LoadingState />}>
        <StrategicDirectionStrategyPortfolioPage />
      </Suspense>
    </RequireActiveClient>
  );
}
