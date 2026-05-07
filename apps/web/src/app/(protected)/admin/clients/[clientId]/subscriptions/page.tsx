'use client';

import { useParams } from 'next/navigation';
import { PlatformClientSubscriptionsPage } from '@/features/licenses/components/platform-client-subscriptions-page';

export default function AdminClientSubscriptionsRoute() {
  const params = useParams();
  const clientId = typeof params?.clientId === 'string' ? params.clientId : '';
  return <PlatformClientSubscriptionsPage clientId={clientId} />;
}
