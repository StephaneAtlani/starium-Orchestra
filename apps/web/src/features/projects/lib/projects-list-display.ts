import {
  Activity,
  FolderKanban,
  Layers,
  Monitor,
  type LucideIcon,
} from 'lucide-react';
import type { ProjectListItem } from '../types/project.types';

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
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function projectListProgressPercent(project: ProjectListItem) {
  return project.progressPercent ?? project.derivedProgressPercent ?? 0;
}

function kindIcon(kind: string): LucideIcon {
  if (kind === 'ACTIVITY') return Activity;
  return FolderKanban;
}

export function projectPortfolioCategoryIcon(project: ProjectListItem): LucideIcon {
  const categoryName =
    project.portfolioCategory?.name ?? project.portfolioCategory?.parentName;
  const value = (categoryName ?? '').toLowerCase();

  if (value.includes('infra') || value.includes('cloud')) return Layers;
  if (value.includes('web') || value.includes('portail') || value.includes('appli')) {
    return Monitor;
  }
  return kindIcon(project.kind);
}

export function projectPortfolioCategoryLabel(project: ProjectListItem) {
  if (!project.portfolioCategory) return null;
  if (project.portfolioCategory.parentName) {
    return `${project.portfolioCategory.parentName} / ${project.portfolioCategory.name}`;
  }
  return project.portfolioCategory.name;
}
