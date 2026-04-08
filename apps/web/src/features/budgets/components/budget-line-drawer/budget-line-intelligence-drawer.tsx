'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BudgetLineDrawerHeader } from './budget-line-drawer-header';
import { BudgetLineKpiStrip } from './budget-line-kpi-strip';
import { BudgetLineOverviewTab } from './budget-line-overview-tab';
import { BudgetLineCommitmentsTab } from './budget-line-commitments-tab';
import { BudgetLineInvoicesTab } from './budget-line-invoices-tab';
import { BudgetLineAllocationsTab } from './budget-line-allocations-tab';
import { BudgetLineDsiInfoTab } from './budget-line-dsi-info-tab';
import { BudgetLineTimelineTab } from './budget-line-timeline-tab';
import { BudgetLinePlanningTab } from './budget-line-planning-tab';
import { CreateOrderDialog } from './create-order-dialog';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { CreateFinancialEventDialog } from './create-financial-event-dialog';
import { useBudgetLineDetail } from '../../hooks/use-budget-line-detail';
import { useBudgetLineEvents } from '../../hooks/use-budget-line-events';
import { useBudgetDetail } from '../../hooks/use-budgets';
import type { BudgetLineDrilldownNavigation } from '../../lib/budget-envelope-navigation';

export type BudgetLineDrawerTab =
  | 'overview'
  | 'previsionnel'
  | 'commitments'
  | 'invoices'
  | 'allocations'
  | 'timeline'
  | 'dsi-info';

const LAST_EVENT_LIMIT = 1;
const RECENT_INVOICE_DAYS = 30;
// Limite “première page raisonnable” (heuristique technique, pas une règle produit).
const RECENT_INVOICE_PAGE_LIMIT = 20;
const EVENT_TYPE_CONSUMPTION = 'CONSUMPTION_REGISTERED';

