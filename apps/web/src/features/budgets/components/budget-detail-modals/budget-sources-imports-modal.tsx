'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, FileSpreadsheet } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listBudgetImportMappings } from '@/features/budgets/api/budget-imports.api';
import { budgetQueryKeys } from '@/features/budgets/lib/budget-query-keys';
import type { BudgetImportMappingDto } from '@/features/budgets/types/budget-imports.types';

type BudgetSourcesImportsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetName: string;
  onNewImport: () => void;
};

function formatSourceType(sourceType: BudgetImportMappingDto['sourceType']): string {
  return sourceType === 'XLSX' ? 'Excel' : 'CSV';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function BudgetSourcesImportsModal({
  open,
  onOpenChange,
  budgetName,
  onNewImport,
}: BudgetSourcesImportsModalProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const query = useQuery({
    queryKey: budgetQueryKeys.budgetImportMappingsList(clientId),
    queryFn: () => listBudgetImportMappings(authFetch, { limit: 200, offset: 0 }),
    enabled: open && !!clientId,
  });

  const items = query.data?.items ?? [];

  const stats = useMemo(() => {
    const xlsxCount = items.filter((item) => item.sourceType === 'XLSX').length;
    const csvCount = items.filter((item) => item.sourceType === 'CSV').length;
    const latestUpdate = items.reduce<string | null>((latest, item) => {
      if (!latest) return item.updatedAt;
      return new Date(item.updatedAt) > new Date(latest) ? item.updatedAt : latest;
    }, null);

    return {
      total: items.length,
      xlsxCount,
      csvCount,
      latestUpdate,
    };
  }, [items]);

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Sources et imports"
      description={`${budgetName} · mappings d’import enregistrés pour le client actif`}
      icon={Database}
      size="xl"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            onClick={() => {
              onOpenChange(false);
              onNewImport();
            }}
          >
            Nouvel import
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Mappings actifs</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Configurations réutilisables</p>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Formats</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {stats.xlsxCount} Excel · {stats.csvCount} CSV
            </p>
          </section>
          <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <p className="starium-overline text-muted-foreground">Dernière mise à jour</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {stats.latestUpdate ? formatDate(stats.latestUpdate) : '—'}
            </p>
          </section>
        </div>

        {query.isLoading ? <LoadingState rows={3} /> : null}

        {query.error ? (
          <ErrorState
            message={
              query.error instanceof Error ? query.error.message : 'Une erreur est survenue.'
            }
          />
        ) : null}

        {!query.isLoading && !query.error && items.length === 0 ? (
          <EmptyState
            title="Aucun mapping enregistré"
            description="Créez un premier import pour enregistrer un mapping réutilisable."
          />
        ) : null}

        {!query.isLoading && !query.error && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((mapping) => (
              <article
                key={mapping.id}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted/50">
                      <FileSpreadsheet className="size-4 text-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground">{mapping.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSourceType(mapping.sourceType)}
                        {mapping.sheetName ? ` · ${mapping.sheetName}` : ''}
                      </p>
                      {mapping.description ? (
                        <p className="text-sm text-muted-foreground">{mapping.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Mis à jour le {formatDate(mapping.updatedAt)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </StariumModal>
  );
}
