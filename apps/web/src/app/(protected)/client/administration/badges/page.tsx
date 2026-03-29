import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ClientBadgesAdminPanel } from '@/features/ui/components/client-badges-admin-panel';

export default function ClientBadgesAdminPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Badges interface"
        description="Libellés et tons des pastilles (statuts et priorités des tâches, entrées libres). Les changements s’appliquent au client actif après enregistrement."
      />
      <ClientBadgesAdminPanel />
    </PageContainer>
  );
}
