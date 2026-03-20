'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import {
  listBudgetLineAllocations,
  listBudgetLineEvents,
} from '../api/budget-line-financial.api';
import {
  listInvoicesByBudgetLine,
  listPurchaseOrdersByBudgetLine,
} from '../../procurement/api/procurement.api';
import {
  dedupeTimelineEvents,
  filterTimelineEvents,
  mapAllocationToTimelineEvent,
  mapFinancialEventToTimelineEvent,
  mapInvoiceToTimelineEvent,
  mapPurchaseOrderToTimelineEvent,
  sortTimelineEventsDesc,
  type TimelineFiltersState,
} from '../components/budget-line-drawer/timeline-utils';

const TIMELINE_PAGE = { offset: 0, limit: 200 } as const;

export function useBudgetLineTimeline(
  budgetLineId: string | null,
  lineCurrency: string,
  enabled = true,
) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const [filters, setFilters] = useState<TimelineFiltersState>({
    type: 'all',
    period: 'all',
  });

  const baseEnabled = enabled && !!clientId && !!budgetLineId;

  const eventsQ = useQuery({
    queryKey: budgetLineId
      ? ([
          ...budgetQueryKeys.timeline(clientId, budgetLineId),
          'events',
          TIMELINE_PAGE,
        ] as const)
      : ['budgets', 'timeline-disabled', 'events'],
    queryFn: () =>
      listBudgetLineEvents(authFetch, budgetLineId!, {
        offset: TIMELINE_PAGE.offset,
        limit: TIMELINE_PAGE.limit,
      }),
    enabled: baseEnabled,
  });

  const allocationsQ = useQuery({
    queryKey: budgetLineId
      ? ([
          ...budgetQueryKeys.timeline(clientId, budgetLineId),
          'allocations',
          TIMELINE_PAGE,
        ] as const)
      : ['budgets', 'timeline-disabled', 'allocations'],
    queryFn: () =>
      listBudgetLineAllocations(authFetch, budgetLineId!, {
        offset: TIMELINE_PAGE.offset,
        limit: TIMELINE_PAGE.limit,
      }),
    enabled: baseEnabled,
  });

  const purchaseOrdersQ = useQuery({
    queryKey: budgetLineId
      ? ([
          ...budgetQueryKeys.timeline(clientId, budgetLineId),
          'purchase-orders',
          TIMELINE_PAGE,
        ] as const)
      : ['budgets', 'timeline-disabled', 'purchase-orders'],
    queryFn: () =>
      listPurchaseOrdersByBudgetLine(authFetch, budgetLineId!, {
        offset: TIMELINE_PAGE.offset,
        limit: TIMELINE_PAGE.limit,
      }),
    enabled: baseEnabled,
  });

  const invoicesQ = useQuery({
    queryKey: budgetLineId
      ? ([
          ...budgetQueryKeys.timeline(clientId, budgetLineId),
          'invoices',
          TIMELINE_PAGE,
        ] as const)
      : ['budgets', 'timeline-disabled', 'invoices'],
    queryFn: () =>
      listInvoicesByBudgetLine(authFetch, budgetLineId!, {
        offset: TIMELINE_PAGE.offset,
        limit: TIMELINE_PAGE.limit,
      }),
    enabled: baseEnabled,
  });

  const isLoading =
    eventsQ.isPending ||
    allocationsQ.isPending ||
    purchaseOrdersQ.isPending ||
    invoicesQ.isPending;

  const isError =
    eventsQ.isError ||
    allocationsQ.isError ||
    purchaseOrdersQ.isError ||
    invoicesQ.isError;

  const items = useMemo(() => {
    if (!baseEnabled) return [];

    const ev = eventsQ.data?.items ?? [];
    const al = allocationsQ.data?.items ?? [];
    const pos = purchaseOrdersQ.data?.items ?? [];
    const invs = invoicesQ.data?.items ?? [];

    const poIds = new Set(pos.map((p) => p.id));
    const invIds = new Set(invs.map((i) => i.id));

    const mapped = [
      ...ev.map(mapFinancialEventToTimelineEvent),
      ...al.map(mapAllocationToTimelineEvent),
      ...pos.map((p) => mapPurchaseOrderToTimelineEvent(p, lineCurrency)),
      ...invs.map((i) => mapInvoiceToTimelineEvent(i, lineCurrency)),
    ];

    const deduped = dedupeTimelineEvents(mapped, {
      purchaseOrderIds: poIds,
      invoiceIds: invIds,
    });
    const sorted = sortTimelineEventsDesc(deduped);
    return filterTimelineEvents(sorted, filters);
  }, [
    baseEnabled,
    eventsQ.data?.items,
    allocationsQ.data?.items,
    purchaseOrdersQ.data?.items,
    invoicesQ.data?.items,
    lineCurrency,
    filters,
  ]);

  const refetch = useCallback(async () => {
    if (!budgetLineId || !clientId) return;
    await queryClient.refetchQueries({
      queryKey: budgetQueryKeys.timeline(clientId, budgetLineId),
    });
  }, [queryClient, clientId, budgetLineId]);

  return {
    items,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
  };
}
