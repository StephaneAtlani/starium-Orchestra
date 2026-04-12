'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { ContractsListPage } from '@/features/contracts/components/contracts-list-page';

export default function ContractsPage() {
  return (
    <RequireActiveClient>
      <ContractsListPage />
    </RequireActiveClient>
  );
}
