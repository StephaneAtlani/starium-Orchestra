import type { AdminPlatformUserSummary } from '../types/admin-studio.types';

interface PlatformUsersTableProps {
  users: AdminPlatformUserSummary[];
  isLoading: boolean;
  error: Error | null;
}

export function PlatformUsersTable({
  users,
  isLoading,
  error,
}: PlatformUsersTableProps) {
  if (isLoading) {
    return <div>Chargement des utilisateurs globaux…</div>;
  }

  if (error) {
    return (
      <div className="text-red-400">
        Erreur lors du chargement des utilisateurs globaux : {error.message}
      </div>
    );
  }

  if (!users.length) {
    return <div>Aucun utilisateur global pour le moment.</div>;
  }

  return (
    <table className="mt-4 w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-neutral-800 text-left">
          <th className="py-2 pr-4">Email</th>
          <th className="py-2 pr-4">Prénom</th>
          <th className="py-2 pr-4">Nom</th>
          <th className="py-2 pr-4">Rôle plateforme</th>
          <th className="py-2 pr-4">Créé le</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-neutral-900">
            <td className="py-2 pr-4">{user.email}</td>
            <td className="py-2 pr-4 text-neutral-300">
              {user.firstName ?? '—'}
            </td>
            <td className="py-2 pr-4 text-neutral-300">
              {user.lastName ?? '—'}
            </td>
            <td className="py-2 pr-4 text-neutral-400">
              {user.platformRole ?? '—'}
            </td>
            <td className="py-2 pr-4 text-neutral-400">
              {new Date(user.createdAt).toLocaleDateString('fr-FR')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

