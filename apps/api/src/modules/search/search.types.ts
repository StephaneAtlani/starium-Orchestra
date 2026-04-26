export type GlobalSearchHitDto = {
  title: string;
  subtitle?: string;
  route: string;
  score: number;
  /** Type métier du hit (PROJECT, BUDGET, ARTICLE, FAQ, …) */
  type: string;
};

export type GlobalSearchGroupDto = {
  moduleCode: string;
  moduleLabel: string;
  type: string;
  icon: string;
  total: number;
  results: GlobalSearchHitDto[];
};

export type GlobalSearchResponseDto = {
  groups: GlobalSearchGroupDto[];
  total: number;
};

/** Hit interne avant groupement (inclut métadonnées de section). */
export type InternalSearchHit = {
  moduleCode: string;
  moduleLabel: string;
  groupType: string;
  groupIcon: string;
  title: string;
  subtitle?: string;
  route: string;
  hitType: string;
  score: number;
};
