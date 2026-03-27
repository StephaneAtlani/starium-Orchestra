'use client';

import type { DirectorySyncPreview } from '../types/team-sync.types';

type Props = {
  preview: DirectorySyncPreview | null;
};

export function TeamSyncPreviewTable({ preview }: Props) {
  if (!preview) return null;
  return (
    <div className="rounded-md border p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Mode" value={preview.mode} />
        <Metric label="Trouvés" value={String(preview.totalFound)} />
        <Metric label="Créations" value={String(preview.createCount)} />
        <Metric label="Mises à jour" value={String(preview.updateCount)} />
        <Metric label="Désactivations" value={String(preview.deactivateCount)} />
      </div>
      {preview.warnings.length > 0 && (
        <p className="mt-3 text-amber-600">{preview.warnings.join(' · ')}</p>
      )}
      {preview.errors.length > 0 && (
        <p className="mt-3 text-destructive">{preview.errors.join(' · ')}</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-2 font-medium">Id</th>
              <th className="p-2 font-medium">Nom</th>
              <th className="p-2 font-medium">Prenom</th>
              <th className="p-2 font-medium">Email</th>
              <th className="p-2 font-medium">Login</th>
              <th className="p-2 font-medium">Departement</th>
              <th className="p-2 font-medium">Statut AD</th>
              <th className="p-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((item) => (
              <tr key={item.externalDirectoryId} className="border-t">
                <td className="p-2">{item.externalDirectoryId}</td>
                <td className="p-2">{item.lastName ?? '-'}</td>
                <td className="p-2">{item.firstName ?? '-'}</td>
                <td className="p-2 text-muted-foreground">{item.email ?? '-'}</td>
                <td className="p-2 text-muted-foreground">{item.username ?? '-'}</td>
                <td className="p-2 text-muted-foreground">{item.department ?? '-'}</td>
                <td className="p-2">
                  {item.isActive ? (
                    <span className="text-emerald-700">Actif</span>
                  ) : (
                    <span className="text-amber-700">Inactif</span>
                  )}
                </td>
                <td className="p-2">
                  {item.action === 'create' ? (
                    <span className="font-medium text-emerald-700">Creation</span>
                  ) : (
                    <span className="font-medium text-blue-700">Mise a jour</span>
                  )}
                </td>
              </tr>
            ))}
            {preview.items.length === 0 && (
              <tr className="border-t">
                <td colSpan={8} className="p-3 text-center text-muted-foreground">
                  Aucun objet a synchroniser.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/40 p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
