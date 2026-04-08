/** Navigation précédent / suivant entre lignes dans le drilldown (ordre explorateur, DFS). */
export type BudgetLineDrilldownNavigation = {
  hasPrev: boolean;
  hasNext: boolean;
  onPrevLine: () => void;
  onNextLine: () => void;
};
