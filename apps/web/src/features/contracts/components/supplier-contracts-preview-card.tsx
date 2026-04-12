'use client';

import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { useContractsListQuery } from '../hooks/use-contracts-queries';
import { contractStatusLabel } from '../lib/contracts-labels';

const PREVIEW_LIMIT = 8;

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

/**
 * Aperçu des contrats rattachés à un fournisseur (fiche fournisseur).
 */
export function SupplierContractsPreviewCard({ supplierId }: { supplierId: string }) {
  const { has, isSuccess: permsSuccess, isLoading: permsLoading } = usePermissions();
  const canReadContracts = has('contracts.read');

  const q = useContractsListQuery(
    {
      supplierId,
      limit: PREVIEW_LIMIT,
      offset: 0,
    },
    {
      enabled:
        Boolean(supplierId) && permsSuccess && !permsLoading && canReadContracts,
    },
  );

  if (!permsSuccess || permsLoading || !canReadContracts) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="size-4" />
          Contrats
        </CardTitle>
        <CardDescription>
          Contrats enregistrés avec ce fournisseur comme contrepartie contractuelle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
        {q.isError && (
          <p className="text-sm text-destructive">Impossible de charger les contrats.</p>
        )}
        {q.isSuccess && q.data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun contrat pour ce fournisseur.</p>
        )}
        {q.isSuccess && q.data.items.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Fin effet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/contracts/${row.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">{row.title}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {contractStatusLabel(row.status)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.effectiveEnd ? formatShortDate(row.effectiveEnd) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {q.isSuccess && q.data.total > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            <Link
              href={`/contracts?supplierId=${encodeURIComponent(supplierId)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Voir tous les contrats
              {q.data.total > PREVIEW_LIMIT ? ` (${q.data.total})` : ''}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
