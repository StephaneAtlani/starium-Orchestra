'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { PlatformBadgesAdminPanel } from '@/features/ui/components/client-badges-admin-panel';

const ADMIN_CLIENT_HREF = '/client/administration/badges';

export default function AdminUiBadgesPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace(ADMIN_CLIENT_HREF);
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return null;
  }

  if (user?.platformRole !== 'PLATFORM_ADMIN') {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Redirection vers la configuration client…
      </p>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Badges interface (plateforme)"
        description="Défauts globaux pour tous les clients. Les organisations peuvent encore surcharger dans Administration client → Badges interface."
      />
      <PlatformBadgesAdminPanel />
    </PageContainer>
  );
}
