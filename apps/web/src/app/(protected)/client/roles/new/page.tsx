import { RoleCreatePage } from '@/features/client-rbac/components/role-create-page';

export default async function ClientRolesNewPage({
  params,
}: {
  params: Promise<Record<string, string | string[]>>;
}) {
  await params;
  return <RoleCreatePage />;
}
