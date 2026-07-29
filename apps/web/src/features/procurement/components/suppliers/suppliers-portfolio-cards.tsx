'use client';

import { Building2 } from 'lucide-react';
import {
  PortfolioEntityCard,
  TableToneBadge,
  type StatusTone,
} from '@/components/portfolio';
import { SupplierRating } from './supplier-rating';
import type { Supplier } from '../../types/supplier.types';

export function supplierStatusTone(status: string): StatusTone {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'ACTIF') return 'ok';
  if (normalized === 'INACTIVE' || normalized === 'INACTIF' || normalized === 'ARCHIVED') {
    return 'muted';
  }
  if (normalized === 'SUSPENDED' || normalized === 'BLOCKED') return 'danger';
  return 'info';
}

export function supplierStatusLabel(status: string): string {
  const normalized = status.toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: 'Actif',
    ACTIF: 'Actif',
    INACTIVE: 'Inactif',
    INACTIF: 'Inactif',
    ARCHIVED: 'Archivé',
    SUSPENDED: 'Suspendu',
    BLOCKED: 'Bloqué',
  };
  return labels[normalized] ?? status;
}

export function SuppliersPortfolioCards({
  items,
  onOpen,
}: {
  items: Supplier[];
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="suppliers-portfolio-cards"
    >
      {items.map((supplier) => {
        const tone = supplierStatusTone(supplier.status);
        return (
          <PortfolioEntityCard
            key={supplier.id}
            tone={tone}
            icon={<Building2 className="size-5" aria-hidden />}
            title={<span className="line-clamp-2">{supplier.name}</span>}
            badges={
              <>
                {supplier.supplierCategory?.name ? (
                  <TableToneBadge tone="brand">{supplier.supplierCategory.name}</TableToneBadge>
                ) : null}
                <TableToneBadge tone={tone}>{supplierStatusLabel(supplier.status)}</TableToneBadge>
              </>
            }
            subtitle={supplier.code ?? 'Sans code'}
            footer={
              <div className="flex items-center justify-between gap-2">
                <SupplierRating rating={supplier.performanceRating} />
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-semibold text-[color:var(--brand-gold-700)]"
                  onClick={() => onOpen(supplier.id)}
                >
                  Ouvrir
                </button>
              </div>
            }
            onClick={() => onOpen(supplier.id)}
            className="cursor-pointer"
          />
        );
      })}
    </div>
  );
}
