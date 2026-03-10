import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  // Point d'entrée technique : redirige vers /admin/clients pour le MVP.
  redirect('/admin/clients');
}

