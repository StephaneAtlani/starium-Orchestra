'use client';

import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetEnvelopeFormPage } from '@/features/budgets/components/pages/budget-envelope-form-page';

export default function EditBudgetEnvelopePage() {
  const params = useParams();
  const envelopeId = typeof params.envelopeId === 'string' ? params.envelopeId : undefined;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetEnvelopeFormPage mode="edit" envelopeId={envelopeId} />
      </PageContainer>
    </RequireActiveClient>
  );
}
