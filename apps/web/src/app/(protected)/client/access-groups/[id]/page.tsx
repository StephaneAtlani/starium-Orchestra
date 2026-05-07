import { redirect } from 'next/navigation';

export default async function ClientAccessGroupDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/client/administration/access-groups/${id}`);
}
