'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ProcedureSettingsPanel } from '@/features/procedures/components/procedure-settings-panel';

export default function ProceduresConfigurationPage() {
  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-4">
        <PageHeader
          title="Configuration"
          description="Cycle de publication, validateurs et catégories du module Procédures."
        />
        <ProcedureSettingsPanel />
      </PageContainer>
    </RequireActiveClient>
  );
}
