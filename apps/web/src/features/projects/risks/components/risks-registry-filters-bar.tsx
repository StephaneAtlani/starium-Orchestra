'use client';

import type { ReactNode } from 'react';
import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROJECT_RISK_CRITICALITY_LABEL } from '../../constants/project-enum-labels';
import type { ProjectListItem, RiskTaxonomyDomainApi } from '../../types/project.types';
import { RISKS_REGISTRY_HORS_PROJET, type RisksRegistryFiltersState } from './risk-filters';
import { cn } from '@/lib/utils';

const ALL = 'all';
const CRIT_KEYS = Object.keys(PROJECT_RISK_CRITICALITY_LABEL) as (keyof typeof PROJECT_RISK_CRITICALITY_LABEL)[];

function FilterSelectChip({
  value,
  onValueChange,
  label,
  active,
  children,
  'aria-label': ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  active?: boolean;
  children: ReactNode;
  'aria-label'?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? ALL)}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel ?? label}
        className={cn(
          'starium-filter-chip h-auto min-h-[44px] w-full shadow-none focus-visible:ring-0 data-[size=sm]:h-auto md:min-h-0 md:w-auto',
          active && 'starium-filter-chip--active',
        )}
      >
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function domainFilterLabel(
  domainId: RisksRegistryFiltersState['domainId'],
  domains: RiskTaxonomyDomainApi[],
): string {
  if (domainId === ALL) return 'Tous les domaines';
  const d = domains.find((x) => x.id === domainId);
  if (!d) return 'Domaine (obsolète)';
  return d.familyLabel ? `${d.familyLabel} — ${d.name}` : d.name;
}

function projectFilterLabel(
  projectId: RisksRegistryFiltersState['projectId'],
  projects: ProjectListItem[],
): string {
  if (projectId === ALL) return 'Tous les projets';
  if (projectId === RISKS_REGISTRY_HORS_PROJET) return 'Hors projet';
  return projects.find((p) => p.id === projectId)?.name ?? 'Projet (obsolète)';
}

function criticalityFilterLabel(criticality: RisksRegistryFiltersState['criticality']): string {
  if (criticality === ALL) return 'Tous niveaux';
  return PROJECT_RISK_CRITICALITY_LABEL[criticality as keyof typeof PROJECT_RISK_CRITICALITY_LABEL] ?? criticality;
}

type Props = {
  filters: RisksRegistryFiltersState;
  onFiltersChange: (patch: Partial<RisksRegistryFiltersState>) => void;
  onReset: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  hasActiveFilters: boolean;
  filtersDisabled?: boolean;
  projectItems: ProjectListItem[];
  taxonomyDomains: RiskTaxonomyDomainApi[];
};

export function RisksRegistryFiltersBar({
  filters,
  onFiltersChange,
  onReset,
  onRefresh,
  isRefreshing = false,
  hasActiveFilters,
  filtersDisabled = false,
  projectItems,
  taxonomyDomains,
}: Props) {
  const canReset = hasActiveFilters || filters.search.trim().length > 0;

  return (
    <div
      className="starium-panel overflow-hidden rounded-[var(--ds-card-radius)] border border-border bg-card"
      role="search"
      aria-label="Filtrer le registre des risques"
      data-testid="risks-registry-filters-bar"
    >
      <div className="starium-filter-bar">
        <div className="starium-filter-bar-left">
          <div className="starium-filter-bar-chips">
            <FilterSelectChip
              value={filters.domainId}
              onValueChange={(v) =>
                onFiltersChange({
                  domainId: v as RisksRegistryFiltersState['domainId'],
                  riskTypeId: ALL,
                })
              }
              label={domainFilterLabel(filters.domainId, taxonomyDomains)}
              active={filters.domainId !== ALL}
              aria-label="Filtrer par domaine"
            >
              <SelectItem value={ALL}>Tous les domaines</SelectItem>
              {taxonomyDomains.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.familyLabel ? `${d.familyLabel} — ${d.name}` : d.name}
                </SelectItem>
              ))}
            </FilterSelectChip>

            <FilterSelectChip
              value={filters.criticality}
              onValueChange={(v) =>
                onFiltersChange({ criticality: v as RisksRegistryFiltersState['criticality'] })
              }
              label={criticalityFilterLabel(filters.criticality)}
              active={filters.criticality !== ALL}
              aria-label="Filtrer par risque initial"
            >
              <SelectItem value={ALL}>Tous niveaux</SelectItem>
              {CRIT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {PROJECT_RISK_CRITICALITY_LABEL[k]}
                </SelectItem>
              ))}
            </FilterSelectChip>

            <FilterSelectChip
              value={filters.projectId}
              onValueChange={(v) =>
                onFiltersChange({ projectId: v as RisksRegistryFiltersState['projectId'] })
              }
              label={projectFilterLabel(filters.projectId, projectItems)}
              active={filters.projectId !== ALL}
              aria-label="Filtrer par projet"
            >
              <SelectItem value={ALL}>Tous les projets</SelectItem>
              <SelectItem value={RISKS_REGISTRY_HORS_PROJET}>Hors projet</SelectItem>
              {projectItems.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </FilterSelectChip>

            <button
              type="button"
              className="starium-filter-chip starium-filter-chip--reset starium-filter-chip--wide"
              disabled={!canReset || filtersDisabled}
              onClick={onReset}
              aria-label="Réinitialiser les filtres"
              data-testid="risks-filters-reset"
            >
              <RotateCcw aria-hidden />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        <div className="starium-filter-bar-right">
          <div className="starium-filter-bar-search">
            <Search className="starium-filter-bar-search-icon" aria-hidden />
            <Input
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Événement, source, scénario, titre ou code…"
              aria-label="Filtrer le registre EBIOS"
              disabled={filtersDisabled}
              autoComplete="off"
              className="starium-filter-bar-search-input !pl-9 !pr-2.5"
            />
          </div>
          <button
            type="button"
            className="starium-filter-chip min-h-[44px] md:min-h-0"
            disabled={isRefreshing || filtersDisabled}
            onClick={onRefresh}
            aria-label="Actualiser le registre"
          >
            <RefreshCw className={cn(isRefreshing && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>
    </div>
  );
}
