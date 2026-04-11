'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { InvoicesListPage } from '@/features/procurement/components/invoices-list-page';

export default function InvoicesRoutePage() {
  return (
    <RequireActiveClient>
      <InvoicesListPage />
    </RequireActiveClient>
  );
}
