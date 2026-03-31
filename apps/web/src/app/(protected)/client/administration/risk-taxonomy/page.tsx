import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { RiskTaxonomyAdminPanel } from '@/features/projects/risks/components/risk-taxonomy-admin-panel';

export default function ClientRiskTaxonomyPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Taxonomie des risques"
        description="Domaines et types utilisés pour classer les risques projets et alimenter les filtres du registre."
      />
      <RiskTaxonomyAdminPanel />
    </PageContainer>
  );
}
