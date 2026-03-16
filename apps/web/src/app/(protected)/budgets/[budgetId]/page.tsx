'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { BudgetPageHeader } from '@/features/budgets/components/budget-page-header';
import { BudgetKpiCards } from '@/features/budgets/components/budget-kpi-cards';
import { BudgetEmptyState } from '@/features/budgets/components/budget-empty-state';
import { BudgetToolbar } from '@/features/budgets/components/budget-toolbar';
import { BudgetExplorerTable } from '@/features/budgets/components/budget-explorer-table';
import { LoadingState } from '@/components/feedback/loading-state';
import { useBudgetExplorer } from '@/features/budgets/hooks/use-budget-explorer';
import { useBudgetExplorerTree } from '@/features/budgets/hooks/use-budget-explorer-tree';
import { useBudgetSummary } from '@/features/budgets/hooks/use-budget-summary';
import {
  budgetLines,
  budgetReporting,
  budgetSnapshots,
  budgetVersions,
  budgetReallocations,
  budgetEdit,
  budgetEnvelopeNew,
  budgetLineNew,
} from '@/features/budgets/constants/budget-routes';
import { PermissionGate } from '@/components/PermissionGate';
import { BudgetStatusBadge } from '@/features/budgets/components/budget-status-badge';
import { formatAmount } from '@/features/budgets/lib/budget-formatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetExplorerFilters } from '@/features/budgets/types/budget-explorer.types';

export default function BudgetDetailPage() {
  const params = useParams();
  const budgetId = typeof params.budgetId === 'string' ? params.budgetId : null;

  const { budget, envelopes, lines, isLoading, error, refetch } =
    useBudgetExplorer(budgetId);

  const [filters, setFilters] = useState<BudgetExplorerFilters>({});
  const { tree, filteredTree } = useBudgetExplorerTree(
    budget,
    envelopes,
    lines,
    filters,
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editableLineId, setEditableLineId] = useState<string | null>(null);
  const hasInitializedExpanded = useRef(false);

  useEffect(() => {
    if (tree.length > 0 && !hasInitializedExpanded.current) {
      const rootEnvelopeIds = tree
        .filter((n) => n.type === 'envelope')
        .map((n) => n.id);
      setExpandedIds(new Set(rootEnvelopeIds));
      hasInitializedExpanded.current = true;
    }
  }, [tree]);

  const onToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { data: summary } = useBudgetSummary(budgetId);

  if (isLoading) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" description="Chargement…" />
          <LoadingState rows={3} />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  if (error || !budget) {
    return (
      <RequireActiveClient>
        <PageContainer>
          <BudgetPageHeader title="Budget" />
          <BudgetEmptyState title="Aucun budget à afficher" description="" />
        </PageContainer>
      </RequireActiveClient>
    );
  }

  const kpi = summary?.kpi;
  const currency = budget.currency;
  const kpiItems = kpi
    ? [
        { label: 'Initial', value: formatAmount(kpi.totalInitialAmount, currency) },
        { label: 'Révisé', value: formatAmount(kpi.totalRevisedAmount, currency) },
        { label: 'Engagé', value: formatAmount(kpi.totalCommittedAmount, currency) },
        { label: 'Consommé', value: formatAmount(kpi.totalConsumedAmount, currency) },
        { label: 'Restant', value: formatAmount(kpi.totalRemainingAmount, currency) },
      ]
    : [];

  const isEmptyGlobal = tree.length === 0;
  const isEmptyFiltered = filteredTree.length === 0 && tree.length > 0;

  return (
    <RequireActiveClient>
      <PageContainer>
        <BudgetPageHeader
          title={budget.name}
          description={
            budget.code ? `${budget.code} · ${budget.currency}` : budget.currency
          }
          actions={
            <div className="flex items-center gap-2">
              <PermissionGate permission="budgets.update">
                <Link
                  href={budgetEdit(budgetId!)}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                >
                  Modifier
                </Link>
              </PermissionGate>
              <PermissionGate permission="budgets.create">
                <Link
                  href={budgetEnvelopeNew(budgetId!)}
                  className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Nouvelle enveloppe
                </Link>
              </PermissionGate>
              <PermissionGate permission="budgets.create">
                <Link
                  href={budgetLineNew(budgetId!)}
                  className="inline-flex h-7 items-center justify-center rounded-md bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Nouvelle ligne
                </Link>
              </PermissionGate>
            </div>
          }
        />

        <div className="mb-4">
          <BudgetStatusBadge status={budget.status} />
        </div>

        {kpiItems.length > 0 && (
          <BudgetKpiCards items={kpiItems} className="mb-6" />
        )}

        <BudgetToolbar className="mb-4">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Input
              placeholder="Rechercher (nom, code)…"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value || undefined }))
              }
              className="max-w-xs"
              data-testid="explorer-search"
            />
            <Select
              value={filters.envelopeType ?? '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  envelopeType: v === '__all__' || !v ? undefined : v,
                }))
              }
            >
              <SelectTrigger size="sm" className="w-[140px]" data-testid="explorer-envelope-type">
                <SelectValue placeholder="Type enveloppe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous les types</SelectItem>
                <SelectItem value="RUN">RUN</SelectItem>
                <SelectItem value="BUILD">BUILD</SelectItem>
                <SelectItem value="TRANSVERSE">TRANSVERSE</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.expenseType ?? '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  expenseType: v === '__all__' || !v ? undefined : v,
                }))
              }
            >
              <SelectTrigger size="sm" className="w-[120px]" data-testid="explorer-expense-type">
                <SelectValue placeholder="OPEX/CAPEX" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                <SelectItem value="OPEX">OPEX</SelectItem>
                <SelectItem value="CAPEX">CAPEX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </BudgetToolbar>

        {isEmptyGlobal && (
          <BudgetEmptyState
            title="Aucune enveloppe"
            description="Ce budget n’a pas encore d’enveloppe. Les lignes budgétaires apparaîtront ici une fois la structure créée."
            className="mb-6"
          />
        )}

        {!isEmptyGlobal && (
          <Card className="mb-6">
            <CardContent className="p-0">
              <BudgetExplorerTable
                nodes={filteredTree}
                currency={currency}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                budgetId={budgetId!}
                editableLineId={editableLineId}
                onToggleEditable={setEditableLineId}
                emptyMessage="Aucune enveloppe."
                emptyFilteredMessage="Aucun résultat pour ces filtres."
                isFilteredEmpty={isEmptyFiltered}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accès rapides</CardTitle>
            <CardDescription>Sous-domaines du budget.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={budgetLines(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Lignes
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetReporting(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reporting
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetSnapshots(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Snapshots
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetVersions(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Versions
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href={budgetReallocations(budgetId!)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Réallocations
            </Link>
          </CardContent>
        </Card>

      </PageContainer>
    </RequireActiveClient>
  );
}
