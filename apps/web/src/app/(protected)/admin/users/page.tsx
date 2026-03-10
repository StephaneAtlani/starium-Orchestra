import { PlatformUsersTable } from '../../../../features/admin-studio/components/platform-users-table';
import { usePlatformUsersQuery } from '../../../../features/admin-studio/hooks/use-platform-users-query';

export default function AdminUsersPage() {
  const { data = [], isLoading, error } = usePlatformUsersQuery();

  return (
    <div>
      <h2 className="text-lg font-semibold">Utilisateurs globaux</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Liste des utilisateurs globaux de la plateforme.
      </p>

      <PlatformUsersTable
        users={data}
        isLoading={isLoading}
        error={error ?? null}
      />
    </div>
  );
}


