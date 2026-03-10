import { ClientsTable } from '../../../../features/admin-studio/components/clients-table';
import { CreateClientDialog } from '../../../../features/admin-studio/components/create-client-dialog';
import { useClientsQuery } from '../../../../features/admin-studio/hooks/use-clients-query';

export default function AdminClientsPage() {
  const { data = [], isLoading, error } = useClientsQuery();

  return (
    <div>
      <h2 className="text-lg font-semibold">Clients plateforme</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Voir et créer les clients de la plateforme.
      </p>

      <CreateClientDialog />
      <ClientsTable
        clients={data}
        isLoading={isLoading}
        error={error ?? null}
      />
    </div>
  );
}


