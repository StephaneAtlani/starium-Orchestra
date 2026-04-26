export type GlobalSearchHit = {
  title: string;
  subtitle?: string;
  route: string;
  score: number;
  type: string;
};

export type GlobalSearchGroup = {
  moduleCode: string;
  moduleLabel: string;
  type: string;
  icon: string;
  total: number;
  results: GlobalSearchHit[];
};

export type GlobalSearchResponse = {
  groups: GlobalSearchGroup[];
  total: number;
};
