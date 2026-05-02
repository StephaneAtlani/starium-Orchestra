'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { CreateBudgetSnapshotDialog } from '@/features/budgets/components/create-budget-snapshot-dialog';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import { listBudgetSnapshots } from '@/features/budgets/api/budget-snapshots.api';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function toDisplayDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR');
}

/** Date et heure d’exécution du snapshot (création effective en base). */
function formatSnapshotExecutionDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);
}

type SnapshotSortKey =
  | 'snapshotDate'
  | 'createdAt'
  | 'code'
  | 'name'
  | 'occasionTypeLabel'
  | 'totalInitialAmount'
  | 'createdByLabel';

type SnapshotColumnFilters = {
  captureDate: string;
  executionDate: string;
  code: string;
  name: string;
  occasionType: string;
  totalBudget: string;
  createdBy: string;
};

const defaultFilters: SnapshotColumnFilters = {
  captureDate: '',
  executionDate: '',
  code: '',
  name: '',
  occasionType: '',
  totalBudget: '',
  createdBy: '',
};

function SortHeader({
  label,
  columnKey,
  activeKey,
  order,
  onSort,
  className,
  /** Infobulle (ex. sémantique métier de la colonne). */
  tip,
}: {
  label: string;
  columnKey: SnapshotSortKey;
  activeKey: SnapshotSortKey;
  order: 'asc' | 'desc';
  onSort: (key: SnapshotSortKey) => void;
  className?: string;
  tip?: string;
}) {
  const isActive = activeKey === columnKey;
  return (
    <button
      type="button"
      className={cn(
        'inline-flex max-w-full items-center gap-1 text-left font-medium hover:text-foreground',
        className,
      )}
      onClick={() => onSort(columnKey)}
      title={tip ?? `Trier par ${label}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {isActive ? (
        order === 'asc' ? (
          <ArrowUp className="size-3 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="size-3 shrink-0" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="size-3 shrink-0 opacity-60" aria-hidden />
      )}
    </button>
  );
}

export default function BudgetSnapshotsPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [createOpen, setCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SnapshotSortKey>('snapshotDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<SnapshotColumnFilters>(defaultFilters);

  const snapshotsQuery = useQuery({
    queryKey: budgetQueryKeys.budgetSnapshotsList(clientId, budgetId),
    queryFn: () => listBudgetSnapshots(authFetch, budgetId, { limit: 100, offset: 0 }),
    enabled: !!clientId && !!budgetId,
  });

  const items = useMemo(
    () => snapshotsQuery.data?.items ?? [],
    [snapshotsQuery.data?.items],
  );

  const handleSort = (key: SnapshotSortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      const descDefault: SnapshotSortKey[] = [
        'snapshotDate',
        'createdAt',
        'totalInitialAmount',
      ];
      setSortOrder(descDefault.includes(key) ? 'desc' : 'asc');
    }
  };

  const filteredSorted = useMemo(() => {
    const q = (s: string) => s.trim().toLowerCase();

    let rows = items.filter((snap) => {
      const captureStr = toDisplayDate(snap.snapshotDate || snap.createdAt).toLowerCase();
      if (filters.captureDate.trim() && !captureStr.includes(q(filters.captureDate))) {
        return false;
      }
      const execStr = formatSnapshotExecutionDateTime(snap.createdAt).toLowerCase();
      if (filters.executionDate.trim() && !execStr.includes(q(filters.executionDate))) {
        return false;
      }
      if (filters.code.trim() && !snap.code.toLowerCase().includes(q(filters.code))) {
        return false;
      }
      if (filters.name.trim() && !snap.name.toLowerCase().includes(q(filters.name))) {
        return false;
      }
      const typeLabel = (snap.occasionTypeLabel ?? '—').toLowerCase();
      if (filters.occasionType.trim() && !typeLabel.includes(q(filters.occasionType))) {
        return false;
      }
      const totalStr = formatCurrency(snap.totalInitialAmount, snap.budgetCurrency).toLowerCase();
      const totalNorm = totalStr.replace(/\s/g, '');
      const fb = q(filters.totalBudget).replace(/\s/g, '');
      if (fb && !totalNorm.includes(fb)) {
        return false;
      }
      const by = (snap.createdByLabel ?? 'Utilisateur inconnu').toLowerCase();
      if (filters.createdBy.trim() && !by.includes(q(filters.createdBy))) {
        return false;
      }
      return true;
    });

    const dir = sortOrder === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const cmpNum = (x: number, y: number) => (x - y) * dir;
      const cmpStr = (x: string, y: string) => x.localeCompare(y, 'fr', { sensitivity: 'base' }) * dir;
      switch (sortKey) {
        case 'snapshotDate':
          return cmpNum(
            new Date(a.snapshotDate || a.createdAt).getTime(),
            new Date(b.snapshotDate || b.createdAt).getTime(),
          );
        case 'createdAt': {
          return cmpNum(new Date(a.createdAt).getTime(), new Date(b.createdAt).getTime());
        }
        case 'code':
          return cmpStr(a.code, b.code);
        case 'name':
          return cmpStr(a.name, b.name);
        case 'occasionTypeLabel':
          return cmpStr(a.occasionTypeLabel ?? '', b.occasionTypeLabel ?? '');
        case 'totalInitialAmount':
          return cmpNum(a.totalInitialAmount, b.totalInitialAmount);
        case 'createdByLabel':
          return cmpStr(
            a.createdByLabel ?? '',
            b.createdByLabel ?? '',
          );
        default:
          return 0;
      }
    });

    return rows;
  }, [items, sortKey, sortOrder, filters]);

  const patchFilters = (patch: Partial<SnapshotColumnFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title="Versions figées"
          description="Copies lecture seule du budget à un instant donné (audit, comparaison, CODIR)."
          actions={
            <PermissionGate permission="budgets.create">
              <Button onClick={() => setCreateOpen(true)} disabled={!budgetId}>
                Enregistrer une version
              </Button>
            </PermissionGate>
          }
        />

        <CreateBudgetSnapshotDialog
          budgetId={budgetId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />

        {snapshotsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {snapshotsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription>
              {(snapshotsQuery.error as Error)?.message ??
                'Erreur API lors du chargement des versions figées.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune version figée pour ce budget</p>
        ) : null}

        {!snapshotsQuery.isLoading &&
        !snapshotsQuery.isError &&
        (snapshotsQuery.data?.items?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[10rem]">
                    <SortHeader
                      label="Figée au…"
                      columnKey="snapshotDate"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                      tip="Référence temporelle de la version figée (état du budget à cette date)."
                    />
                  </TableHead>
                  <TableHead className="min-w-[11rem]">
                    <SortHeader
                      label="Date"
                      columnKey="createdAt"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                      tip="Date et heure d’exécution du snapshot (enregistrement effectif)."
                    />
                  </TableHead>
                  <TableHead className="min-w-[7rem]">
                    <SortHeader
                      label="Code"
                      columnKey="code"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="min-w-[10rem]">
                    <SortHeader
                      label="Nom"
                      columnKey="name"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="min-w-[9rem]">
                    <SortHeader
                      label="Type de version figée"
                      columnKey="occasionTypeLabel"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="min-w-[9rem] text-right">
                    <div className="flex justify-end">
                      <SortHeader
                        label="Total budget"
                        columnKey="totalInitialAmount"
                        activeKey={sortKey}
                        order={sortOrder}
                        onSort={handleSort}
                        className="text-right"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[9rem]">
                    <SortHeader
                      label="Créé par"
                      columnKey="createdByLabel"
                      activeKey={sortKey}
                      order={sortOrder}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-[5.5rem] text-right">Action</TableHead>
                </TableRow>
                <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40 [&_tr]:border-b-0">
                  <TableHead className="p-1.5 align-top">
                    <div className="relative w-full min-w-[8rem]">
                      <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        className="h-8 pl-8 text-xs"
                        placeholder="Filtrer…"
                        value={filters.captureDate}
                        onChange={(e) => patchFilters({ captureDate: e.target.value })}
                        autoComplete="off"
                        aria-label="Filtrer par date « figée au »"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <div className="relative w-full min-w-[8rem]">
                      <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        className="h-8 pl-8 text-xs"
                        placeholder="Filtrer…"
                        value={filters.executionDate}
                        onChange={(e) => patchFilters({ executionDate: e.target.value })}
                        autoComplete="off"
                        aria-label="Filtrer par date et heure d’exécution"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Filtrer…"
                      value={filters.code}
                      onChange={(e) => patchFilters({ code: e.target.value })}
                      autoComplete="off"
                      aria-label="Filtrer par code"
                    />
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Filtrer…"
                      value={filters.name}
                      onChange={(e) => patchFilters({ name: e.target.value })}
                      autoComplete="off"
                      aria-label="Filtrer par nom"
                    />
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Filtrer…"
                      value={filters.occasionType}
                      onChange={(e) => patchFilters({ occasionType: e.target.value })}
                      autoComplete="off"
                      aria-label="Filtrer par type de version"
                    />
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <Input
                      className="h-8 w-full min-w-[6rem] text-xs"
                      placeholder="Filtrer…"
                      value={filters.totalBudget}
                      onChange={(e) => patchFilters({ totalBudget: e.target.value })}
                      autoComplete="off"
                      aria-label="Filtrer par montant"
                    />
                  </TableHead>
                  <TableHead className="p-1.5 align-top">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Filtrer…"
                      value={filters.createdBy}
                      onChange={(e) => patchFilters({ createdBy: e.target.value })}
                      autoComplete="off"
                      aria-label="Filtrer par auteur"
                    />
                  </TableHead>
                  <TableHead className="p-1.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.map((snapshot) => (
                  <TableRow key={snapshot.id}>
                    <TableCell className="tabular-nums">
                      {toDisplayDate(snapshot.snapshotDate || snapshot.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatSnapshotExecutionDateTime(snapshot.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{snapshot.code}</TableCell>
                    <TableCell>{snapshot.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {snapshot.occasionTypeLabel ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(snapshot.totalInitialAmount, snapshot.budgetCurrency)}
                    </TableCell>
                    <TableCell>{snapshot.createdByLabel ?? 'Utilisateur inconnu'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/budgets/${budgetId}/snapshots/${snapshot.id}`}>Ouvrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredSorted.length === 0 ? (
              <p className="border-t border-border/60 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
                Aucun résultat pour les filtres actuels.
              </p>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </RequireActiveClient>
  );
}
