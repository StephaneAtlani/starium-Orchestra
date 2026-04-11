'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PurchaseOrdersListPage } from '@/features/procurement/components/purchase-orders-list-page';

export default function PurchaseOrdersRoutePage() {
  return (
    <RequireActiveClient>
      <PurchaseOrdersListPage />
    </RequireActiveClient>
  );
}
