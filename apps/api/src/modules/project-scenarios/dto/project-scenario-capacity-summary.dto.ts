export type ProjectScenarioCapacitySummaryDto = {
  overCapacityCount: number;
  underCapacityCount: number;
  peakLoadPct: string | null;
  averageLoadPct: string | null;
};
