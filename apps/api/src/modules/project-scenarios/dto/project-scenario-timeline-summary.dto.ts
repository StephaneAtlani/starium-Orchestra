export type ProjectScenarioTimelineSummaryDto = {
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  criticalPathDuration: number | null;
  milestoneCount: number;
};
