'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive,
  Building2,
  ClipboardList,
  Receipt,
  Settings2,
  UserCheck,
} from 'lucide-react';
import { useSuppliersDashboardQuery } from '@/features/procurement/hooks/use-suppliers-dashboard-query';
import type { SuppliersDashboardStats } from '@/features/procurement/types/supplier.types';
import { usePermissions } from '@/hooks/use-permissions';
import { Button, buttonVariants } from '@/components/ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { dashboardSupplierKpiHref } from '../lib/dashboard-card-links';
import { useDashboardWidgets } from '../hooks/use-dashboard-widgets';
import {
  DASHBOARD_SUPPLIER_KPI_OPTIONS,
  type DashboardSupplierKpiKey,
  type DashboardWidgetsConfig,
} from '../types/dashboard-widgets.types';

type ValueTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const valueToneClass: Record<ValueTone, string> = {
  default: 'text-foreground',
  info: 'text-[color:var(--brand-gold-700)]',
  success: 'text-[color:var(--state-success)]',
  warning: 'text-[color:var(--state-warning)]',
  danger: 'text-destructive',
};

const iconForKey: Record<
  DashboardSupplierKpiKey,
  React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
> = {
  suppliersListed: Building2,
  suppliersArchived: Archive,
  purchaseOrdersCount: ClipboardList,
  invoicesCount: Receipt,
  contactsActiveCount: UserCheck,
};

function toneForKey(key: DashboardSupplierKpiKey): ValueTone {
  switch (key) {
    case 'suppliersListed':
    case 'purchaseOrdersCount':
      return 'info';
    case 'contactsActiveCount':
      return 'success';
    case 'suppliersArchived':
      return 'warning';
    case 'invoicesCount':
      return 'default';
    default:
      return 'default';
  }
}

function SupplierKpiStat({
  label,
  valueStr,
  title,
  valueTone,
  Icon,
  href,
}: {
  label: string;
  valueStr: string;
  title?: string;
  valueTone: ValueTone;
  Icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    'aria-hidden'?: boolean;
  }>;
  href?: string;
}) {
  const shellClassName = cn(
    'starium-kpi-card',
    href && 'starium-kpi-card--interactive',
  );

  const content = (
    <div className="flex items-center gap-[18px]">
      <Icon className="starium-kpi-icon" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="starium-kpi-label">{label}</p>
        <p
          className={cn('starium-kpi-value', valueToneClass[valueTone])}
          title={title}
        >
          {valueStr}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(shellClassName, 'group block')}
        aria-label={`${label} — voir le détail`}
      >
        {content}
      </Link>
    );
  }

  return <div className={shellClassName}>{content}</div>;
}

