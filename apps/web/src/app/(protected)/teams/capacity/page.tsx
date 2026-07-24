'use client';

import { Suspense } from 'react';
import { LoadingState } from '@/components/feedback/loading-state';
import { CapacityWorkspace } from '@/features/capacity/components/capacity-workspace';

export default function CapacityPage() {
  return (
    <Suspense fallback={<LoadingState rows={2} />}>
      <CapacityWorkspace />
    </Suspense>
  );
}
