import { redirect } from 'next/navigation';

export default async function AdminIndexPage({
  params,
}: {
  params: Promise<Record<string, string | string[]>>;
}) {
  await params;
  // Point d'entrée technique : redirige vers /admin/clients pour le MVP.
  redirect('/admin/clients');
}

