'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LicenseReportingMonthlySeries } from '../api/license-reporting';

interface Props {
  series: LicenseReportingMonthlySeries | undefined;
}

const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: 'numeric',
});

function formatMonth(key: string): string {
  const [y, m] = key.split('-').map((s) => parseInt(s, 10));
  return MONTH_FMT.format(new Date(Date.UTC(y, m - 1, 15)));
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function LicenseReportingMonthlyTable({ series }: Props) {
  if (!series) {
    return (
      <p className="text-sm text-muted-foreground">
        Sélectionner une période pour afficher la trajectoire.
      </p>
    );
  }
  if (series.points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune donnée disponible pour la période sélectionnée.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mois</TableHead>
          <TableHead className="text-right">Lecture seule</TableHead>
          <TableHead className="text-right">Lecture/Écriture facturable</TableHead>
          <TableHead className="text-right">Geste commercial</TableHead>
          <TableHead className="text-right">Évaluations actives</TableHead>
          <TableHead className="text-right">Évaluations expirées</TableHead>
          <TableHead className="text-right">Support interne actif</TableHead>
          <TableHead className="text-right">Abonnements actifs</TableHead>
          <TableHead className="text-right">Abonnements expirés</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {series.points.map((p) => (
          <TableRow key={p.month}>
            <TableCell className="font-medium">{formatMonth(p.month)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.readOnly)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.clientBillable)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.nonBillable)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.evaluationActive)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.evaluationExpired)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.licenses.platformInternalActive)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.subscriptions.active)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmt(p.subscriptions.expired)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
