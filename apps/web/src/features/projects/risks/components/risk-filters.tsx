'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectListItem, RiskTaxonomyDomainApi } from '../../types/project.types';
import { PROJECT_RISK_CRITICALITY_LABEL, RISK_STATUS_LABEL } from '../../constants/project-enum-labels';

export type RisksRegistryFiltersState = {
  search: string;
  projectId: string | 'all';
  status: string | 'all';
  criticality: string | 'all';
  ownerUserId: string | 'all';
  domainId: string | 'all';
  riskTypeId: string | 'all';
};

const ALL = 'all';

const STATUS_KEYS = Object.keys(RISK_STATUS_LABEL) as (keyof typeof RISK_STATUS_LABEL)[];
const CRIT_KEYS = Object.keys(PROJECT_RISK_CRITICALITY_LABEL) as (keyof typeof PROJECT_RISK_CRITICALITY_LABEL)[];

type Props = {
  value: RisksRegistryFiltersState;
  onChange: (next: RisksRegistryFiltersState) => void;
  projectItems: ProjectListItem[];
  ownerOptions: { userId: string; label: string }[];
  taxonomyDomains: RiskTaxonomyDomainApi[];
  disabled?: boolean;
};

export function RiskFilters({
  value,
  onChange,
  projectItems,
  ownerOptions,
  taxonomyDomains,
  disabled,
}: Props) {
  const set = (patch: Partial<RisksRegistryFiltersState>) => onChange({ ...value, ...patch });

  const typesForSelectedDomain =
    value.domainId === ALL
      ? []
      : taxonomyDomains.find((d) => d.id === value.domainId)?.types ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
          <Label htmlFor="risks-registry-search">Recherche</Label>
          <Input
            id="risks-registry-search"
            placeholder="Titre ou code…"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Initiative</Label>
          <Select
            value={value.projectId}
            onValueChange={(v) => set({ projectId: v as RisksRegistryFiltersState['projectId'] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les initiatives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les initiatives</SelectItem>
              {projectItems.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select
            value={value.status}
            onValueChange={(v) => set({ status: v as RisksRegistryFiltersState['status'] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {STATUS_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {RISK_STATUS_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Criticité</Label>
          <Select
            value={value.criticality}
            onValueChange={(v) => set({ criticality: v as RisksRegistryFiltersState['criticality'] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {CRIT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {PROJECT_RISK_CRITICALITY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Propriétaire</Label>
          <Select
            value={value.ownerUserId}
            onValueChange={(v) => set({ ownerUserId: v as RisksRegistryFiltersState['ownerUserId'] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {ownerOptions.map((o) => (
                <SelectItem key={o.userId} value={o.userId}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Domaine</Label>
          <Select
            value={value.domainId}
            onValueChange={(v) =>
              set({
                domainId: v as RisksRegistryFiltersState['domainId'],
                riskTypeId: ALL,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {taxonomyDomains.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={value.riskTypeId}
            onValueChange={(v) => set({ riskTypeId: v as RisksRegistryFiltersState['riskTypeId'] })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous</SelectItem>
              {value.domainId === ALL
                ? taxonomyDomains.flatMap((d) =>
                    d.types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {d.name} — {t.name}
                      </SelectItem>
                    )),
                  )
                : typesForSelectedDomain.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export const defaultRisksRegistryFilters = (): RisksRegistryFiltersState => ({
  search: '',
  projectId: ALL,
  status: ALL,
  criticality: ALL,
  ownerUserId: ALL,
  domainId: ALL,
  riskTypeId: ALL,
});
