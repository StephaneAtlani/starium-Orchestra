'use client';

import { Suspense } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { LoadingState } from '@/components/feedback/loading-state';
import { StrategicDirectionStrategyCreatePage } from '@/features/strategic-direction-strategy/components/strategic-direction-strategy-create-page';

export default function StrategicDirectionStrategyNewRoutePage() {
  return (
    <RequireActiveClient>
      <Suspense fallback={<LoadingState />}>
        <StrategicDirectionStrategyCreatePage />
      </Suspense>
    </RequireActiveClient>
  );
}
