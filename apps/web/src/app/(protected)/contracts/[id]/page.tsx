'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { ContractDetailPage } from '@/features/contracts/components/contract-detail-page';
import { useParams } from 'next/navigation';

export default function ContractDetailRoutePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <RequireActiveClient>
      {id ? <ContractDetailPage contractId={id} /> : null}
    </RequireActiveClient>
  );
}
