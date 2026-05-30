'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { GovernanceCyclesPage } from '@/features/governance-cycles/components/governance-cycles-page';

export default function CyclesListRoutePage() {
  return (
    <RequireActiveClient>
      <GovernanceCyclesPage />
    </RequireActiveClient>
  );
}
