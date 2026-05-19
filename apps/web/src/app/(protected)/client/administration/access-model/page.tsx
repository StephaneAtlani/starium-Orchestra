'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/feedback/loading-state';
import { AccessModelPage } from '@/features/access-model/components/access-model-page';

export default function ClientAdministrationAccessModelRoute() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  return <AccessModelPage />;
}
