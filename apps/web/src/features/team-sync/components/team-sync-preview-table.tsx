'use client';

import type { DirectorySyncPreview } from '../types/team-sync.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  preview: DirectorySyncPreview | null;
};

export function TeamSyncPreviewTable({ preview }: Props) {
  if (!preview) return null;
  return (
    <div className="rounded-md border border-border p-4 text-sm">
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

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table className="min-w-[920px] text-sm">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Id</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Prenom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Departement</TableHead>
              <TableHead>Statut AD</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.items.map((item) => (
              <TableRow key={item.externalDirectoryId}>
                <TableCell>{item.externalDirectoryId}</TableCell>
                <TableCell>{item.lastName ?? '-'}</TableCell>
                <TableCell>{item.firstName ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{item.email ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{item.username ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{item.department ?? '-'}</TableCell>
                <TableCell>
                  {item.isActive ? (
                    <span className="text-emerald-700">Actif</span>
                  ) : (
                    <span className="text-amber-700">Inactif</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.action === 'create' ? (
                    <span className="font-medium text-emerald-700">Creation</span>
                  ) : (
                    <span className="font-medium text-blue-700">Mise a jour</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {preview.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucun objet a synchroniser.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
