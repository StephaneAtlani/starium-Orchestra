'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LicenseReportingClientRow } from '../api/license-reporting';

interface Props {
  rows: LicenseReportingClientRow[];
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function LicenseReportingClientsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun client correspondant aux filtres en cours.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Membres actifs</TableHead>
          <TableHead className="text-right">Sièges</TableHead>
          <TableHead className="text-right">Lecture seule</TableHead>
          <TableHead className="text-right">Geste commercial</TableHead>
          <TableHead className="text-right">Évaluations actives</TableHead>
          <TableHead className="text-right">Support interne</TableHead>
          <TableHead className="text-right">Abonnements actifs</TableHead>
          <TableHead className="text-right">Expirés (en grâce)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.clientId}>
            <TableCell>
              <div className="font-medium">{row.clientName}</div>
              <div className="text-xs text-muted-foreground">{row.clientSlug}</div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.clientUsersActive)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.seats.readWriteBillableUsed)} /{' '}
              {fmt(row.seats.readWriteBillableLimit)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.licenses.readOnly)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.licenses.nonBillable)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.licenses.evaluationActive)}{' '}
              <span className="text-xs text-muted-foreground">
                ({fmt(row.licenses.evaluationExpired)} exp.)
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.licenses.platformInternalActive)}{' '}
              <span className="text-xs text-muted-foreground">
                ({fmt(row.licenses.platformInternalExpired)} exp.)
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.subscriptions.active)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(row.subscriptions.expired)}{' '}
              <span className="text-xs text-muted-foreground">
                ({fmt(row.subscriptions.expiredInGrace)} grâce)
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
