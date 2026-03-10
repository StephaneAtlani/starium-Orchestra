import type { AdminClientSummary } from '../types/admin-studio.types';

interface ClientsTableProps {
  clients: AdminClientSummary[];
  isLoading: boolean;
  error: Error | null;
}

export function ClientsTable({ clients, isLoading, error }: ClientsTableProps) {
  if (isLoading) {
    return <div>Chargement des clients…</div>;
  }

  if (error) {
    return (
      <div className="text-red-400">
        Erreur lors du chargement des clients : {error.message}
      </div>
    );
  }

  if (!clients.length) {
    return <div>Aucun client pour le moment.</div>;
  }

  return (
    <table className="mt-4 w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-neutral-800 text-left">
          <th className="py-2 pr-4">Nom</th>
          <th className="py-2 pr-4">Slug</th>
          <th className="py-2 pr-4">Créé le</th>
        </tr>
      </thead>
      <tbody>
        {clients.map((client) => (
          <tr key={client.id} className="border-b border-neutral-900">
            <td className="py-2 pr-4">{client.name}</td>
            <td className="py-2 pr-4 text-neutral-400">{client.slug}</td>
            <td className="py-2 pr-4 text-neutral-400">
              {new Date(client.createdAt).toLocaleDateString('fr-FR')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

