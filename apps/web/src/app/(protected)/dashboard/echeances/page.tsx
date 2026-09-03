'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { HomeDeadlinesPage } from '@/features/dashboard/home-deadlines-page';

export default function DashboardEcheancesPage() {
  return (
    <RequireActiveClient>
      <HomeDeadlinesPage />
    </RequireActiveClient>
  );
}