export function BudgetLineIntelligenceDrawer({
  open,
  onOpenChange,
  budgetId,
  budgetName,
  envelopeName,
  envelopeCode,
  envelopeType,
  budgetLineId,
  activeTab,
  onActiveTabChange,
  lineDrilldownNavigation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  budgetName?: string | null;
  envelopeName?: string | null;
  envelopeCode?: string | null;
  envelopeType?: string | null;
  budgetLineId: string | null;
  activeTab: BudgetLineDrawerTab;
  onActiveTabChange: (tab: BudgetLineDrawerTab) => void;
  lineDrilldownNavigation?: BudgetLineDrilldownNavigation | null;
}) {
  const detail = useBudgetLineDetail(open ? budgetLineId : null);
  const { data: budget } = useBudgetDetail(open && budgetId ? budgetId : null);

  // Dernier event (pour l’onglet overview) — on ne force pas le chargement si drawer fermé.
  const lastEventQuery = useBudgetLineEvents({
    budgetLineId: open ? budgetLineId : null,
    offset: 0,
    limit: LAST_EVENT_LIMIT,
    enabled: open && activeTab === 'overview',
  });

  const line = detail.data ?? null;
  const lastEvent = useMemo(() => {
    const items = lastEventQuery.data?.items ?? [];
    return items.length > 0 ? items[0] : null;
  }, [lastEventQuery.data?.items]);

  const [orderOpen, setOrderOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  /** Panneau agrandi vers le haut (sm+) — mobile déjà plein écran */
  const [panelExpanded, setPanelExpanded] = useState(false);

  useEffect(() => {
    if (!open) setPanelExpanded(false);
  }, [open]);

  const invoiceRecentQuery = useBudgetLineEvents({
    budgetLineId: open ? budgetLineId : null,
    offset: 0,
    limit: RECENT_INVOICE_PAGE_LIMIT,
    eventType: EVENT_TYPE_CONSUMPTION,
    enabled: open,
  });

  const hasRecentInvoice30d = useMemo(() => {
    const items = invoiceRecentQuery.data?.items ?? [];
    if (items.length === 0) return false;
    const threshold = Date.now() - RECENT_INVOICE_DAYS * 24 * 60 * 60 * 1000;
    // fallback si l’API ignore eventType
    return items.some((e) => {
      if (e.eventType !== EVENT_TYPE_CONSUMPTION) return false;
      const t = Date.parse(e.eventDate);
      return Number.isFinite(t) && t >= threshold;
    });
  }, [invoiceRecentQuery.data?.items]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-[60] bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-none',
            'border border-border/60 bg-background shadow-lg outline-none',
            // Mobile: plein écran. Desktop: hauteur de base ou agrandie (poignée).
            'h-[100dvh] sm:h-[70vh] md:h-[65vh]',
            panelExpanded && 'sm:h-[100dvh] md:h-[100dvh]',
            'rounded-none sm:rounded-t-2xl',
            'transition-[height] duration-300 ease-out motion-reduce:transition-none',
            // Anti double-scroll: seul le contenu d’onglet scrolle.
            'overflow-hidden',
            'data-open:animate-in data-open:slide-in-from-bottom-2 data-open:fade-in-0',
            'data-closed:animate-out data-closed:slide-out-to-bottom-2 data-closed:fade-out-0',
          )}
        >
          {!line && detail.isLoading && (
            <div className="flex h-full flex-col">
              <div className="border-b border-border/60 px-4 py-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-4 w-1/4" />
              </div>
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          )}

          {detail.isError && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Impossible de charger la ligne budgétaire.
                </AlertDescription>
              </Alert>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => detail.refetch()}>
                  Réessayer
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {line && (
            <div className="flex h-full min-h-0 flex-col">
              <button
                type="button"
                className={cn(
                  'group flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5',
                  'touch-manipulation select-none rounded-t-2xl outline-none',
                  'hover:bg-muted/40 active:bg-muted/60',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
                aria-expanded={panelExpanded}
                aria-label={
                  panelExpanded
                    ? 'Réduire le panneau'
                    : 'Agrandir le panneau vers le haut'
                }
                onClick={() => setPanelExpanded((v) => !v)}
              >
                <span className="h-1 w-12 rounded-full bg-muted-foreground/35 transition-colors group-hover:bg-muted-foreground/50" />
                <ChevronUp
                  className={cn(
                    'size-4 text-muted-foreground transition-transform duration-300 ease-out',
                    panelExpanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              <BudgetLineDrawerHeader
                line={line}
                budgetName={budgetName}
                envelopeName={envelopeName}
                envelopeCode={envelopeCode}
                envelopeType={envelopeType}
                hasRecentInvoice30d={hasRecentInvoice30d}
                onClose={() => onOpenChange(false)}
                onCreateOrder={() => setOrderOpen(true)}
                onCreateInvoice={() => setInvoiceOpen(true)}
                onCreateEngagement={() => setEngagementOpen(true)}
                onCreateConsumption={() => setConsumptionOpen(true)}
                lineDrilldownNavigation={lineDrilldownNavigation ?? null}
              />

              <div className="px-2 pt-3 sm:px-4">
                <BudgetLineKpiStrip line={line} className="mb-1" />
              </div>

              <div className="flex-1 overflow-hidden px-4 pb-4 pt-3">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => onActiveTabChange(v as BudgetLineDrawerTab)}
                  className="flex h-full flex-col"
                >
                  <div className="sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80 shadow-sm">
                    <TabsList variant="line" className="w-full justify-start gap-1">
                      <TabsTrigger value="overview">Vue d’ensemble</TabsTrigger>
                      <TabsTrigger value="previsionnel">Prévisionnel</TabsTrigger>
                      <TabsTrigger value="commitments">Commandes</TabsTrigger>
                      <TabsTrigger value="invoices">Factures</TabsTrigger>
                      <TabsTrigger value="allocations">Allocations</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                      <TabsTrigger value="dsi-info">Infos DSI</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 pt-3">
                    <TabsContent value="overview">
                      <BudgetLineOverviewTab
                        line={line}
                        budgetName={budgetName}
                        budgetOwnerName={budget?.ownerUserName ?? null}
                        budgetOwnerUserId={budget?.ownerUserId ?? null}
                        envelopeName={envelopeName}
                        envelopeCode={envelopeCode}
                        envelopeType={envelopeType}
                        lastEvent={lastEvent}
                      />
                    </TabsContent>
                    <TabsContent value="previsionnel">
                      <BudgetLinePlanningTab
                        budgetLineId={line.id}
                        currency={line.currency}
                        enabled={activeTab === 'previsionnel'}
                      />
                    </TabsContent>
                    <TabsContent value="commitments">
                      <BudgetLineCommitmentsTab
                        budgetLineId={line.id}
                        enabled={activeTab === 'commitments'}
                      />
                    </TabsContent>
                    <TabsContent value="invoices">
                      <BudgetLineInvoicesTab
                        budgetLineId={line.id}
                        enabled={activeTab === 'invoices'}
                      />
                    </TabsContent>
                    <TabsContent value="allocations">
                      <BudgetLineAllocationsTab
                        budgetLineId={line.id}
                        enabled={activeTab === 'allocations'}
                      />
                    </TabsContent>
                    <TabsContent value="timeline">
                      <BudgetLineTimelineTab
                        budgetLineId={line.id}
                        lineCurrency={line.currency}
                        enabled={activeTab === 'timeline'}
                      />
                    </TabsContent>
                    <TabsContent value="dsi-info">
                      <BudgetLineDsiInfoTab line={line} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <CreateOrderDialog
                open={orderOpen}
                onOpenChange={setOrderOpen}
                budgetId={budgetId}
                line={line}
              />
              <CreateInvoiceDialog
                open={invoiceOpen}
                onOpenChange={setInvoiceOpen}
                budgetId={budgetId}
                line={line}
              />
              <CreateFinancialEventDialog
                open={engagementOpen}
                onOpenChange={setEngagementOpen}
                budgetId={budgetId}
                line={line}
                initialEventType="COMMITMENT_REGISTERED"
              />
              <CreateFinancialEventDialog
                open={consumptionOpen}
                onOpenChange={setConsumptionOpen}
                budgetId={budgetId}
                line={line}
                initialEventType="CONSUMPTION_REGISTERED"
              />
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

