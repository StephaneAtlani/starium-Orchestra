'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { StrategicDirectionSchemaPage } from '@/features/strategic-direction-strategy/components/strategic-direction-schema-page';

export default function StrategicDirectionStrategyDetailRoutePage() {
  const params = useParams();
  const strategyId = typeof params.id === 'string' ? params.id : '';

  if (!strategyId) {
    return (
      <RequireActiveClient>
        <ErrorState message="Schéma introuvable" />
      </RequireActiveClient>
    );
  }

  return (
    <RequireActiveClient>
      <Suspense fallback={<LoadingState />}>
        <StrategicDirectionSchemaPage strategyId={strategyId} />
      </Suspense>
    </RequireActiveClient>
  );
}
