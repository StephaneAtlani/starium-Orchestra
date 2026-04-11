'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { InvoiceDetailPage } from '@/features/procurement/components/invoice-detail-page';
import { useParams } from 'next/navigation';

export default function InvoiceDetailRoutePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <RequireActiveClient>
      {id ? <InvoiceDetailPage invoiceId={id} /> : null}
    </RequireActiveClient>
  );
}
