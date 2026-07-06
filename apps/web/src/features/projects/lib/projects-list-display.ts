import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ProjectListItem } from '../types/project.types';
import { cn } from '@/lib/utils';
import { resolvePortfolioCategoryColor, resolvePortfolioCategoryLucideIcon } from './project-portfolio-category-icons';

export function formatProjectBudget(amount: string | null | undefined) {
  if (amount == null || amount === '') return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return null;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseProjectBudgetAmount(amount: string | null | undefined): number | null {
  if (amount == null || amount === '') return null;
  const value = Number(amount);
  return Number.isNaN(value) ? null : value;
}

/** Part consommée du budget cible (peut dépasser 100 %). */
export function projectBudgetConsumptionPercent(
  targetAmount: string | null | undefined,
  consumedAmount: string | null | undefined,
): number | null {
  const target = parseProjectBudgetAmount(targetAmount);
  const consumed = parseProjectBudgetAmount(consumedAmount);
  if (target == null || target <= 0 || consumed == null) return null;
  return (consumed / target) * 100;
}

/** Montant portefeuille compact (ex. 405 k€). */
export function formatPortfolioBudgetCompact(amount: string | null | undefined): string {
  if (amount == null || amount === '') return '—';
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M€`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value / 1_000)} k€`;
  }
  return formatProjectBudget(amount) ?? '—';
}

export function portfolioPercentOfTotal(part: number, total: number): string | null {
  if (total <= 0) return null;
  return `${Math.round((part / total) * 100)} % du portefeuille`;
}

export function portfolioMonthCreationDeltaLabel(
  createdThisMonth: number,
  createdPreviousMonth: number,
): string | null {
  const delta = createdThisMonth - createdPreviousMonth;
  if (delta === 0) return 'Stable vs mois dernier';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} vs mois dernier`;
}

export function portfolioQuarterCompletionDeltaLabel(
  completedThisQuarter: number,
  completedPreviousQuarter: number,
): string | null {
  const delta = completedThisQuarter - completedPreviousQuarter;
  if (delta === 0) return 'Stable vs trimestre dernier';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} vs trimestre dernier`;
}

export function formatProjectDateLong(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/** Date + heure locale (fiche / synthèse — pas de « Aujourd'hui » relatif). */
export function formatProjectDateTimeFr(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function projectOwnerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function projectOwnerShortLabel(name: string) {
  const trimmed = name.trim();
  return trimmed || name;
}

export function projectListProgressPercent(project: ProjectListItem) {
  return project.progressPercent ?? project.derivedProgressPercent ?? 0;
}

export function projectPortfolioCategoryIcon(project: ProjectListItem): LucideIcon {
  return resolvePortfolioCategoryLucideIcon({
    icon: project.portfolioCategory?.icon ?? null,
    categoryName: project.portfolioCategory?.name ?? null,
    parentName: project.portfolioCategory?.parentName ?? null,
    projectKind: project.kind,
  });
}

export function projectPortfolioCategoryLabel(project: ProjectListItem) {
  if (!project.portfolioCategory) return null;
  if (project.portfolioCategory.parentName) {
    return `${project.portfolioCategory.parentName} / ${project.portfolioCategory.name}`;
  }
  return project.portfolioCategory.name;
}

/** Pastille icône — fond et teinte via color-mix sur la couleur résolue. */
export function projectPortfolioCategoryIconStyle(
  color: string | null | undefined,
): CSSProperties | undefined {
  const c = (color ?? '').trim();
  if (!c) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
    color: c,
  };
}

export function projectPortfolioCategoryIconPresentation(
  project: ProjectListItem,
): { className: string; style?: CSSProperties } {
  const category = project.portfolioCategory;
  const color = resolvePortfolioCategoryColor({
    color: category?.color ?? null,
    icon: category?.icon ?? null,
    categoryName: category?.name ?? null,
    parentName: category?.parentName ?? null,
    projectKind: project.kind,
  });
  return {
    className: 'flex size-9 shrink-0 items-center justify-center rounded-lg',
    style: projectPortfolioCategoryIconStyle(color),
  };
}
