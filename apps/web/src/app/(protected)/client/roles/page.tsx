import { RolesList } from '@/features/client-rbac/components/roles-list';

export default async function ClientRolesPage({
  params,
}: {
  params: Promise<Record<string, string | string[]>>;
}) {
  await params;
  return <RolesList />;
}
