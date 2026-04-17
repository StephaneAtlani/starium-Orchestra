'use client';

import { RoleDetailPage } from '@/features/client-rbac/components/role-detail-page';

/** Route dynamique : l’id est lu via `useParams()` dans `RoleDetailPage` (évite `params` async côté page). */
export default function ClientRoleDetailPage() {
  return <RoleDetailPage />;
}
