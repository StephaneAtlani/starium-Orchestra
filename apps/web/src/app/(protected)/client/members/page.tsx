import { MembersList } from '@/features/client-rbac/components/members-list';

export default async function ClientMembersPage({
  params,
}: {
  params: Promise<Record<string, string | string[]>>;
}) {
  await params;
  return <MembersList />;
}
