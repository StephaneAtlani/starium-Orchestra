import type { AdminPlatformAuditLogRow } from '../types/admin-studio.types';

interface PlatformAuditLogsTableProps {
  rows: AdminPlatformAuditLogRow[];
  isLoading: boolean;
  error: Error | null;
}

export function PlatformAuditLogsTable({
  rows,
  isLoading,
  error,
}: PlatformAuditLogsTableProps) {
  if (isLoading) {
    return <div>Chargement des audit logs…</div>;
  }

  if (error) {
    return (
      <div className="text-red-400">
        Erreur lors du chargement des audit logs : {error.message}
      </div>
    );
  }

  if (!rows.length) {
    return <div>Aucun audit log pour le moment.</div>;
  }

  return (
    <table className="mt-4 w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-neutral-800 text-left">
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">Client</th>
          <th className="py-2 pr-4">Utilisateur</th>
          <th className="py-2 pr-4">Action</th>
          <th className="py-2 pr-4">Ressource</th>
          <th className="py-2 pr-4">ID ressource</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-neutral-900">
            <td className="py-2 pr-4 text-neutral-400">
              {new Date(row.createdAt).toLocaleString('fr-FR')}
            </td>
            <td className="py-2 pr-4 text-neutral-300">
              {row.clientId ?? '—'}
            </td>
            <td className="py-2 pr-4 text-neutral-300">
              {row.userId ?? '—'}
            </td>
            <td className="py-2 pr-4">{row.action}</td>
            <td className="py-2 pr-4 text-neutral-300">{row.resourceType}</td>
            <td className="py-2 pr-4 text-neutral-300">
              {row.resourceId ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

