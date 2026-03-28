/** État des filtres du registre risques (recherche + colonnes du tableau). */
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

export const defaultRisksRegistryFilters = (): RisksRegistryFiltersState => ({
  search: '',
  projectId: ALL,
  status: ALL,
  criticality: ALL,
  ownerUserId: ALL,
  domainId: ALL,
  riskTypeId: ALL,
});
