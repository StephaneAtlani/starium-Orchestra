'use client';

import { AccessGroupDetailPage } from '@/features/access-groups/components/access-group-detail-page';

/** Route dynamique : `useParams()` dans le composant (évite params async). */
export default function ClientAccessGroupDetailRoute() {
  return <AccessGroupDetailPage />;
}
