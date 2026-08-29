export type LandingForecastStatus =
  | 'NONE'
  | 'BASELINE_FROZEN'
  | 'SCENARIO_FROZEN'
  | 'VALIDATED'
  | 'APPLIED';

export type LandingForecastSnapshotRef = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
};

export type LandingForecastPendingLine = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

export type LandingForecastState = {
  enabled: boolean;
  status: LandingForecastStatus;
  staleSession: boolean;
  baseline: LandingForecastSnapshotRef | null;
  arbitrated: LandingForecastSnapshotRef | null;
  pendingStructuralLines: LandingForecastPendingLine[];
};
