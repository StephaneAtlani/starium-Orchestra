'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { SupplierVisualizationContent } from '@/features/procurement/components/suppliers/supplier-visualization-modal';

export default function SupplierDetailsPage() {
  const { supplierId } = useParams<{ supplierId: string }>();

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Detail fournisseur"
          description="Vue consolidee fournisseur (commandes, factures, finances, contacts)."
          actions={
            <Link
              href="/suppliers/contacts"
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-input px-3 text-sm hover:bg-muted/60"
            >
              <ArrowLeft className="size-4" />
              Retour aux contacts
            </Link>
          }
        />
        {supplierId ? <SupplierVisualizationContent supplierId={supplierId} /> : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
