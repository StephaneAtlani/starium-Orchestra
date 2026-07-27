'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, MinusCircle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';
import type {
  ComplianceAssessmentStatusApi,
  ComplianceStatusRowApi,
} from '../api/compliance.api';

const STATUS_META: Record<
  ComplianceAssessmentStatusApi,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  COMPLIANT: {
    label: 'Conforme',
    className: 'text-[color:var(--state-success)]',
    icon: CheckCircle2,
  },
  PARTIALLY_COMPLIANT: {
    label: 'Partiellement conforme',
    className: 'text-[color:var(--brand-gold-700)]',
    icon: Clock3,
  },
  NON_COMPLIANT: {
    label: 'Écart',
    className: 'text-destructive',
    icon: AlertCircle,
  },
  NOT_APPLICABLE: {
    label: 'Non applicable',
    className: 'text-muted-foreground',
    icon: MinusCircle,
  },
};

export function complianceStatusLabel(status: ComplianceAssessmentStatusApi): string {
  return STATUS_META[status]?.label ?? status;
}

function ControlStatus({ status }: { status: ComplianceAssessmentStatusApi }) {
  const meta = STATUS_META[status];
  if (!meta) return <span className="text-sm">{status}</span>;
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', meta.className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Filtre plein texte sur le code, le titre et le référentiel. */
export function filterComplianceControls(
  rows: ComplianceStatusRowApi[],
  search: string,
): ComplianceStatusRowApi[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.requirement.code,
      row.requirement.title,
      row.requirement.category ?? '',
      row.requirement.framework.name,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function ComplianceControlsTable({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: ComplianceStatusRowApi[] | undefined;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState('');
  const data = useMemo(() => filterComplianceControls(rows ?? [], search), [rows, search]);

  const columns = useMemo<DataTableColumn<ComplianceStatusRowApi>[]>(
    () => [
      {
        key: 'requirement',
        header: 'Exigence / contrôle',
        mobilePriority: 'primary',
        cell: (row) => (
          <div className="min-w-0">
            <div className="font-semibold text-foreground">{row.requirement.title}</div>
            <div className="text-xs text-muted-foreground">
              {row.requirement.code}
              {row.requirement.category ? ` · ${row.requirement.category}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'framework',
        header: 'Référentiel',
        mobilePriority: 'secondary',
        cell: (row) => (
          <RegistryBadge className="border-border/70 bg-muted/40 text-foreground">
            {row.requirement.framework.name}
          </RegistryBadge>
        ),
      },
      {
        key: 'lastAssessmentDate',
        header: 'Dernière revue',
        mobilePriority: 'secondary',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.lastAssessmentDate)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'État',
        mobilePriority: 'secondary',
        cell: (row) => <ControlStatus status={row.status} />,
      },
    ],
    [],
  );

  return (
    <Card
      size="sm"
      className="starium-panel max-md:border-0 max-md:bg-transparent max-md:shadow-none overflow-hidden border border-border shadow-sm"
    >
      <CardHeader className="gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Contrôles &amp; exigences</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Exigences évaluées, toutes échéances confondues.
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un contrôle…"
            aria-label="Rechercher un contrôle"
            className="w-full border-input pl-8 text-foreground"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error ?? null}
          onRetry={onRetry}
          getRowId={(row) => row.id}
          mobileCardsAriaLabel="Liste des contrôles de conformité"
          emptyTitle={
            search.trim() ? 'Aucun contrôle pour cette recherche' : 'Aucun contrôle évalué'
          }
          emptyDescription={
            search.trim()
              ? 'Modifiez votre recherche pour élargir la sélection.'
              : 'Évaluez une exigence pour la voir apparaître ici.'
          }
        />
      </CardContent>
    </Card>
  );
}
