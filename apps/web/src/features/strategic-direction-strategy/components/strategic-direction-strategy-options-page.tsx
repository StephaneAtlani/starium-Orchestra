'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { LoadingState } from '@/components/feedback/loading-state';

/**
 * Route legacy `/strategic-direction-strategy/options` → portefeuille + modale Options.
 */
export function StrategicDirectionStrategyOptionsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/strategic-direction-strategy?options=1');
  }, [router]);

  return (
    <RequireActiveClient>
      <LoadingState />
    </RequireActiveClient>
  );
}