function KpiSkeleton() {
  return (
    <div className="starium-kpi-card">
      <div className="flex items-center gap-[18px]">
        <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

function valueForKey(
  key: DashboardSupplierKpiKey,
  s: SuppliersDashboardStats | undefined,
  loading: boolean,
): string {
  if (loading) return '—';
  const n = s?.[key];
  return String(n ?? 0);
}

function SupplierKpiCards({
  stats,
  loading,
  keys,
}: {
  stats: SuppliersDashboardStats | undefined;
  loading: boolean;
  keys: DashboardSupplierKpiKey[];
}) {
  const metaById = React.useMemo(
    () => new Map(DASHBOARD_SUPPLIER_KPI_OPTIONS.map((o) => [o.id, o])),
    [],
  );

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      data-testid="dashboard-supplier-kpis"
    >
      {keys.map((k) => {
        const meta = metaById.get(k);
        const Icon = iconForKey[k];
        return (
          <SupplierKpiStat
            key={k}
            label={meta?.label ?? k}
            title={meta?.label}
            valueStr={valueForKey(k, stats, loading)}
            valueTone={toneForKey(k)}
            Icon={Icon}
            href={dashboardSupplierKpiHref(k)}
          />
        );
      })}
    </div>
  );
}

function SupplierWidgetSettingsDialog({
  open,
  onOpenChange,
  config,
  setSupplierKpisVisible,
  toggleSupplierKpi,
  resetSupplierKpisDefaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: DashboardWidgetsConfig;
  setSupplierKpisVisible: (visible: boolean) => void;
  toggleSupplierKpi: (key: DashboardSupplierKpiKey, checked: boolean) => void;
  resetSupplierKpisDefaults: () => void;
}) {
  const selected = new Set(config.supplierKpis.kpis);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Widget Fournisseurs</DialogTitle>
          <DialogDescription>
            Indicateurs achats / fournisseurs (client actif) — enregistrés pour ce
            client et votre compte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={config.supplierKpis.visible}
              onChange={(e) => setSupplierKpisVisible(e.target.checked)}
            />
            <span className="text-sm font-medium">Afficher le widget sur le dashboard</span>
          </label>

          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Indicateurs affichés (au moins un)
            </Label>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {DASHBOARD_SUPPLIER_KPI_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={selected.has(opt.id)}
                      disabled={
                        selected.has(opt.id) && config.supplierKpis.kpis.length <= 1
                      }
                      onChange={(e) => toggleSupplierKpi(opt.id, e.target.checked)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 border-t-0 sm:flex-row sm:flex-wrap sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetSupplierKpisDefaults()}
          >
            Réinitialiser les KPI
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Widget synthèse fournisseurs / achats configurable (localStorage par utilisateur + client).
 */
export function DashboardSuppliersKpiWidget() {
  const { has } = usePermissions();
  const canReadProcurement = has('procurement.read');

  const {
    config,
    hydrated,
    setSupplierKpisVisible,
    toggleSupplierKpi,
    resetSupplierKpisDefaults,
  } = useDashboardWidgets();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const query = useSuppliersDashboardQuery({ enabled: canReadProcurement });
  const { data, isLoading, error } = query;
  const err = error instanceof Error ? error.message : null;

  if (!canReadProcurement) {
    return null;
  }

  if (!hydrated) {
    return (
      <section className="space-y-4" aria-hidden>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      </section>
    );
  }

  if (!config.supplierKpis.visible) {
    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Le widget <span className="font-medium text-foreground">Fournisseurs</span> est
            masqué.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSupplierKpisVisible(true)}
            >
              Afficher le widget
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="mr-1 size-4" />
              Personnaliser
            </Button>
          </div>
        </div>
        <SupplierWidgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          setSupplierKpisVisible={setSupplierKpisVisible}
          toggleSupplierKpi={toggleSupplierKpi}
          resetSupplierKpisDefaults={resetSupplierKpisDefaults}
        />
      </section>
    );
  }

  return (
    <section className="starium-module space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="starium-section-title">
            Fournisseurs
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              Synthèse achats pour{' '}
              <span className="font-medium text-foreground">ce client</span>
              {data ? (
                <>
                  {' '}
                  ·{' '}
                  <RegistryBadge className="bg-secondary text-secondary-foreground">
                    {data.suppliersListed} au catalogue
                  </RegistryBadge>
                </>
              ) : null}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setSettingsOpen(true)}
            aria-label="Personnaliser le widget fournisseurs"
          >
            <Settings2 className="size-4" />
            Personnaliser
          </Button>
          <Link
            href="/suppliers/dashboard"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'whitespace-nowrap',
            )}
          >
            Dashboard fournisseurs
          </Link>
        </div>
      </div>

      <SupplierWidgetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        setSupplierKpisVisible={setSupplierKpisVisible}
        toggleSupplierKpi={toggleSupplierKpi}
        resetSupplierKpisDefaults={resetSupplierKpisDefaults}
      />

      {isLoading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: Math.max(1, config.supplierKpis.kpis.length) }).map(
            (_, i) => (
              <KpiSkeleton key={i} />
            ),
          )}
        </div>
      ) : err ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{err}</p>
          <p className="mt-1">Impossible de charger la synthèse fournisseurs.</p>
          <Link
            href="/suppliers/dashboard"
            className={cn(buttonVariants({ variant: 'link' }), 'mt-2 h-auto p-0')}
          >
            Ouvrir le dashboard fournisseurs
          </Link>
        </div>
      ) : (
        <SupplierKpiCards
          stats={data}
          loading={isLoading}
          keys={config.supplierKpis.kpis}
        />
      )}
    </section>
  );
}
