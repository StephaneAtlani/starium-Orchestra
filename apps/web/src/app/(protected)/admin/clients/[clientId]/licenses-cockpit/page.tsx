'use client';

import { useParams } from 'next/navigation';
import { PlatformLicensesCockpitPage } from '@/features/licenses-cockpit/components/platform-licenses-cockpit-page';

export default function AdminClientLicensesCockpitRoute() {
  const params = useParams();
  const clientId = typeof params?.clientId === 'string' ? params.clientId : '';
  return <PlatformLicensesCockpitPage clientId={clientId} />;
}
