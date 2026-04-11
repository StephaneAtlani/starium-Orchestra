'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PurchaseOrderDetailPage } from '@/features/procurement/components/purchase-order-detail-page';
import { useParams } from 'next/navigation';

export default function PurchaseOrderDetailRoutePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <RequireActiveClient>
      {id ? <PurchaseOrderDetailPage purchaseOrderId={id} /> : null}
    </RequireActiveClient>
  );
}
