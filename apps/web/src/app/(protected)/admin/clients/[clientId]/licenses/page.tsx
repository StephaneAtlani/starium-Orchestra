'use client';

import { useParams } from 'next/navigation';
import { PlatformClientLicensesPage } from '@/features/licenses/components/platform-client-licenses-page';

export default function AdminClientLicensesRoute() {
  const params = useParams();
  const clientId = typeof params?.clientId === 'string' ? params.clientId : '';
  return <PlatformClientLicensesPage clientId={clientId} />;
}
