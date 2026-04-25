'use client';

import { RequireActiveClient } from '@/components/RequireActiveClient';
import { StrategicVisionPage } from '@/features/strategic-vision/components/strategic-vision-page';

export default function StrategicVisionRoutePage() {
  return (
    <RequireActiveClient>
      <StrategicVisionPage />
    </RequireActiveClient>
  );
}
