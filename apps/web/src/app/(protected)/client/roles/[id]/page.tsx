import { RoleDetailPage } from '@/features/client-rbac/components/role-detail-page';

export default async function ClientRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <RoleDetailPage />;
}
