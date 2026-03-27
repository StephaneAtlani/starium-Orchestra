import { RoleDetailPage } from '@/features/client-rbac/components/role-detail-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientRoleDetailPage({ params }: PageProps) {
  await params;
  return <RoleDetailPage />;
}
