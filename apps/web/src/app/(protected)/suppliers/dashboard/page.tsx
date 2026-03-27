'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { SuppliersDashboardPage } from '@/features/procurement/components/suppliers-dashboard-page';

export default function SuppliersDashboardRoutePage() {
  return (
    <RequireActiveClient>
      <SuppliersDashboardPage />
    </RequireActiveClient>
  );
}
