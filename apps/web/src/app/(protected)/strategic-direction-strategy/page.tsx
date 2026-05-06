'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { StrategicDirectionStrategyPage } from '@/features/strategic-direction-strategy/components/strategic-direction-strategy-page';

export default function StrategicDirectionStrategyRoutePage() {
  return (
    <RequireActiveClient>
      <StrategicDirectionStrategyPage />
    </RequireActiveClient>
  );
}
